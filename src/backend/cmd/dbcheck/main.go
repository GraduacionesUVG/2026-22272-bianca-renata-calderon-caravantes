// dbcheck comprueba que el backend puede usar una base de datos: conexión,
// search_path, zona horaria y datos de catálogo. No muestra la contraseña.
//
// Uso (sin tocar .env, la variable de la línea de comandos tiene prioridad):
//
//	DATABASE_URL='postgresql://...' go run ./cmd/dbcheck
package main

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/biancacalderon/gymify/backend/config"
	"github.com/biancacalderon/gymify/backend/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	// godotenv no sobrescribe variables ya definidas en el entorno.
	_ = godotenv.Load()
	cfg := config.Load()

	host := "(no se pudo leer)"
	if parsed, err := url.Parse(cfg.DatabaseURL); err == nil {
		host = parsed.Hostname()
	}

	fmt.Println("Host:        ", host)
	fmt.Println("APP_TIMEZONE:", cfg.AppTimezone)

	if strings.Contains(host, "-pooler") {
		fmt.Println("AVISO: es la conexión con pooler de Neon; usa la directa (sin \"-pooler\").")
	}

	pool, err := database.Connect(cfg.DatabaseURL, cfg.AppTimezone)
	if err != nil {
		fmt.Println("ERROR al conectar:", err)
		os.Exit(1)
	}
	defer pool.Close()

	ctx := context.Background()
	failed := false

	var searchPath, timezone, weekStart string
	err = pool.QueryRow(ctx, `
		SELECT
			current_setting('search_path'),
			current_setting('TimeZone'),
			date_trunc('week', LOCALTIMESTAMP)::date::text
	`).Scan(&searchPath, &timezone, &weekStart)
	if err != nil {
		fmt.Println("ERROR leyendo la sesión:", err)
		os.Exit(1)
	}

	fmt.Println("search_path: ", searchPath)
	fmt.Println("TimeZone:    ", timezone)
	fmt.Println("Semana desde:", weekStart)

	if !strings.Contains(searchPath, "public") {
		fmt.Println("ERROR: search_path no incluye public")
		failed = true
	}

	// Sin esquema a propósito: así lo consulta el backend.
	checks := []struct {
		label string
		query string
		min   int
	}{
		{"Tablas", `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`, 16},
		{"Ejercicios", `SELECT COUNT(*) FROM exercises`, 12},
		{"  con imagen", `SELECT COUNT(*) FROM exercises WHERE image_url IS NOT NULL`, 12},
		{"Logros", `SELECT COUNT(*) FROM achievements`, 6},
		{"Retos", `SELECT COUNT(*) FROM challenges`, 3},
		{"Usuarios", `SELECT COUNT(*) FROM users`, 0},
	}

	for _, check := range checks {
		var count int

		if err := pool.QueryRow(ctx, check.query).Scan(&count); err != nil {
			fmt.Printf("%-12s ERROR: %v\n", check.label+":", err)
			failed = true
			continue
		}

		status := "OK"
		if count < check.min {
			status = fmt.Sprintf("FALTAN (se esperaban al menos %d)", check.min)
			failed = true
		}

		fmt.Printf("%-12s %d %s\n", check.label+":", count, status)
	}

	if failed {
		os.Exit(1)
	}

	fmt.Println("\nTodo listo para el backend.")
}
