package services

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

func newWorkoutServiceForTest(t *testing.T) (*WorkoutService, *pgxpool.Pool, string, func(string) (int, int, int)) {
	t.Helper()

	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL no definida")
	}

	// Sin database.Connect, que fija search_path=public: así se puede apuntar a
	// un esquema aparte con PGOPTIONS="-c search_path=..." .
	db, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}

	streakService := NewStreakService(repository.NewStreakRepository(db))
	gamificationService := NewGamificationService(db)
	achievementService := NewAchievementService(
		db,
		repository.NewAchievementRepository(db),
		repository.NewPostRepository(db),
	)
	challengeService := NewChallengeService(
		repository.NewChallengeRepository(db),
		gamificationService,
	)
	service := NewWorkoutService(
		repository.NewWorkoutRepository(db),
		gamificationService,
		achievementService,
		challengeService,
		streakService,
	)

	username := fmt.Sprintf("atomtest%d", time.Now().UnixNano())
	var userID string
	err = db.QueryRow(
		context.Background(),
		`
		INSERT INTO users (username, full_name, email, password_hash)
		VALUES ($1::text, 'Test', $1::text || '@example.com', 'x')
		RETURNING id
		`,
		username,
	).Scan(&userID)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() {
		db.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
		db.Close()
	})

	// Devuelve (entrenamientos, xp, logros) del usuario de prueba.
	counts := func(id string) (int, int, int) {
		var workouts, xp, achievements int
		err := db.QueryRow(
			context.Background(),
			`
			SELECT
				(SELECT COUNT(*) FROM workouts WHERE user_id = $1),
				(SELECT xp FROM users WHERE id = $1),
				(SELECT COUNT(*) FROM user_achievements WHERE user_id = $1)
			`,
			id,
		).Scan(&workouts, &xp, &achievements)
		if err != nil {
			t.Fatal(err)
		}
		return workouts, xp, achievements
	}

	return service, db, userID, counts
}

// Registrar un entrenamiento guarda a la vez el entrenamiento y todo lo que de
// él se deriva (XP y logros).
func TestCreateWorkoutAppliesRewardsTogether(t *testing.T) {
	service, db, userID, counts := newWorkoutServiceForTest(t)

	var exerciseID string
	if err := db.QueryRow(
		context.Background(),
		`SELECT id FROM exercises WHERE created_by IS NULL LIMIT 1`,
	).Scan(&exerciseID); err != nil {
		t.Fatal(err)
	}

	_, _, err := service.CreateWorkout(
		context.Background(),
		userID, "Prueba", 30, nil, true, nil,
		[]WorkoutExerciseInput{{ExerciseID: exerciseID, Sets: 3, Reps: 10, OrderNumber: 1}},
	)
	if err != nil {
		t.Fatal(err)
	}

	workouts, xp, achievements := counts(userID)
	if workouts != 1 {
		t.Fatalf("entrenamientos = %d, se esperaba 1", workouts)
	}
	if achievements < 1 {
		t.Fatalf("logros = %d, se esperaba al menos 1", achievements)
	}
	if xp < XPPerWorkout {
		t.Fatalf("xp = %d, se esperaba al menos %d", xp, XPPerWorkout)
	}
}

// Si la petición ya está cancelada, no se guarda nada: el contexto de la
// solicitud llega hasta la base de datos.
func TestCreateWorkoutWithCancelledContextSavesNothing(t *testing.T) {
	service, db, userID, counts := newWorkoutServiceForTest(t)

	var exerciseID string
	if err := db.QueryRow(
		context.Background(),
		`SELECT id FROM exercises WHERE created_by IS NULL LIMIT 1`,
	).Scan(&exerciseID); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, _, err := service.CreateWorkout(
		ctx, userID, "Prueba", 30, nil, true, nil,
		[]WorkoutExerciseInput{{ExerciseID: exerciseID, Sets: 3, Reps: 10, OrderNumber: 1}},
	)
	if err == nil {
		t.Fatal("se esperaba un error con la petición cancelada")
	}

	workouts, xp, achievements := counts(userID)
	if workouts != 0 || xp != 0 || achievements != 0 {
		t.Fatalf("quedó guardado algo: entrenamientos=%d xp=%d logros=%d", workouts, xp, achievements)
	}
}
