package services

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/database"
	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Reglas que se rechazan antes de tocar la base de datos.

func TestCreatePostRejectsInvalidContent(t *testing.T) {
	service := NewPostService(nil)

	tests := []struct {
		name     string
		content  string
		postType models.PostType
	}{
		{"lenguaje inapropiado", "eres un idiota", models.PostQuestion},
		{"general demasiado larga", strings.Repeat("a", 151), models.PostGeneral},
		{"entrenamiento demasiado largo", strings.Repeat("a", 281), models.PostTraining},
		{"pregunta demasiado larga", strings.Repeat("a", 501), models.PostQuestion},
		{"logro creado a mano", "Desbloqueé un logro falso", models.PostAchievement},
		{"tipo inexistente", "hola", models.PostType("otro")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := service.CreatePost("user", tt.content, tt.postType); err == nil {
				t.Fatal("se esperaba un error")
			}
		})
	}
}

func TestCreateCommentRejectsInappropriateContent(t *testing.T) {
	service := NewCommentService(nil, nil, nil)

	if _, err := service.CreateComment("post", "user", "qué mierda de rutina"); err == nil {
		t.Fatal("se esperaba un error")
	}
}

// Reglas de moderación contra PostgreSQL. Necesitan una base con las
// migraciones aplicadas; los datos creados se borran al terminar.
//
//	TEST_DATABASE_URL=postgres://... go test ./internal/services/

type moderationFixture struct {
	db       *pgxpool.Pool
	posts    *PostService
	comments *CommentService
	likes    *LikeService
	reports  *ReportService
	userIDs  []string
}

func newModerationFixture(t *testing.T, users int) *moderationFixture {
	t.Helper()

	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL no definida")
	}

	db, err := database.Connect(url, "UTC")
	if err != nil {
		t.Fatal(err)
	}

	postRepository := repository.NewPostRepository(db)
	reportRepository := repository.NewReportRepository(db)
	notificationService := NewNotificationService(repository.NewNotificationRepository(db))

	f := &moderationFixture{
		db:    db,
		posts: NewPostService(postRepository),
		comments: NewCommentService(
			repository.NewCommentRepository(db),
			postRepository,
			notificationService,
		),
		likes: NewLikeService(
			repository.NewLikeRepository(db),
			postRepository,
			notificationService,
		),
		reports: NewReportService(
			reportRepository,
			postRepository,
			repository.NewUserRepository(db),
		),
	}

	prefix := fmt.Sprintf("modtest%d", time.Now().UnixNano())
	for i := 0; i < users; i++ {
		var id string
		err := db.QueryRow(
			context.Background(),
			`
			INSERT INTO users (username, full_name, email, password_hash)
			VALUES ($1::text, 'Test', $1::text || '@example.com', 'x')
			RETURNING id
			`,
			fmt.Sprintf("%s_%d", prefix, i),
		).Scan(&id)
		if err != nil {
			t.Fatal(err)
		}
		f.userIDs = append(f.userIDs, id)
	}

	// Borrar los usuarios elimina en cascada sus publicaciones, reportes,
	// comentarios, likes y notificaciones.
	t.Cleanup(func() {
		db.Exec(context.Background(), `DELETE FROM users WHERE id = ANY($1)`, f.userIDs)
		db.Close()
	})

	return f
}

func (f *moderationFixture) createPost(t *testing.T, authorID string) string {
	t.Helper()

	post, err := f.posts.CreatePost(authorID, "mi rutina de hoy", models.PostTraining)
	if err != nil {
		t.Fatal(err)
	}
	return post.ID
}

// report hace que cada usuario reporte la publicación y devuelve el id
// del último reporte.
func (f *moderationFixture) report(t *testing.T, postID string, reporterIDs ...string) string {
	t.Helper()

	var reportID string
	for _, reporterID := range reporterIDs {
		report, err := f.reports.CreateReport(postID, reporterID, models.ReportSpam, "es spam")
		if err != nil {
			t.Fatal(err)
		}
		reportID = report.ID
	}
	return reportID
}

