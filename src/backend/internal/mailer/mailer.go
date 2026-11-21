package mailer

import (
	"crypto/tls"
	"errors"
	"fmt"
	"log"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"
)

// smtpTimeout limita la duración total de una entrega SMTP para que un
// servidor lento o caído no bloquee la petición indefinidamente.
const smtpTimeout = 30 * time.Second

// Mailer envía correos de texto plano.
type Mailer interface {
	Send(to, subject, body string) error
}

// SMTPMailer envía correos mediante un servidor SMTP que exige STARTTLS
// (p. ej. smtp-relay.brevo.com en el puerto 587 o 2525). Si el servidor no
// anuncia STARTTLS el envío falla: las credenciales nunca viajan en claro.
type SMTPMailer struct {
	host     string
	port     string
	username string
	password string
	from     string

	// tlsConfig solo se usa en pruebas para confiar en una CA propia.
	// ServerName y MinVersion se fuerzan siempre en tlsConfigFor.
	tlsConfig *tls.Config
}

func NewSMTPMailer(
	host string,
	port string,
	username string,
	password string,
	from string,
) *SMTPMailer {
	return &SMTPMailer{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
	}
}

func (m *SMTPMailer) Send(to, subject, body string) error {
	if strings.ContainsAny(to, "\r\n") {
		return errors.New("destinatario inválido")
	}

	message := strings.Join([]string{
		"From: " + m.from,
		"To: " + to,
		"Subject: " + mime.QEncoding.Encode("utf-8", subject),
		"Date: " + time.Now().Format(time.RFC1123Z),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		body,
	}, "\r\n")

	if err := m.deliver(extractAddress(m.from), to, []byte(message)); err != nil {
		return fmt.Errorf("error enviando correo: %w", err)
	}

	return nil
}

// deliver abre la conexión SMTP, exige STARTTLS, se autentica sobre TLS y
// envía el mensaje con MAIL/RCPT/DATA.
func (m *SMTPMailer) deliver(from, to string, message []byte) error {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(m.host, m.port), smtpTimeout)
	if err != nil {
		return fmt.Errorf("conexión SMTP: %w", err)
	}
	if err := conn.SetDeadline(time.Now().Add(smtpTimeout)); err != nil {
		conn.Close()
		return fmt.Errorf("conexión SMTP: %w", err)
	}

	client, err := smtp.NewClient(conn, m.host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("conexión SMTP: %w", err)
	}
	// Tras un Quit correcto Close devuelve error; ya no importa.
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); !ok {
		return errors.New("el servidor SMTP no admite STARTTLS")
	}
	if err := client.StartTLS(m.tlsConfigFor()); err != nil {
		return fmt.Errorf("STARTTLS: %w", err)
	}

	if m.username != "" {
		if ok, _ := client.Extension("AUTH"); !ok {
			return errors.New("el servidor SMTP no admite AUTH")
		}
		auth := smtp.PlainAuth("", m.username, m.password, m.host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("autenticación SMTP: %w", err)
		}
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("MAIL FROM: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("RCPT TO: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("DATA: %w", err)
	}
	if _, err := w.Write(message); err != nil {
		w.Close()
		return fmt.Errorf("DATA: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("DATA: %w", err)
	}

	if err := client.Quit(); err != nil {
		return fmt.Errorf("QUIT: %w", err)
	}

	return nil
}

func (m *SMTPMailer) tlsConfigFor() *tls.Config {
	cfg := &tls.Config{}
	if m.tlsConfig != nil {
		cfg = m.tlsConfig.Clone()
	}
	cfg.ServerName = m.host
	cfg.MinVersion = tls.VersionTLS12
	cfg.InsecureSkipVerify = false

	return cfg
}

// extractAddress devuelve la dirección de "Gymify <no-reply@gymify.app>".
func extractAddress(from string) string {
	start := strings.LastIndex(from, "<")
	end := strings.LastIndex(from, ">")

	if start != -1 && end > start {
		return from[start+1 : end]
	}

	return from
}

// DisabledMailer se usa cuando la recuperación de contraseña está desactivada.
// Nunca debería llamarse; si ocurre, falla en vez de imprimir el correo (y su
// código) en el log de producción.
type DisabledMailer struct{}

func NewDisabledMailer() *DisabledMailer {
	return &DisabledMailer{}
}

func (m *DisabledMailer) Send(to, subject, body string) error {
	return errors.New("el envío de correos está desactivado")
}

// LogMailer imprime los correos en el log en lugar de enviarlos.
// SOLO para desarrollo local, cuando no hay SMTP configurado.
type LogMailer struct{}

func NewLogMailer() *LogMailer {
	return &LogMailer{}
}

func (m *LogMailer) Send(to, subject, body string) error {
	log.Printf(
		"[mailer:dev] Para: %s | Asunto: %s\n%s",
		to,
		subject,
		body,
	)

	return nil
}
