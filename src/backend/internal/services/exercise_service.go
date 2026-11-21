package services

import (
	"errors"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
)

type ExerciseService struct {
	exerciseRepository *repository.ExerciseRepository
}

func NewExerciseService(
	exerciseRepository *repository.ExerciseRepository,
) *ExerciseService {
	return &ExerciseService{
		exerciseRepository: exerciseRepository,
	}
}

var (
	ErrExerciseNotFound  = errors.New("ejercicio no encontrado")
	ErrExerciseDuplicate = errors.New("ya tienes un ejercicio con ese nombre")
)

const (
	minCustomExerciseName = 2
	maxCustomExerciseName = 60
	// Límite para que nadie llene la base de datos de ejercicios.
	MaxCustomExercises = 100
)

// Igual que chk_muscle_group en la tabla exercises.
var validMuscleGroups = map[string]bool{
	"chest":     true,
	"back":      true,
	"legs":      true,
	"shoulders": true,
	"arms":      true,
	"core":      true,
	"full_body": true,
	"cardio":    true,
}

func (s *ExerciseService) GetExercises(userID string) ([]models.Exercise, error) {
	return s.exerciseRepository.FindAll(userID)
}

// CreateCustomExercise crea un ejercicio que solo verá userID.
func (s *ExerciseService) CreateCustomExercise(
	userID string,
	name string,
	muscleGroup string,
) (*models.Exercise, error) {
	// Espacios repetidos fuera: "Hip  Thrust" y "Hip Thrust" son el mismo.
	name = strings.Join(strings.Fields(name), " ")

	length := utf8.RuneCountInString(name)
	if length < minCustomExerciseName {
		return nil, errors.New("el nombre del ejercicio es muy corto")
	}

	if length > maxCustomExerciseName {
		return nil, fmt.Errorf(
			"el nombre del ejercicio no puede superar los %d caracteres",
			maxCustomExerciseName,
		)
	}

	if strings.ContainsFunc(name, unicode.IsControl) {
		return nil, errors.New("el nombre del ejercicio no es válido")
	}

	if !validMuscleGroups[muscleGroup] {
		return nil, errors.New("elige un grupo muscular válido")
	}

	catalogName, err := s.exerciseRepository.FindCatalogName(name)
	if err != nil {
		return nil, err
	}

	if catalogName != "" {
		return nil, fmt.Errorf(
			"%q ya está en la lista de ejercicios; búscalo ahí",
			catalogName,
		)
	}

	count, err := s.exerciseRepository.CountCustom(userID)
	if err != nil {
		return nil, err
	}

	if count >= MaxCustomExercises {
		return nil, fmt.Errorf(
			"puedes tener hasta %d ejercicios propios",
			MaxCustomExercises,
		)
	}

	exercise, err := s.exerciseRepository.CreateCustom(userID, name, muscleGroup)
	if err != nil {
		return nil, err
	}

	if exercise == nil {
		return nil, ErrExerciseDuplicate
	}

	return exercise, nil
}

func (s *ExerciseService) DeleteCustomExercise(exerciseID, userID string) error {
	deleted, err := s.exerciseRepository.DeactivateCustom(exerciseID, userID)
	if err != nil {
		return err
	}

	if !deleted {
		return ErrExerciseNotFound
	}

	return nil
}
