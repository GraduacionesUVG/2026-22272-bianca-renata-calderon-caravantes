package handlers

import (
	"net/http"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

func NewNotificationHandler(
	notificationService *services.NotificationService,
) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

func notificationUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return "", false
	}

	return userID, true
}

func (h *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := notificationUserID(w, r)
	if !ok {
		return
	}

	notifications, err := h.notificationService.GetNotifications(userID)
	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible obtener las notificaciones",
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"notifications": notifications,
	})
}

func (h *NotificationHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := notificationUserID(w, r)
	if !ok {
		return
	}

	count, err := h.notificationService.CountUnread(userID)
	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible contar las notificaciones",
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]int{
		"unread": count,
	})
}

func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := notificationUserID(w, r)
	if !ok {
		return
	}

	if err := h.notificationService.MarkAllRead(userID); err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible marcar las notificaciones como leídas",
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]string{
		"message": "notificaciones marcadas como leídas",
	})
}
