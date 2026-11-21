package models

import "time"

type Comment struct {
	ID        string    `json:"id"`
	PostID    string    `json:"post_id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	FullName  string    `json:"full_name"`
	Content   string    `json:"content"`
	Edited    bool      `json:"edited"`
	CreatedAt time.Time `json:"created_at"`
}
