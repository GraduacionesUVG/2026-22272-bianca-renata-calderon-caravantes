package services

import (
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/jackc/pgx/v5/pgconn"
)

var ErrReportNotFound = errors.New("reporte no encontrado")

var ErrAlreadyReported = errors.New("ya reportaste esta publicación")

type ReportService struct {
	reportRepository *repository.ReportRepository
	postRepository   *repository.PostRepository
	userRepository   *repository.UserRepository
}

func NewReportService(
	reportRepository *repository.ReportRepository,
	postRepository *repository.PostRepository,
	userRepository *repository.UserRepository,
) *ReportService {
	return &ReportService{
		reportRepository: reportRepository,
		postRepository:   postRepository,
		userRepository:   userRepository,
	}
}

func (s *ReportService) CreateReport(
	postID string,
	reporterID string,
	reportType models.ReportType,
	description string,
) (*models.Report, error) {

	if err := ensurePostVisible(s.postRepository, postID, reporterID); err != nil {
		return nil, err
	}

	post, err := s.postRepository.FindByID(postID)
	if err != nil || post == nil {
		return nil, errors.New("publicación no encontrada")
	}

	// Validar tipo de reporte
	switch reportType {
	case models.ReportInappropriateContent,
		models.ReportHarassment,
		models.ReportSpam,
		models.ReportMisinformation,
		models.ReportOther:
	default:
		return nil, errors.New("tipo de reporte inválido")
	}

	// Normalizar descripción
	description = strings.TrimSpace(description)
	if description == "" {
		return nil, errors.New("la descripción del reporte es obligatoria")
	}

	if utf8.RuneCountInString(description) > 500 {
		return nil, errors.New("la descripción no puede exceder 500 caracteres")
	}

	// Verificar que el usuario no sea el autor de la publicación
	if post.UserID == reporterID {
		return nil, errors.New("no puedes reportar tu propia publicación")
	}

	// Un mismo usuario cuenta una sola vez para ocultar la publicación.
	existingReports, err := s.reportRepository.FindByPostID(postID)
	if err != nil {
		return nil, err
	}

	for _, existing := range existingReports {
		if existing.ReporterID == reporterID {
			return nil, ErrAlreadyReported
		}
	}

	// Obtener el nombre real del usuario que reporta
	reporter, err := s.userRepository.FindByID(reporterID)
	if err != nil {
		return nil, errors.New("no fue posible obtener el usuario")
	}

	if reporter == nil {
		return nil, errors.New("usuario no encontrado")
	}

	// Crear el reporte
	report, err := s.reportRepository.Create(
		postID,
		reporterID,
		reporter.Username,
		reportType,
		description,
	)

	// Dos solicitudes simultáneas pueden pasar la comprobación anterior; el
	// índice único de la migración 015 rechaza la segunda.
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) &&
		pgError.Code == "23505" &&
		pgError.ConstraintName == "idx_reports_unique_reporter_post" {
		return nil, ErrAlreadyReported
	}

	return report, err
}

func (s *ReportService) GetPendingReports() ([]models.Report, error) {
	return s.reportRepository.FindPending()
}

func (s *ReportService) GetReportsByPostID(postID string) ([]models.Report, error) {
	return s.reportRepository.FindByPostID(postID)
}

func (s *ReportService) ReviewReport(
	reportID string,
	moderatorID string,
	status models.ReportStatus,
	notes string,
) error {

	// Solo hay dos decisiones: aprobar (dismissed) o retirar (resolved).
	switch status {
	case models.ReportResolved,
		models.ReportDismissed:
	default:
		return errors.New("estado de reporte inválido")
	}

	updated, err := s.reportRepository.ReviewPost(reportID, status, moderatorID, notes)
	if err != nil {
		return err
	}

	if !updated {
		return ErrReportNotFound
	}

	return nil
}