// feedStatus devuelve el estado de la publicación en el feed de userID, o
// "" si no aparece.
func (f *moderationFixture) feedStatus(t *testing.T, userID, postID string) models.ModerationStatus {
	t.Helper()

	feed, err := f.posts.GetFeed(context.Background(), userID)
	if err != nil {
		t.Fatal(err)
	}
	for _, post := range feed {
		if post.ID == postID {
			return post.ModerationStatus
		}
	}
	return ""
}

func TestReportingTwiceIsRejected(t *testing.T) {
	f := newModerationFixture(t, 2)
	author, reporter := f.userIDs[0], f.userIDs[1]
	postID := f.createPost(t, author)

	f.report(t, postID, reporter)

	if _, err := f.reports.CreateReport(postID, reporter, models.ReportSpam, "otra vez"); err != ErrAlreadyReported {
		t.Fatalf("al reportar dos veces: error %v, se esperaba ErrAlreadyReported", err)
	}
}

func TestSimultaneousDuplicateReportsAreRejected(t *testing.T) {
	f := newModerationFixture(t, 2)

	var hasIndex bool
	err := f.db.QueryRow(
		context.Background(),
		`SELECT to_regclass('idx_reports_unique_reporter_post') IS NOT NULL`,
	).Scan(&hasIndex)
	if err != nil {
		t.Fatal(err)
	}
	if !hasIndex {
		t.Skip("falta la migración 015 (idx_reports_unique_reporter_post)")
	}

	author, reporter := f.userIDs[0], f.userIDs[1]
	postID := f.createPost(t, author)

	const attempts = 10
	errs := make([]error, attempts)

	var start, done sync.WaitGroup
	start.Add(1)
	for i := 0; i < attempts; i++ {
		done.Add(1)
		go func(i int) {
			defer done.Done()
			start.Wait()
			_, errs[i] = f.reports.CreateReport(postID, reporter, models.ReportSpam, "spam")
		}(i)
	}
	start.Done()
	done.Wait()

	created := 0
	for _, err := range errs {
		switch err {
		case nil:
			created++
		case ErrAlreadyReported:
		default:
			t.Fatalf("error inesperado: %v", err)
		}
	}

	if created != 1 {
		t.Fatalf("se guardaron %d reportes del mismo usuario, se esperaba 1", created)
	}
}

func TestThresholdHidesPostFromOthersOnly(t *testing.T) {
	f := newModerationFixture(t, 5)
	author, viewer := f.userIDs[0], f.userIDs[4]
	postID := f.createPost(t, author)

	f.report(t, postID, f.userIDs[1], f.userIDs[2])
	if got := f.feedStatus(t, viewer, postID); got != models.ModerationVisible {
		t.Fatalf("con 2 reportes: estado %q, se esperaba visible", got)
	}

	f.report(t, postID, f.userIDs[3])

	if got := f.feedStatus(t, viewer, postID); got != "" {
		t.Fatalf("otro usuario ve la publicación oculta (estado %q)", got)
	}
	if got := f.feedStatus(t, author, postID); got != models.ModerationUnderReview {
		t.Fatalf("el autor ve estado %q, se esperaba under_review", got)
	}

	if _, err := f.comments.CreateComment(postID, viewer, "buen trabajo"); err != ErrPostNotFound {
		t.Fatalf("comentar oculta: error %v, se esperaba ErrPostNotFound", err)
	}
	if _, err := f.comments.GetComments(postID, viewer); err != ErrPostNotFound {
		t.Fatalf("leer comentarios de oculta: error %v", err)
	}
	if err := f.likes.LikePost(postID, viewer); err != ErrPostNotFound {
		t.Fatalf("like a oculta: error %v", err)
	}
	if _, err := f.reports.CreateReport(postID, viewer, models.ReportSpam, "spam"); err != ErrPostNotFound {
		t.Fatalf("reportar oculta: error %v", err)
	}

	if _, err := f.comments.CreateComment(postID, author, "aclaro mi post"); err != nil {
		t.Fatalf("el autor no puede comentar su publicación: %v", err)
	}
}

