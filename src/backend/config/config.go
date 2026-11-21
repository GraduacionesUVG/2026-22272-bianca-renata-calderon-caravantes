package config

import (
	"log"
	"os"
	"strconv"
	"strings"
)

// Valores de desarrollo. Son públicos (están en el repositorio), así que en
// producción el servidor no arranca si JWT_SECRET o PASSWORD_RESET_SECRET
// siguen con ellos.
const (
	DefaultJWTSecret           = "change-me-in-production"
	DefaultPasswordResetSecret = "change-me-in-production"
)

// Config contiene la configuración de la aplicación cargada desde variables de entorno.
type Config struct {
	Env         string
	DatabaseURL string
	JWTSecret   string

	// CORSAllowedOrigins son los orígenes web que pueden llamar a la API: el
	// frontend publicado en Netlify y Expo Web en local.
	CORSAllowedOrigins []string

	// AppTimezone es la zona horaria de las sesiones de PostgreSQL. Define
	// cuándo empieza cada día y cada semana (lunes 00:00) para la racha.
	AppTimezone string

	PasswordResetSecret string

	// PasswordResetEnabled permite desactivar la recuperación de contraseña
	// (p. ej. en el piloto, donde el hosting gratuito no permite SMTP).
	PasswordResetEnabled bool

	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
}

// Load lee las variables de entorno y devuelve la configuración de la app.
// Si una variable no está definida, se usa un valor por defecto para desarrollo local.
func Load() *Config {
	return &Config{
		Env:         getEnv("APP_ENV", "development"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://gymify:gymify@localhost:5432/gymify?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", DefaultJWTSecret),
		AppTimezone: getEnv("APP_TIMEZONE", "America/Guatemala"),

		CORSAllowedOrigins: getListEnv("CORS_ALLOWED_ORIGINS", []string{
			"https://gymify-frontend.netlify.app",
			"http://localhost:8081",
		}),

		PasswordResetSecret:  getEnv("PASSWORD_RESET_SECRET", DefaultPasswordResetSecret),
		PasswordResetEnabled: getBoolEnv("PASSWORD_RESET_ENABLED", true),

		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", "Gymify <no-reply@gymify.app>"),
	}
}

// getBoolEnv acepta true/false, 1/0, TRUE/FALSE... y detiene el servidor si
// el valor no es válido, para no desactivar algo por un error de escritura.
func getBoolEnv(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		log.Fatalf("%s debe ser true o false (valor recibido: %q)", key, value)
	}

	return parsed
}

// getListEnv lee una lista separada por comas, ignorando espacios y vacíos.
func getListEnv(key string, fallback []string) []string {
	var values []string
	for _, value := range strings.Split(os.Getenv(key), ",") {
		if value = strings.TrimSpace(value); value != "" {
			values = append(values, value)
		}
	}

	if len(values) == 0 {
		return fallback
	}

	return values
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
