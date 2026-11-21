package services

import (
	"context"
	"errors"
	"fmt"
	"testing"
)

func TestFeedPagination(t *testing.T) {
	f := newModerationFixture(t, 1)
	userID := f.userIDs[0]

	for i := 0; i < 45; i++ {
		if _, err := f.posts.CreatePost(userID, fmt.Sprintf("publicacion %d", i), "general"); err != nil {
			t.Fatal(err)
		}
	}

	seen := map[string]bool{}
	ownSeen := 0
	cursor := ""

	for page := 0; page < 1000; page++ {
		posts, next, err := f.posts.GetFeedPage(context.Background(), userID, cursor, 20)
		if err != nil {
			t.Fatal(err)
		}

		if len(posts) > 20 {
			t.Fatalf("página con %d publicaciones, máximo 20", len(posts))
		}

		for i, p := range posts {
			if seen[p.ID] {
				t.Fatalf("publicación repetida entre páginas: %s", p.ID)
			}
			seen[p.ID] = true

			if p.UserID == userID {
				ownSeen++
			}

			if i > 0 && p.CreatedAt.After(posts[i-1].CreatedAt) {
				t.Fatal("el feed no está ordenado de la más reciente a la más antigua")
			}
		}

		if next == "" {
			if ownSeen != 45 {
				t.Fatalf("se recorrieron %d de las 45 publicaciones propias", ownSeen)
			}
			return
		}

		cursor = next
	}

	t.Fatal("la paginación no termina")
}

func TestFeedRejectsInvalidCursor(t *testing.T) {
	service := NewPostService(nil)

	_, _, err := service.GetFeedPage(context.Background(), "user", "no-es-un-cursor", 20)
	if !errors.Is(err, ErrInvalidFeedCursor) {
		t.Fatalf("error = %v, se esperaba ErrInvalidFeedCursor", err)
	}
}
