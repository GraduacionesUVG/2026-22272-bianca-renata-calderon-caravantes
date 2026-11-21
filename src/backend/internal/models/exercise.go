package models

import "time"

type Exercise struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"is_active"`
	MuscleGroup string  `json:"muscle_group"`
	Equipment   *string `json:"equipment,omitempty"`
	Difficulty  string  `json:"difficulty"`

	// MET del cardio, para estimar calorías (MET × peso × horas).
	Met *float64 `json:"met,omitempty"`

	// Imagen de wger.de; la licencia exige mostrar autor y licencia.
	ImageURL        *string `json:"image_url"`
	ImageAuthor     *string `json:"image_author"`
	ImageLicense    *string `json:"image_license"`
	ImageLicenseURL *string `json:"image_license_url"`
	ImageSourceURL  *string `json:"image_source_url"`

	// Ejercicio creado por el propio usuario (solo lo ve él).
	IsCustom bool `json:"is_custom"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
