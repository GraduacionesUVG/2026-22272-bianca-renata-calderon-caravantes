package models

// RankingEntry representa la posición de un usuario dentro del ranking.
type RankingEntry struct {
	Position int    `json:"position"`
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	FullName string `json:"full_name"`
	Level    int    `json:"level"`
	XP       int    `json:"xp"`
	Streak   int    `json:"streak"`
	IsMe     bool   `json:"is_me"`
}
