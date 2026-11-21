package repository

import (
	"context"
	"errors"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReportRepository struct {
	db *pgxpool.Pool
}

func NewReportRepository(db *pgxpool.Pool) *ReportRepository {
	return &ReportRepository{db: db}
}

func (r *ReportRepository) Create(
	postID string,
	reporterID string,
	reporterName string,
	reportType models.ReportType,
	description string,
) (*models.Report, error) {

	var report models.Report

	err := r.db.QueryRow(
		context.Background(),
		`
		INSERT INTO reports (
			post_id,
			reporter_id,
			reporter_name,
			report_type,
			report_status,
			description
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING
			id,
			post_id,
			reporter_id,
			reporter_name,
			report_type,
			report_status,
			description,
			moderator_notes,
			reviewed_by_id,
			reviewed_at,
			created_at,
			updated_at
		`,
		postID,
		reporterID,
		reporterName,
		reportType,
		models.ReportPending,
		description,
	).Scan(
		&report.ID,
		&report.PostID,
		&report.ReporterID,
		&report.ReporterName,
		&report.ReportType,
		&report.ReportStatus,
		&report.Description,
		&report.ModeratorNotes,
		&report.ReviewedByID,
		&report.ReviewedAt,
		&report.CreatedAt,
		&report.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &report, nil
}

func (r *ReportRepository) FindByID(id string) (*models.Report, error) {

	var report models.Report

	err := r.db.QueryRow(
		context.Background(),
		`
		SELECT
			id,
			post_id,
			reporter_id,
			reporter_name,
			report_type,
			report_status,
			description,
			moderator_notes,
			reviewed_by_id,
			reviewed_at,
			created_at,
			updated_at
		FROM reports
		WHERE id = $1
		`,
		id,
	).Scan(
		&report.ID,
		&report.PostID,
		&report.ReporterID,
		&report.ReporterName,
		&report.ReportType,
		&report.ReportStatus,
		&report.Description,
		&report.ModeratorNotes,
		&report.ReviewedByID,
		&report.ReviewedAt,
		&report.CreatedAt,
		&report.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("reporte no encontrado")
		}
		return nil, err
	}

	return &report, nil
}

func (r *ReportRepository) FindByPostID(postID string) ([]models.Report, error) {

	rows, err := r.db.Query(
		context.Background(),
		`
		SELECT
			id,
			post_id,
			reporter_id,
			reporter_name,
			report_type,
			report_status,
			description,
			moderator_notes,
			reviewed_by_id,
			reviewed_at,
			created_at,
			updated_at
		FROM reports
		WHERE post_id = $1
		ORDER BY created_at DESC
		`,
		postID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []models.Report

	for rows.Next() {
		var report models.Report

		err := rows.Scan(
			&report.ID,
			&report.PostID,
			&report.ReporterID,
			&report.ReporterName,
			&report.ReportType,
			&report.ReportStatus,
			&report.Description,
			&report.ModeratorNotes,
			&report.ReviewedByID,
			&report.ReviewedAt,
			&report.CreatedAt,
			&report.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		reports = append(reports, report)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return reports, nil
}

func (r *ReportRepository) FindPending() ([]models.Report, error) {

	rows, err := r.db.Query(
		context.Background(),
		`
		SELECT
			r.id,
			r.post_id,
			r.reporter_id,
			r.reporter_name,
			r.report_type,
			r.report_status,
			r.description,
			r.moderator_notes,
			r.reviewed_by_id,
			r.reviewed_at,
			r.created_at,
			r.updated_at,
			p.content,
			u.username
		FROM reports r
		JOIN posts p
			ON p.id = r.post_id
		JOIN users u
			ON u.id = p.user_id
		WHERE r.report_status = $1
		ORDER BY r.created_at ASC
		`,
		models.ReportPending,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []models.Report

	for rows.Next() {
		var report models.Report

		err := rows.Scan(
			&report.ID,
			&report.PostID,
			&report.ReporterID,
			&report.ReporterName,
			&report.ReportType,
			&report.ReportStatus,
			&report.Description,
			&report.ModeratorNotes,
			&report.ReviewedByID,
			&report.ReviewedAt,
			&report.CreatedAt,
			&report.UpdatedAt,
			&report.PostContent,
			&report.PostUsername,
		)

		if err != nil {
			return nil, err
		}

		reports = append(reports, report)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return reports, nil
}

// ReviewPost aplica la decisión del moderador a todos los reportes
// pendientes de la publicación a la que pertenece reportID, porque la
// decisión (aprobar o retirar) es sobre la publicación, no sobre un reporte.
// Devuelve false si reportID no existe o ya no está pendiente.
func (r *ReportRepository) ReviewPost(
	reportID string,
	status models.ReportStatus,
	moderatorID string,
	notes string,
) (bool, error) {

	result, err := r.db.Exec(
		context.Background(),
		`
		UPDATE reports
		SET
			report_status = $1,
			reviewed_by_id = $2,
			moderator_notes = $3,
			reviewed_at = NOW(),
			updated_at = NOW()
		WHERE report_status = 'pending'
		  AND post_id = (
			SELECT post_id
			FROM reports
			WHERE id = $4
			  AND report_status = 'pending'
		  )
		`,
		status,
		moderatorID,
		notes,
		reportID,
	)

	// Un id que no es UUID equivale a un reporte inexistente.
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) && pgError.Code == "22P02" {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return result.RowsAffected() > 0, nil
}
