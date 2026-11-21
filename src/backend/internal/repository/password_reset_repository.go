package repository

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrResetRateLimited indica que el usuario pidió un código hace muy poco o
// alcanzó el máximo de códigos por hora.
var ErrResetRateLimited = errors.New("demasiadas solicitudes de recuperación")

type PasswordResetRepository struct {
	db *pgxpool.Pool
}

func NewPasswordResetRepository(
	db *pgxpool.Pool,
) *PasswordResetRepository {
	return &PasswordResetRepository{
		db: db,
	}
}

// CreateReplacingActive invalida los códigos activos del usuario y guarda el
// nuevo dentro de una transacción. Bloquear la fila del usuario serializa las
// solicitudes simultáneas, así que solo queda un código activo por usuario.
// Devuelve ErrResetRateLimited si el último código se creó hace menos de
// `cooldown` o si ya se crearon `maxPerHour` códigos en la última hora.
func (r *PasswordResetRepository) CreateReplacingActive(
	token *models.PasswordResetToken,
	cooldown time.Duration,
	maxPerHour int,
) error {
	ctx := context.Background()

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("error iniciando transacción: %w", err)
	}

	defer tx.Rollback(ctx)

	lockQuery := `
		SELECT id
		FROM users
		WHERE id = $1
		FOR UPDATE
	`

	var userID string
	if err := tx.QueryRow(ctx, lockQuery, token.UserID).Scan(&userID); err != nil {
		return err
	}

	limitQuery := `
		SELECT
			COUNT(*) FILTER (
				WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
			),
			COALESCE(
				MAX(created_at) > CURRENT_TIMESTAMP - make_interval(secs => $2),
				false
			)
		FROM password_reset_tokens
		WHERE user_id = $1
	`

	var lastHourCount int
	var inCooldown bool
	if err := tx.QueryRow(
		ctx,
		limitQuery,
		token.UserID,
		cooldown.Seconds(),
	).Scan(&lastHourCount, &inCooldown); err != nil {
		return err
	}

	if inCooldown || lastHourCount >= maxPerHour {
		return ErrResetRateLimited
	}

	invalidateQuery := `
		UPDATE password_reset_tokens
		SET used_at = CURRENT_TIMESTAMP
		WHERE user_id = $1
		  AND used_at IS NULL
	`

	if _, err := tx.Exec(ctx, invalidateQuery, token.UserID); err != nil {
		return err
	}

	insertQuery := `
		INSERT INTO password_reset_tokens (
			user_id,
			code_hash,
			expires_at
		)
		VALUES ($1, $2, $3)
		RETURNING
			id,
			attempts,
			created_at
	`

	if err := tx.QueryRow(
		ctx,
		insertQuery,
		token.UserID,
		token.CodeHash,
		token.ExpiresAt,
	).Scan(
		&token.ID,
		&token.Attempts,
		&token.CreatedAt,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ConsumeCodeAndUpdatePassword comprueba el código activo del usuario y, si
// coincide, lo marca como usado y actualiza la contraseña en la misma
// transacción. Cada fallo suma un intento; al llegar a maxAttempts el código
// queda invalidado. La fila se bloquea (FOR UPDATE), así que las peticiones
// simultáneas se procesan de una en una y el código solo se consume una vez.
func (r *PasswordResetRepository) ConsumeCodeAndUpdatePassword(
	userID string,
	codeHash string,
	passwordHash string,
	maxAttempts int,
) (bool, error) {
	ctx := context.Background()

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("error iniciando transacción: %w", err)
	}

	defer tx.Rollback(ctx)

	selectQuery := `
		SELECT
			id,
			code_hash,
			attempts
		FROM password_reset_tokens
		WHERE user_id = $1
		  AND used_at IS NULL
		  AND expires_at > CURRENT_TIMESTAMP
		FOR UPDATE
	`

	var token models.PasswordResetToken

	err = tx.QueryRow(ctx, selectQuery, userID).Scan(
		&token.ID,
		&token.CodeHash,
		&token.Attempts,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	if subtle.ConstantTimeCompare([]byte(token.CodeHash), []byte(codeHash)) != 1 {
		failQuery := `
			UPDATE password_reset_tokens
			SET
				attempts = attempts + 1,
				used_at = CASE
					WHEN attempts + 1 >= $2 THEN CURRENT_TIMESTAMP
					ELSE used_at
				END
			WHERE id = $1
		`

		if _, err := tx.Exec(ctx, failQuery, token.ID, maxAttempts); err != nil {
			return false, err
		}

		return false, tx.Commit(ctx)
	}

	consumeQuery := `
		UPDATE password_reset_tokens
		SET used_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	if _, err := tx.Exec(ctx, consumeQuery, token.ID); err != nil {
		return false, err
	}

	updatePasswordQuery := `
		UPDATE users
		SET
			password_hash = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	if _, err := tx.Exec(ctx, updatePasswordQuery, userID, passwordHash); err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}

	return true, nil
}
