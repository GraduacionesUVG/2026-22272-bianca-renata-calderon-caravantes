package handlers

import (
	"encoding/json"
	"net/http"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
	"github.com/go-chi/chi/v5"
)

type CommentHandler struct {
	commentService *services.CommentService
}

func NewCommentHandler(
	commentService *services.CommentService,
) *CommentHandler {
	return &CommentHandler{
		commentService: commentService,
	}
}

type createCommentRequest struct {
	Content string `json:"content"`
}

func (h *CommentHandler) GetComments(
	w http.ResponseWriter,
	r *http.Request,
) {
	postID := chi.URLParam(r, "postID")
	userID, _ := r.Context().Value(custommiddleware.UserIDKey).(string)

	comments, err := h.commentService.GetComments(postID, userID)
	if err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{"error": err.Error()},
		)
		return
	}

	utils.JSON(w, http.StatusOK, comments)
}

func (h *CommentHandler) CreateComment(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(
			w,
			http.StatusUnauthorized,
			map[string]string{"error": "usuario no autenticado"},
		)
		return
	}

	postID := chi.URLParam(r, "postID")

	var request createCommentRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{"error": "JSON inválido"},
		)
		return
	}

	comment, err := h.commentService.CreateComment(
		postID,
		userID,
		request.Content,
	)

	if err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{"error": err.Error()},
		)
		return
	}

	utils.JSON(
		w,
		http.StatusCreated,
		map[string]interface{}{
			"message": "comentario creado correctamente",
			"comment": comment,
		},
	)
}

func (h *CommentHandler) DeleteComment(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(
			w,
			http.StatusUnauthorized,
			map[string]string{"error": "usuario no autenticado"},
		)
		return
	}

	commentID := chi.URLParam(r, "commentID")

	if err := h.commentService.DeleteComment(
		commentID,
		userID,
	); err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{"error": err.Error()},
		)
		return
	}

	utils.JSON(
		w,
		http.StatusOK,
		map[string]string{
			"message": "comentario eliminado correctamente",
		},
	)
}
