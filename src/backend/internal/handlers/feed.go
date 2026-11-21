package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

// NextCursorHeader trae el cursor de la página siguiente del feed.
const NextCursorHeader = "X-Next-Cursor"

type FeedHandler struct {
	postService *services.PostService
}

func NewFeedHandler(
	postService *services.PostService,
) *FeedHandler {
	return &FeedHandler{
		postService: postService,
	}
}

type createPostRequest struct {
	Content  string          `json:"content"`
	PostType models.PostType `json:"post_type"`
}

func (h *FeedHandler) CreatePost(
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

	var request createPostRequest

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

	post, err := h.postService.CreatePost(
		userID,
		request.Content,
		request.PostType,
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
			"message": "publicación creada correctamente",
			"post":    post,
		},
	)
}

func (h *FeedHandler) GetFeed(
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

	// ?limit=N&cursor=... ; sin parámetros devuelve la primera página.
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	posts, nextCursor, err := h.postService.GetFeedPage(
		r.Context(),
		userID,
		r.URL.Query().Get("cursor"),
		limit,
	)

	if errors.Is(err, services.ErrInvalidFeedCursor) {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": err.Error(),
			},
		)
		return
	}

	if err != nil {
		utils.JSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "no fue posible obtener el feed",
			},
		)
		return
	}

	// El cuerpo sigue siendo un arreglo; el cursor viaja en un encabezado.
	if nextCursor != "" {
		w.Header().Set(NextCursorHeader, nextCursor)
	}

	utils.JSON(w, http.StatusOK, posts)
}

func (h *FeedHandler) DeletePost(
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

	postID := chi.URLParam(r, "postID")

	if err := h.postService.DeletePost(
		postID,
		userID,
	); err != nil {
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
			"message": "publicación eliminada correctamente",
		},
	)
}
