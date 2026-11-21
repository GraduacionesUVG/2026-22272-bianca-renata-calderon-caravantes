package models

import "time"

type ChallengeStatus string

const (
	ChallengeUpcoming  ChallengeStatus = "upcoming"
	ChallengeActive    ChallengeStatus = "active"
	ChallengeCompleted ChallengeStatus = "completed"
)

type Challenge struct {
	ID          string          `json:"id"`
	Title       string          `json:"title"`
	Description *string         `json:"description,omitempty"`
	Goal        int             `json:"goal"`
	XPReward    int             `json:"xp_reward"`
	Status      ChallengeStatus `json:"status"`
	StartDate   time.Time       `json:"start_date"`
	EndDate     time.Time       `json:"end_date"`

	// Estado del usuario autenticado
	Joined    bool `json:"joined"`
	Progress  int  `json:"progress"`
	Completed bool `json:"completed"`
}

type ChallengeParticipant struct {
	ID          string    `json:"id"`
	ChallengeID string    `json:"challenge_id"`
	UserID      string    `json:"user_id"`
	Progress    int       `json:"progress"`
	Completed   bool      `json:"completed"`
	JoinedAt    time.Time `json:"joined_at"`
}
