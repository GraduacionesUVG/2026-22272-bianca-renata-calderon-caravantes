package middleware

import (
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

// RateLimit limita cada IP a `limit` peticiones por ventana de tiempo.
// Los contadores viven en memoria, así que cada instancia del servidor
// lleva su propia cuenta.
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	var mu sync.Mutex
	entries := make(map[string]*rateLimitEntry)
	lastCleanup := time.Now()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}

			now := time.Now()

			mu.Lock()

			// Limpieza periódica de las IP cuya ventana ya terminó.
			if now.Sub(lastCleanup) > window {
				for key, entry := range entries {
					if now.After(entry.resetAt) {
						delete(entries, key)
					}
				}
				lastCleanup = now
			}

			entry, ok := entries[ip]
			if !ok || now.After(entry.resetAt) {
				entry = &rateLimitEntry{resetAt: now.Add(window)}
				entries[ip] = entry
			}

			entry.count++
			allowed := entry.count <= limit
			retryAfter := int(entry.resetAt.Sub(now).Seconds()) + 1

			mu.Unlock()

			if !allowed {
				w.Header().Set("Retry-After", fmt.Sprint(retryAfter))
				utils.JSON(w, http.StatusTooManyRequests, map[string]string{
					"error": "demasiadas solicitudes, inténtalo de nuevo en unos minutos",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
