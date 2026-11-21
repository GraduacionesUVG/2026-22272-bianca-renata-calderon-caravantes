package mailer

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"math/big"
	"net"
	"net/textproto"
	"strings"
	"testing"
	"time"
)

// fakeResult resume lo que vio el servidor SMTP falso durante una sesión.
type fakeResult struct {
	commands    []string // verbos recibidos, en orden
	tlsActive   bool     // si la sesión terminó sobre TLS
	authOverTLS bool     // si AUTH llegó después de STARTTLS
	data        string
}

type fakeServer struct {
	ln            net.Listener
	tlsConfig     *tls.Config
	offerSTARTTLS bool
	result        chan fakeResult
}

func newFakeServer(t *testing.T, cert tls.Certificate, offerSTARTTLS bool) *fakeServer {
	t.Helper()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	t.Cleanup(func() { ln.Close() })

	s := &fakeServer{
		ln:            ln,
		tlsConfig:     &tls.Config{Certificates: []tls.Certificate{cert}},
		offerSTARTTLS: offerSTARTTLS,
		result:        make(chan fakeResult, 1),
	}
	go s.serveOne()

	return s
}

func (s *fakeServer) serveOne() {
	var res fakeResult
	defer func() { s.result <- res }()

	conn, err := s.ln.Accept()
	if err != nil {
		return
	}
	defer func() { conn.Close() }()
	conn.SetDeadline(time.Now().Add(10 * time.Second))

	tp := textproto.NewConn(conn)
	tp.PrintfLine("220 fake ESMTP")

	for {
		line, err := tp.ReadLine()
		if err != nil {
			return
		}
		verb := strings.ToUpper(strings.Fields(line + " ")[0])
		res.commands = append(res.commands, verb)

		switch verb {
		case "EHLO":
			exts := []string{"fake"}
			if s.offerSTARTTLS && !res.tlsActive {
				exts = append(exts, "STARTTLS")
			}
			// Se anuncia AUTH también antes de TLS para comprobar que el
			// cliente no la usa en claro.
			exts = append(exts, "AUTH PLAIN")
			for i, ext := range exts {
				sep := "-"
				if i == len(exts)-1 {
					sep = " "
				}
				tp.PrintfLine("250%s%s", sep, ext)
			}
		case "STARTTLS":
			tp.PrintfLine("220 listo para TLS")
			tlsConn := tls.Server(conn, s.tlsConfig)
			if err := tlsConn.Handshake(); err != nil {
				return
			}
			conn = tlsConn
			tp = textproto.NewConn(tlsConn)
			res.tlsActive = true
		case "AUTH":
			res.authOverTLS = res.tlsActive
			tp.PrintfLine("235 autenticado")
		case "MAIL", "RCPT":
			tp.PrintfLine("250 ok")
		case "DATA":
			tp.PrintfLine("354 adelante")
			data, err := tp.ReadDotBytes()
			if err != nil {
				return
			}
			res.data = string(data)
			tp.PrintfLine("250 aceptado")
		case "QUIT":
			tp.PrintfLine("221 adiós")
			return
		default:
			tp.PrintfLine("502 no implementado")
		}
	}
}

func (s *fakeServer) wait(t *testing.T) fakeResult {
	t.Helper()

	select {
	case res := <-s.result:
		return res
	case <-time.After(10 * time.Second):
		t.Fatal("el servidor SMTP falso no terminó")
		return fakeResult{}
	}
}

// selfSignedCert genera un certificado para 127.0.0.1 y un pool que confía en él.
func selfSignedCert(t *testing.T) (tls.Certificate, *x509.CertPool) {
	t.Helper()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("clave: %v", err)
	}
	tmpl := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "gymify-test"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("certificado: %v", err)
	}
	parsed, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatalf("certificado: %v", err)
	}

	pool := x509.NewCertPool()
	pool.AddCert(parsed)

	return tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key}, pool
}

func newTestMailer(t *testing.T, s *fakeServer, roots *x509.CertPool) *SMTPMailer {
	t.Helper()

	_, port, err := net.SplitHostPort(s.ln.Addr().String())
	if err != nil {
		t.Fatalf("addr: %v", err)
	}
	m := NewSMTPMailer("127.0.0.1", port, "user", "secret", "Gymify <no-reply@gymify.app>")
	if roots != nil {
		m.tlsConfig = &tls.Config{RootCAs: roots}
	}

	return m
}

