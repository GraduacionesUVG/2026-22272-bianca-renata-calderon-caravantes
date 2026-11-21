package models

// PublicProfile es la vista de un usuario que pueden ver otros usuarios.
// No incluye email, password_hash ni role.
type PublicProfile struct {
	ID             string  `json:"id"`
	Username       string  `json:"username"`
	FullName       string  `json:"full_name"`
	Bio            *string `json:"bio"`
	ProfilePicture *string `json:"profile_picture"`
	Level          int     `json:"level"`
	XP             int     `json:"xp"`
	Streak         int     `json:"streak"`
	FollowersCount int     `json:"followers_count"`
	FollowingCount int     `json:"following_count"`
	IsFollowing    bool    `json:"is_following"`
	IsMe           bool    `json:"is_me"`
}

// FollowUser es un elemento de las listas de seguidores y seguidos.
type FollowUser struct {
	ID             string  `json:"id"`
	Username       string  `json:"username"`
	FullName       string  `json:"full_name"`
	ProfilePicture *string `json:"profile_picture"`
	Level          int     `json:"level"`
}
