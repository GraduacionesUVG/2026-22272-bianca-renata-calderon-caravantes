package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DBTX lo cumplen tanto *pgxpool.Pool como pgx.Tx. Permite ejecutar los mismos
// repositorios y servicios dentro de una transacción (WithTx) o fuera de ella.
// Begin dentro de una transacción crea un punto de guardado, no una nueva.
type DBTX interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Begin(ctx context.Context) (pgx.Tx, error)
}