// pendingReports cuenta los reportes pendientes de la publicación en la
// cola de moderación.
func (f *moderationFixture) pendingReports(t *testing.T, postID string) int {
	t.Helper()

	pending, err := f.reports.GetPendingReports()
	if err != nil {
		t.Fatal(err)
	}

	count := 0
	for _, report := range pending {
		if report.PostID == postID {
			count++
		}
	}
	return count
}

func TestApprovingPostMakesItVisibleAgain(t *testing.T) {
	f := newModerationFixture(t, 6)
	author, moderator, viewer := f.userIDs[0], f.userIDs[4], f.userIDs[4]
	postID := f.createPost(t, author)

	reportID := f.report(t, postID, f.userIDs[1], f.userIDs[2], f.userIDs[3])

	if err := f.reports.ReviewReport(reportID, moderator, models.ReportDismissed, ""); err != nil {
		t.Fatal(err)
	}

	// La decisión es sobre la publicación: cierra todos sus reportes.
	if n := f.pendingReports(t, postID); n != 0 {
		t.Fatalf("quedaron %d reportes pendientes tras aprobar", n)
	}
	if got := f.feedStatus(t, viewer, postID); got != models.ModerationVisible {
		t.Fatalf("tras aprobar: estado %q, se esperaba visible", got)
	}

	// Un reporte nuevo no la oculta hasta volver a alcanzar el umbral.
	f.report(t, postID, f.userIDs[5])
	if got := f.feedStatus(t, viewer, postID); got != models.ModerationVisible {
		t.Fatalf("con 1 reporte nuevo: estado %q, se esperaba visible", got)
	}
}

func TestRemovingPostKeepsItHidden(t *testing.T) {
	f := newModerationFixture(t, 5)
	author, moderator, viewer := f.userIDs[0], f.userIDs[4], f.userIDs[4]
	postID := f.createPost(t, author)

	reportID := f.report(t, postID, f.userIDs[1], f.userIDs[2], f.userIDs[3])

	if err := f.reports.ReviewReport(reportID, moderator, models.ReportResolved, ""); err != nil {
		t.Fatal(err)
	}

	if got := f.feedStatus(t, viewer, postID); got != "" {
		t.Fatalf("otro usuario ve la publicación retirada (estado %q)", got)
	}
	if got := f.feedStatus(t, author, postID); got != models.ModerationRemoved {
		t.Fatalf("el autor ve estado %q, se esperaba removed", got)
	}

	if n := f.pendingReports(t, postID); n != 0 {
		t.Fatalf("quedaron %d reportes pendientes tras retirar", n)
	}

	if _, err := f.reports.CreateReport(postID, viewer, models.ReportSpam, "spam"); err != ErrPostNotFound {
		t.Fatalf("reportar retirada: error %v, se esperaba ErrPostNotFound", err)
	}

	// Retirada pesa más que cualquier reporte posterior. La API ya no deja
	// reportarla, así que se insertan directamente.
	_, err := f.db.Exec(
		context.Background(),
		`
		INSERT INTO reports (post_id, reporter_id, reporter_name, report_type, description)
		SELECT $1::uuid, id, 'test', 'spam', 'spam'
		FROM users
		WHERE id = ANY($2::uuid[])
		`,
		postID,
		[]string{viewer, author},
	)
	if err != nil {
		t.Fatal(err)
	}
	if got := f.feedStatus(t, author, postID); got != models.ModerationRemoved {
		t.Fatalf("con reportes nuevos tras retirar: estado %q, se esperaba removed", got)
	}
}
