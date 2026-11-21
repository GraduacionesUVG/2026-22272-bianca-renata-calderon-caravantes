package routes

import (
	"net/http"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/handlers"
	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func NewRouter(
	authHandler *handlers.AuthHandler,
	userHandler *handlers.UserHandler,
	workoutHandler *handlers.WorkoutHandler,
	exerciseHandler *handlers.ExerciseHandler,
	achievementHandler *handlers.AchievementHandler,
	feedHandler *handlers.FeedHandler,
	likeHandler *handlers.LikeHandler,
	commentHandler *handlers.CommentHandler,
	challengeHandler *handlers.ChallengeHandler,
	rankingHandler *handlers.RankingHandler,
	reportHandler *handlers.ReportHandler,
	followHandler *handlers.FollowHandler,
	streakHandler *handlers.StreakHandler,
	notificationHandler *handlers.NotificationHandler,
	userRepository *repository.UserRepository,
	jwtSecret string,
	passwordResetEnabled bool,
) http.Handler {
	r := chi.NewRouter()

	r.Use(chimiddleware.Logger)

	// Rutas públicas
	r.Route("/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)

		// Desactivada: respondemos 503 sin generar códigos ni enviar correos.
		if !passwordResetEnabled {
			r.Post("/forgot-password", handlers.PasswordResetDisabled)
			r.Post("/reset-password", handlers.PasswordResetDisabled)
			return
		}

		r.With(custommiddleware.RateLimit(5, time.Minute)).
			Post("/forgot-password", authHandler.ForgotPassword)
		r.With(custommiddleware.RateLimit(10, time.Minute)).
			Post("/reset-password", authHandler.ResetPassword)
	})

	// Rutas protegidas
	r.Group(func(r chi.Router) {
		r.Use(custommiddleware.AuthMiddleware(jwtSecret))

		r.Route("/users", func(r chi.Router) {
			r.Get("/profile", userHandler.GetProfile)
			r.Put("/profile", userHandler.UpdateProfile)
			r.Patch("/settings", userHandler.UpdateSettings)
			r.Get("/achievements", achievementHandler.GetUserAchievements)
			r.Post("/achievements/{achievementID}/share", achievementHandler.ShareAchievement)

			// Perfil público y seguidores. Chi prioriza las rutas estáticas
			// (/profile, /achievements, /search, /streak, /stats) sobre {userID}.
			r.Get("/streak", streakHandler.GetStreak)
			r.Get("/stats", workoutHandler.GetStats)
			r.Put("/weekly-goal", streakHandler.SetWeeklyGoal)

			r.Get("/search", followHandler.SearchUsers)
			r.Get("/{userID}", followHandler.GetPublicProfile)
			r.Post("/{userID}/follow", followHandler.Follow)
			r.Delete("/{userID}/follow", followHandler.Unfollow)
			r.Get("/{userID}/followers", followHandler.GetFollowers)
			r.Get("/{userID}/following", followHandler.GetFollowing)
			r.Get("/{userID}/workouts", workoutHandler.GetProfileWorkouts)
		})

		r.Route("/workouts", func(r chi.Router) {
			r.Post("/", workoutHandler.CreateWorkout)
			r.Get("/", workoutHandler.GetWorkouts)
			r.Get("/{workoutID}", workoutHandler.GetWorkoutDetail)
			r.Patch("/{workoutID}", workoutHandler.RenameWorkout)
			r.Patch("/{workoutID}/visibility", workoutHandler.SetVisibility)
		})

		r.Route("/exercises", func(r chi.Router) {
			r.Get("/", exerciseHandler.GetExercises)
			r.Post("/", exerciseHandler.CreateExercise)
			r.Delete("/{exerciseID}", exerciseHandler.DeleteExercise)
		})

		r.Route("/posts", func(r chi.Router) {
			r.Get("/", feedHandler.GetFeed)
			r.Post("/", feedHandler.CreatePost)
			r.Delete("/{postID}", feedHandler.DeletePost)

			r.Post("/{postID}/likes", likeHandler.LikePost)
			r.Delete("/{postID}/likes", likeHandler.UnlikePost)

			r.Get("/{postID}/comments", commentHandler.GetComments)
			r.Post("/{postID}/comments", commentHandler.CreateComment)
			r.Delete("/{postID}/comments/{commentID}", commentHandler.DeleteComment)
		})

		r.Route("/notifications", func(r chi.Router) {
			r.Get("/", notificationHandler.GetNotifications)
			r.Get("/unread-count", notificationHandler.GetUnreadCount)
			r.Post("/read-all", notificationHandler.MarkAllRead)
		})

		r.Route("/challenges", func(r chi.Router) {
			r.Get("/", challengeHandler.GetChallenges)
			r.Post("/{challengeID}/join", challengeHandler.JoinChallenge)
		})

		r.Route("/rankings", func(r chi.Router) {
			r.Get("/", rankingHandler.GetRanking)
		})

		r.Route("/reports", func(r chi.Router) {
			// Cualquier usuario autenticado puede reportar contenido.
			r.Post("/", reportHandler.CreateReport)

			// Solo administradores pueden moderar reportes.
			r.Group(func(r chi.Router) {
				r.Use(custommiddleware.RequireRole(userRepository, "admin"))

				r.Get("/pending", reportHandler.GetPendingReports)
				r.Put("/{reportID}", reportHandler.ReviewReport)
			})
		})
	})

	return r
}
