package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type ReportHandler struct {
	reportService *services.ReportService
}

func NewReportHandler(
	reportService *services.ReportService,
) *ReportHandler {
	return &ReportHandler{
		reportService: reportService,
	}
}

type createReportRequest struct {
	PostID      string            `json:"post_id"`
	ReportType  models.ReportType `json:"report_type"`
	Description string            `json:"description"`
}

func (h *ReportHandler) CreateReport(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(
			w,
			http.StatusUnauthorized,
			map[string]string{
				"error": "usuario no autenticado",
			},
		)
		return
	}

	var request createReportRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "JSON inválido",
			},
		)
		return
	}

	report, err := h.reportService.CreateReport(
		request.PostID,
		userID,
		request.ReportType,
		request.Description,
	)

	if err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": err.Error(),
			},
		)
		return
	}

	utils.JSON(
		w,
		http.StatusCreated,
		map[string]interface{}{
			"message": "reporte creado correctamente",
			"report":  report,
		},
	)
}

func (h *ReportHandler) GetPendingReports(
	w http.ResponseWriter,
	r *http.Request,
) {
	reports, err := h.reportService.GetPendingReports()

	if err != nil {
		utils.JSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "no fue posible obtener los reportes",
			},
		)
		return
	}

	utils.JSON(
		w,
		http.StatusOK,
		map[string]interface{}{
			"reports": reports,
		},
	)
}

type reviewReportRequest struct {
	Status models.ReportStatus `json:"status"`
	Notes  string              `json:"notes"`
}

func (h *ReportHandler) ReviewReport(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(
			w,
			http.StatusUnauthorized,
			map[string]string{
				"error": "usuario no autenticado",
			},
		)
		return
	}

	reportID := chi.URLParam(r, "reportID")
	if reportID == "" {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "falta el ID del reporte",
			},
		)
		return
	}

	var request reviewReportRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "JSON inválido",
			},
		)
		return
	}

	err := h.reportService.ReviewReport(
		reportID,
		userID,
		request.Status,
		request.Notes,
	)

	if errors.Is(err, services.ErrReportNotFound) {
		utils.JSON(
			w,
			http.StatusNotFound,
			map[string]string{
				"error": err.Error(),
			},
		)
		return
	}

	if err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": err.Error(),
			},
		)
		return
	}

	utils.JSON(
		w,
		http.StatusOK,
		map[string]string{
			"message": "reporte revisado correctamente",
		},
	)
}
