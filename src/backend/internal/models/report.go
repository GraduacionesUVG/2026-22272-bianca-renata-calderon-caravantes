package models

import "time"

// ReportType representa los tipos de reporte disponibles
type ReportType string

const (
	ReportInappropriateContent ReportType = "inappropriate_content"
	ReportHarassment           ReportType = "harassment"
	ReportSpam                 ReportType = "spam"
	ReportMisinformation       ReportType = "misinformation"
	ReportOther                ReportType = "other"
)

// ReportStatus representa el estado del reporte
type ReportStatus string

const (
	ReportPending  ReportStatus = "pending"
	ReportReviewed ReportStatus = "reviewed"
	// ReportResolved: el moderador retiró la publicación.
	ReportResolved ReportStatus = "resolved"
	// ReportDismissed: el moderador aprobó la publicación.
	ReportDismissed ReportStatus = "dismissed"
)

// Report representa un reporte de contenido inapropiado
type Report struct {
	ID             string       `json:"id"`
	PostID         string       `json:"post_id"`
	ReporterID     string       `json:"reporter_id"`
	ReporterName   string       `json:"reporter_name"`
	ReportType     ReportType   `json:"report_type"`
	ReportStatus   ReportStatus `json:"report_status"`
	Description    string       `json:"description"`
	ModeratorNotes *string      `json:"moderator_notes,omitempty"`
	ReviewedByID   *string      `json:"reviewed_by_id,omitempty"`
	ReviewedAt     *time.Time   `json:"reviewed_at,omitempty"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`

	// Solo se completan en la cola de moderación.
	PostContent  string `json:"post_content,omitempty"`
	PostUsername string `json:"post_username,omitempty"`
}