func contains(list []string, verb string) bool {
	for _, v := range list {
		if v == verb {
			return true
		}
	}
	return false
}

func TestSMTPMailerSendsOverSTARTTLS(t *testing.T) {
	cert, roots := selfSignedCert(t)
	s := newFakeServer(t, cert, true)
	m := newTestMailer(t, s, roots)

	if err := m.Send("ana@example.com", "Código de recuperación", "Tu código es 123456"); err != nil {
		t.Fatalf("Send: %v", err)
	}

	res := s.wait(t)
	if !res.tlsActive {
		t.Fatal("la sesión no se negoció sobre TLS")
	}
	if !res.authOverTLS {
		t.Fatal("AUTH se envió antes de STARTTLS")
	}
	want := []string{"EHLO", "STARTTLS", "EHLO", "AUTH", "MAIL", "RCPT", "DATA", "QUIT"}
	if strings.Join(res.commands, ",") != strings.Join(want, ",") {
		t.Fatalf("comandos = %v, se esperaba %v", res.commands, want)
	}
	if !strings.Contains(res.data, "To: ana@example.com") ||
		!strings.Contains(res.data, "Tu código es 123456") {
		t.Fatalf("mensaje inesperado:\n%s", res.data)
	}
}

func TestSMTPMailerRequiresSTARTTLS(t *testing.T) {
	cert, roots := selfSignedCert(t)
	s := newFakeServer(t, cert, false)
	m := newTestMailer(t, s, roots)

	err := m.Send("ana@example.com", "asunto", "cuerpo")
	if err == nil || !strings.Contains(err.Error(), "STARTTLS") {
		t.Fatalf("se esperaba error por falta de STARTTLS, got %v", err)
	}

	res := s.wait(t)
	for _, verb := range []string{"AUTH", "MAIL", "DATA"} {
		if contains(res.commands, verb) {
			t.Fatalf("se envió %s sin TLS: %v", verb, res.commands)
		}
	}
}

func TestSMTPMailerVerifiesCertificate(t *testing.T) {
	cert, _ := selfSignedCert(t)
	s := newFakeServer(t, cert, true)
	m := newTestMailer(t, s, nil) // sin CA de prueba: raíces del sistema

	if err := m.Send("ana@example.com", "asunto", "cuerpo"); err == nil {
		t.Fatal("se esperaba error de verificación del certificado")
	}

	res := s.wait(t)
	if contains(res.commands, "AUTH") {
		t.Fatalf("se envió AUTH con un certificado no válido: %v", res.commands)
	}
}

func TestSMTPMailerRejectsOldTLS(t *testing.T) {
	cert, roots := selfSignedCert(t)
	s := newFakeServer(t, cert, true)
	s.tlsConfig.MaxVersion = tls.VersionTLS11
	m := newTestMailer(t, s, roots)

	if err := m.Send("ana@example.com", "asunto", "cuerpo"); err == nil {
		t.Fatal("se esperaba error con TLS < 1.2")
	}

	res := s.wait(t)
	if contains(res.commands, "AUTH") {
		t.Fatalf("se envió AUTH sobre TLS < 1.2: %v", res.commands)
	}
}

func TestSMTPMailerRejectsHeaderInjection(t *testing.T) {
	m := NewSMTPMailer("127.0.0.1", "1", "", "", "no-reply@gymify.app")

	if err := m.Send("ana@example.com\r\nBcc: x@example.com", "asunto", "cuerpo"); err == nil {
		t.Fatal("se esperaba error por destinatario inválido")
	}
}

func TestTLSConfigCannotBeWeakened(t *testing.T) {
	m := NewSMTPMailer("smtp-relay.brevo.com", "2525", "", "", "no-reply@gymify.app")
	m.tlsConfig = &tls.Config{InsecureSkipVerify: true, MinVersion: tls.VersionTLS10}

	cfg := m.tlsConfigFor()
	if cfg.ServerName != "smtp-relay.brevo.com" || cfg.MinVersion != tls.VersionTLS12 || cfg.InsecureSkipVerify {
		t.Fatalf("configuración TLS insegura: %+v", cfg)
	}
}
