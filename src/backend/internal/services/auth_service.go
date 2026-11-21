package services

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/mailer"
	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

const (
	resetCodeTTL         = 15 * time.Minute
	resetCodeMaxAttempts = 5
	resetCodeCooldown    = 60 * time.Second
	resetCodeMaxPerHour  = 5
)

var errInvalidResetCode = errors.New("código inválido o expirado")

type AuthService struct {
	userRepository          *repository.UserRepository
	passwordResetRepository *repository.PasswordResetRepository
	mailer                  mailer.Mailer
	jwtSecret               string
	passwordResetSecret     string
}

func NewAuthService(
	userRepository *repository.UserRepository,
	passwordResetRepository *repository.PasswordResetRepository,
	mailer mailer.Mailer,
	jwtSecret string,
	passwordResetSecret string,
) *AuthService {
	return &AuthService{
		userRepository:          userRepository,
		passwordResetRepository: passwordResetRepository,
		mailer:                  mailer,
		jwtSecret:               jwtSecret,
		passwordResetSecret:     passwordResetSecret,
	}
}

func (s *AuthService) Register(
	username string,
	fullName string,
	email string,
	password string,
) (*models.User, error) {
	username = strings.TrimSpace(username)
	fullName = strings.TrimSpace(fullName)
	email = strings.TrimSpace(strings.ToLower(email))

	if username == "" || fullName == "" || email == "" || password == "" {
		return nil, errors.New("todos los campos son obligatorios")
	}

	if len(username) < 3 {
		return nil, errors.New("el nombre de usuario debe tener al menos 3 caracteres")
	}

	if len(password) < 8 {
		return nil, errors.New("la contraseña debe tener al menos 8 caracteres")
	}

	existingUser, err := s.userRepository.FindByEmail(email)
	if err != nil {
		return nil, err
	}

	if existingUser != nil {
		return nil, repository.ErrEmailTaken
	}

	passwordHash, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Role:         "user",
		Username:     username,
		FullName:     fullName,
		Email:        email,
		PasswordHash: passwordHash,
	}

	if err := s.userRepository.Save(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *AuthService) Login(email, password string) (string, *models.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	if email == "" || password == "" {
		return "", nil, errors.New("correo y contraseña son obligatorios")
	}

	user, err := s.userRepository.FindByEmail(email)
	if err != nil {
		return "", nil, err
	}

	if user == nil {
		return "", nil, errors.New("credenciales inválidas")
	}

	if !utils.CheckPassword(password, user.PasswordHash) {
		return "", nil, errors.New("credenciales inválidas")
	}

	token, err := utils.GenerateToken(user.ID, s.jwtSecret)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

func (s *AuthService) ForgotPassword(email string) error {
	email = strings.TrimSpace(strings.ToLower(email))

	if email == "" {
		return errors.New("el correo es obligatorio")
	}

	user, err := s.userRepository.FindByEmail(email)
	if err != nil {
		return err
	}

	// No revelamos si el correo está registrado.
	if user == nil {
		return nil
	}

	code, err := generateResetCode()
	if err != nil {
		return err
	}

	resetToken := &models.PasswordResetToken{
		UserID:    user.ID,
		CodeHash:  s.hashResetCode(code),
		ExpiresAt: time.Now().Add(resetCodeTTL),
	}

	err = s.passwordResetRepository.CreateReplacingActive(
		resetToken,
		resetCodeCooldown,
		resetCodeMaxPerHour,
	)

	// Si el usuario superó el límite no enviamos otro correo, pero
	// respondemos igual para no revelar si el correo está registrado.
	if errors.Is(err, repository.ErrResetRateLimited) {
		return nil
	}

	if err != nil {
		return err
	}

	// El envío va en segundo plano para que el tiempo de respuesta no
	// delate si el correo está registrado.
	go func(to, name, userID string) {
		if err := s.mailer.Send(
			to,
			"Tu código de recuperación de Gymify",
			resetCodeEmailBody(name, code),
		); err != nil {
			log.Printf("error enviando código de recuperación al usuario %s: %v", userID, err)
		}
	}(user.Email, user.FullName, user.ID)

	return nil
}

func (s *AuthService) ResetPassword(
	email string,
	code string,
	newPassword string,
) error {
	email = strings.TrimSpace(strings.ToLower(email))
	code = strings.TrimSpace(code)

	if email == "" || code == "" || newPassword == "" {
		return errors.New("correo, código y nueva contraseña son obligatorios")
	}

	if len(newPassword) < 8 {
		return errors.New("la contraseña debe tener al menos 8 caracteres")
	}

	if !isResetCodeFormat(code) {
		return errInvalidResetCode
	}

	user, err := s.userRepository.FindByEmail(email)
	if err != nil {
		return err
	}

	if user == nil {
		return errInvalidResetCode
	}

	passwordHash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}

	updated, err := s.passwordResetRepository.ConsumeCodeAndUpdatePassword(
		user.ID,
		s.hashResetCode(code),
		passwordHash,
		resetCodeMaxAttempts,
	)
	if err != nil {
		return err
	}

	if !updated {
		return errInvalidResetCode
	}

	return nil
}

// generateResetCode devuelve un código aleatorio de 6 dígitos.
func generateResetCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%06d", n.Int64()), nil
}

func isResetCodeFormat(code string) bool {
	if len(code) != 6 {
		return false
	}

	for _, c := range code {
		if c < '0' || c > '9' {
			return false
		}
	}

	return true
}

// hashResetCode usa HMAC con un secreto propio del servidor: con solo 10^6 códigos
// posibles, un SHA-256 simple se podría revertir por fuerza bruta si se
// filtrara la base de datos.
func (s *AuthService) hashResetCode(code string) string {
	mac := hmac.New(sha256.New, []byte(s.passwordResetSecret))
	mac.Write([]byte(code))

	return hex.EncodeToString(mac.Sum(nil))
}

func resetCodeEmailBody(name, code string) string {
	return fmt.Sprintf(`Hola %s,

Tu código para restablecer la contraseña de Gymify es:

    %s

Caduca en %d minutos y solo puede usarse una vez.

Si no solicitaste este cambio, ignora este correo: tu contraseña no cambiará.

— El equipo de Gymify
`, name, code, int(resetCodeTTL.Minutes()))
}
