package repository

import (
	"context"
	"errors"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// moderationLateral calcula moderation.status para la publicación p.
// Espera el umbral de reportes en $2. Un reporte resuelto (publicación
// retirada) pesa más que cualquier aprobación; los reportes descartados
// (publicación aprobada) dejan de contar.
const moderationLateral = `
		CROSS JOIN LATERAL (
			SELECT CASE
				WHEN COALESCE(BOOL_OR(rp.report_status = 'resolved'), false)
					THEN 'removed'
				WHEN COUNT(DISTINCT rp.reporter_id)
					FILTER (WHERE rp.report_status = 'pending') >= $2
					THEN 'under_review'
				ELSE 'visible'
			END AS status
			FROM reports rp
			WHERE rp.post_id = p.id
		) moderation`

type PostRepository struct {
	db *pgxpool.Pool
}

func NewPostRepository(db *pgxpool.Pool) *PostRepository {
	return &PostRepository{db: db}
}

func (r *PostRepository) Create(
	userID string,
	content string,
	postType models.PostType,
) (*models.Post, error) {

	var post models.Post

	err := r.db.QueryRow(
		context.Background(),
		`
		INSERT INTO posts (
			user_id,
			content,
			post_type
		)
		VALUES ($1, $2, $3)
		RETURNING
			id,
			user_id,
			content,
			post_type,
			edited,
			created_at,
			updated_at
		`,
		userID,
		content,
		postType,
	).Scan(
		&post.ID,
		&post.UserID,
		&post.Content,
		&post.PostType,
		&post.Edited,
		&post.CreatedAt,
		&post.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &post, nil
}

func (r *PostRepository) CreateAchievementPost(
	userID string,
	content string,
	achievementID string,
) (*models.Post, error) {
	var post models.Post

	err := r.db.QueryRow(
		context.Background(),
		`
		INSERT INTO posts (
			user_id,
			achievement_id,
			content,
			post_type
		)
		VALUES ($1, $2, $3, $4)
		RETURNING
			id,
			user_id,
			achievement_id,
			content,
			post_type,
			edited,
			created_at,
			updated_at
		`,
		userID,
		achievementID,
		content,
		models.PostAchievement,
	).Scan(
		&post.ID,
		&post.UserID,
		&post.AchievementID,
		&post.Content,
		&post.PostType,
		&post.Edited,
		&post.CreatedAt,
		&post.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &post, nil
}

// FindPage devuelve hasta limit publicaciones del feed, de la más reciente a la
// más antigua. Con before se pide la página siguiente: las publicaciones
// estrictamente anteriores a (before, beforeID). Una publicación queda oculta
// (excepto para su autor) cuando acumula reportes pendientes de
// reportThreshold usuarios distintos o cuando un moderador la retiró.
func (r *PostRepository) FindPage(
	ctx context.Context,
	userID string,
	reportThreshold int,
	before *time.Time,
	beforeID string,
	limit int,
) ([]models.Post, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			p.id,
			p.user_id,
			p.achievement_id,
			u.username,
			u.full_name,
			p.content,
			p.post_type,
			p.edited,
			(
				SELECT COUNT(*)::int
				FROM likes l
				WHERE l.post_id = p.id
			) AS like_count,
			EXISTS (
				SELECT 1
				FROM likes my_like
				WHERE my_like.post_id = p.id
				  AND my_like.user_id = $1::uuid
			) AS liked_by_me,
			
			(
				SELECT COUNT(*)
				FROM comments c
				WHERE c.post_id = p.id
			) AS comment_count,

			moderation.status,

			p.created_at,
			p.updated_at

		FROM posts p
		JOIN users u
			ON u.id = p.user_id
		`+moderationLateral+`
		WHERE (moderation.status = 'visible' OR p.user_id = $1::uuid)
		  AND (
			$3::timestamptz IS NULL
			OR (p.created_at, p.id) < ($3::timestamptz, $4::uuid)
		  )
		ORDER BY p.created_at DESC, p.id DESC
		LIMIT $5
		`,
		userID,
		reportThreshold,
		before,
		beforeID,
		limit,
	)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	posts := []models.Post{}

	for rows.Next() {
		var post models.Post

		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.AchievementID,
			&post.Username,
			&post.FullName,
			&post.Content,
			&post.PostType,
			&post.Edited,
			&post.LikeCount,
			&post.LikedByMe,
			&post.CommentCount,
			&post.ModerationStatus,
			&post.CreatedAt,
			&post.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		posts = append(posts, post)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}
func (r *PostRepository) FindByID(id string) (*models.Post, error) {
	var post models.Post

	err := r.db.QueryRow(
		context.Background(),
		`
		SELECT
			p.id,
			p.user_id,
			p.achievement_id,
			u.username,
			u.full_name,
			p.content,
			p.post_type,
			p.edited,
			(
				SELECT COUNT(*)::int
				FROM likes l
				WHERE l.post_id = p.id
			) AS like_count,
			p.created_at,
			p.updated_at
		FROM posts p
		JOIN users u
			ON u.id = p.user_id
		WHERE p.id = $1::uuid
		`,
		id,
	).Scan(
		&post.ID,
		&post.UserID,
		&post.AchievementID,
		&post.Username,
		&post.FullName,
		&post.Content,
		&post.PostType,
		&post.Edited,
		&post.LikeCount,
		&post.CreatedAt,
		&post.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &post, nil
}

// IsVisibleTo indica si la publicación existe y userID puede verla: está
// visible o es su autor. Usa la misma regla que FindAll.
func (r *PostRepository) IsVisibleTo(
	postID string,
	userID string,
	reportThreshold int,
) (bool, error) {
	var visible bool

	err := r.db.QueryRow(
		context.Background(),
		`
		SELECT EXISTS (
			SELECT 1
			FROM posts p
			`+moderationLateral+`
			WHERE p.id = $3::uuid
			  AND (
				moderation.status = 'visible'
				OR p.user_id = $1::uuid
			  )
		)
		`,
		userID,
		reportThreshold,
		postID,
	).Scan(&visible)

	// Un id que no es UUID equivale a una publicación inexistente.
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) && pgError.Code == "22P02" {
		return false, nil
	}

	return visible, err
}

// Delete elimina la publicación solo si pertenece al usuario. Los likes,
// comentarios y reportes asociados se eliminan en cascada.
func (r *PostRepository) Delete(
	postID string,
	userID string,
) (bool, error) {
	result, err := r.db.Exec(
		context.Background(),
		`
		DELETE FROM posts
		WHERE id = $1
		  AND user_id = $2
		`,
		postID,
		userID,
	)

	// Un id que no es UUID equivale a una publicación inexistente.
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) && pgError.Code == "22P02" {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return result.RowsAffected() > 0, nil
}
