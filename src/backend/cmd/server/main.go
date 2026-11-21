package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"github.com/biancacalderon/gymify/backend/config"
	"github.com/biancacalderon/gymify/backend/internal/database"
	"github.com/biancacalderon/gymify/backend/internal/handlers"
	"github.com/biancacalderon/gymify/backend/internal/mailer"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/biancacalderon/gymify/backend/internal/routes"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No se encontró archivo .env, usando variables de entorno del sistema")
	}

	cfg := config.Load()
	db, err := database.Connect(cfg.DatabaseURL, cfg.AppTimezone)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Auth & Users
	userRepository := repository.NewUserRepository(db)
	passwordResetRepository := repository.NewPasswordResetRepository(db)

	if cfg.Env == "production" && cfg.JWTSecret == config.DefaultJWTSecret {
		log.Fatal("JWT_SECRET es obligatorio en producción")
	}

	var appMailer mailer.Mailer
	if !cfg.PasswordResetEnabled {
		log.Println("Recuperación de contraseña desactivada (PASSWORD_RESET_ENABLED=false)")
		appMailer = mailer.NewDisabledMailer()
	} else if cfg.SMTPHost != "" {
		appMailer = mailer.NewSMTPMailer(
			cfg.SMTPHost,
			cfg.SMTPPort,
			cfg.SMTPUsername,
			cfg.SMTPPassword,
			cfg.SMTPFrom,
		)
	} else if cfg.Env == "production" {
		log.Fatal("SMTP_HOST es obligatorio en producción")
	} else {
		log.Println("SMTP no configurado: los correos se imprimirán en el log (solo desarrollo)")
		appMailer = mailer.NewLogMailer()
	}

	if cfg.Env == "production" &&
		cfg.PasswordResetEnabled &&
		cfg.PasswordResetSecret == config.DefaultPasswordResetSecret {
		log.Fatal("PASSWORD_RESET_SECRET es obligatorio en producción")
	}

	authService := services.NewAuthService(
		userRepository,
		passwordResetRepository,
		appMailer,
		cfg.JWTSecret,
		cfg.PasswordResetSecret,
	)
	authHandler := handlers.NewAuthHandler(authService)

	// Racha semanal
	streakRepository := repository.NewStreakRepository(db)
	streakService := services.NewStreakService(streakRepository)
	streakHandler := handlers.NewStreakHandler(streakService)

	userService := services.NewUserService(userRepository, streakService)
	userHandler := handlers.NewUserHandler(userService)

	// Posts
	postRepository := repository.NewPostRepository(db)

	// Achievements
	achievementRepository := repository.NewAchievementRepository(db)
	achievementService := services.NewAchievementService(
		db,
		achievementRepository,
		postRepository,
	)
	achievementHandler := handlers.NewAchievementHandler(achievementService)

	// Gamification
	gamificationService := services.NewGamificationService(db)

	// Challenges
	challengeRepository := repository.NewChallengeRepository(db)
	challengeService := services.NewChallengeService(
		challengeRepository,
		gamificationService,
	)
	challengeHandler := handlers.NewChallengeHandler(challengeService)

	// Ranking
	rankingService := services.NewRankingService(userRepository, streakService)
	rankingHandler := handlers.NewRankingHandler(rankingService)

	// Workouts
	workoutRepository := repository.NewWorkoutRepository(db)
	workoutService := services.NewWorkoutService(
		workoutRepository,
		gamificationService,
		achievementService,
		challengeService,
		streakService,
	)
	workoutHandler := handlers.NewWorkoutHandler(workoutService)

	// Exercises
	exerciseRepository := repository.NewExerciseRepository(db)
	exerciseService := services.NewExerciseService(exerciseRepository)
	exerciseHandler := handlers.NewExerciseHandler(exerciseService)

	// Feed, Likes, Comments & Reports
	postService := services.NewPostService(postRepository)
	feedHandler := handlers.NewFeedHandler(postService)

	// Notificaciones (likes, comentarios, seguidores)
	notificationRepository := repository.NewNotificationRepository(db)
	notificationService := services.NewNotificationService(notificationRepository)
	notificationHandler := handlers.NewNotificationHandler(notificationService)

	likeRepository := repository.NewLikeRepository(db)
	likeService := services.NewLikeService(
		likeRepository,
		postRepository,
		notificationService,
	)
	likeHandler := handlers.NewLikeHandler(likeService)

	commentRepository := repository.NewCommentRepository(db)
	commentService := services.NewCommentService(
		commentRepository,
		postRepository,
		notificationService,
	)
	commentHandler := handlers.NewCommentHandler(commentService)

	reportRepository := repository.NewReportRepository(db)
	reportService := services.NewReportService(
		reportRepository,
		postRepository,
		userRepository,
	)
	reportHandler := handlers.NewReportHandler(reportService)

	// Seguidores
	followRepository := repository.NewFollowRepository(db)
	followService := services.NewFollowService(
		followRepository,
		streakService,
		notificationService,
	)
	followHandler := handlers.NewFollowHandler(followService)

	log.Println("Conexión a PostgreSQL establecida correctamente")

	// Router setup
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{utils.RefreshedTokenHeader, handlers.NextCursorHeader},
		AllowCredentials: true,
	}))

	r.Get("/health", handlers.HealthCheck)
	r.Mount("/api/v1", routes.NewRouter(
		authHandler,
		userHandler,
		workoutHandler,
		exerciseHandler,
		achievementHandler,
		feedHandler,
		likeHandler,
		commentHandler,
		challengeHandler,
		rankingHandler,
		reportHandler,
		followHandler,
		streakHandler,
		notificationHandler,
		userRepository,
		cfg.JWTSecret,
		cfg.PasswordResetEnabled,
	))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Gymify backend corriendo en el puerto %s (env: %s)", port, cfg.Env)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
