// Cliente de pruebas de carga para la API de Gymify. Solo usa la biblioteca estándar.
//
// Modelo: usuarios virtuales (VU) en lazo cerrado. Cada VU repite
// "elegir acción -> petición -> pausa de think". Una escena mezcla lecturas (feed,
// estadísticas, racha, retos, ranking...) y escrituras (registrar un entrenamiento).
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type action struct {
	name   string
	weight int
	do     func(c *http.Client, base, token string, rnd *rand.Rand, ex string) (int, error)
}

// checkBase rechaza cualquier servidor que no sea local: la prueba registra
// cientos de cuentas y entrenamientos, y no debe dispararse por error contra
// producción. -allow-remote la desactiva para un entorno de pruebas autorizado.
func checkBase(base string, allowRemote bool) error {
	u, err := url.Parse(base)
	if err != nil || u.Hostname() == "" {
		return fmt.Errorf("-base no es una URL válida: %q", base)
	}

	switch u.Hostname() {
	case "localhost", "127.0.0.1", "::1":
		return nil
	}

	if allowRemote {
		fmt.Fprintf(os.Stderr, "aviso: se enviarán cientos de registros a %s\n", u.Host)
		return nil
	}

	return fmt.Errorf(
		"%s no es un servidor local (localhost o 127.0.0.1). "+
			"La prueba crea cuentas y entrenamientos de prueba; si es un entorno "+
			"de pruebas autorizado, agrega -allow-remote",
		u.Host,
	)
}

func req(c *http.Client, method, url, token string, body []byte) (int, error) {
	var rd io.Reader
	if body != nil {
		rd = bytes.NewReader(body)
	}
	r, err := http.NewRequest(method, url, rd)
	if err != nil {
		return 0, err
	}
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	if body != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.Do(r)
	if err != nil {
		return 0, err
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	return resp.StatusCode, nil
}

func get(path string) func(*http.Client, string, string, *rand.Rand, string) (int, error) {
	return func(c *http.Client, base, token string, _ *rand.Rand, _ string) (int, error) {
		return req(c, "GET", base+path, token, nil)
	}
}

func postWorkout(c *http.Client, base, token string, rnd *rand.Rand, ex string) (int, error) {
	body, _ := json.Marshal(map[string]any{
		"title":            "Prueba de carga",
		"duration_minutes": 30 + rnd.Intn(40),
		"is_public":        true,
		"exercises": []map[string]any{
			{"exercise_id": ex, "sets": 3, "reps": 10, "weight": 20 + rnd.Intn(60), "order_number": 1},
		},
	})
	return req(c, "POST", base+"/api/v1/workouts", token, body)
}

var actions = []action{
	{"GET /posts (feed)", 25, get("/api/v1/posts")},
	{"GET /users/stats", 15, get("/api/v1/users/stats")},
	{"GET /users/streak", 10, get("/api/v1/users/streak")},
	{"GET /workouts", 10, get("/api/v1/workouts")},
	{"GET /challenges", 10, get("/api/v1/challenges")},
	{"GET /rankings", 10, get("/api/v1/rankings")},
	{"GET /notifications/unread-count", 10, get("/api/v1/notifications/unread-count")},
	{"POST /workouts", 10, postWorkout},
}

func pick(rnd *rand.Rand) *action {
	total := 0
	for _, a := range actions {
		total += a.weight
	}
	n := rnd.Intn(total)
	for i := range actions {
		if n < actions[i].weight {
			return &actions[i]
		}
		n -= actions[i].weight
	}
	return &actions[0]
}

type sample struct {
	at     time.Time
	dur    time.Duration
	status int
	err    bool
	name   string
}

func newClient(conns int) *http.Client {
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        conns + 10,
			MaxIdleConnsPerHost: conns + 10,
			MaxConnsPerHost:     0,
			IdleConnTimeout:     90 * time.Second,
		},
	}
}

// ---- medición de proceso (CPU y memoria del servidor) ----

func procCPUTicks(pid int) (uint64, bool) {
	b, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	if err != nil {
		return 0, false
	}
	s := string(b)
	s = s[strings.LastIndex(s, ")")+2:]
	f := strings.Fields(s)
	u, _ := strconv.ParseUint(f[11], 10, 64)
	k, _ := strconv.ParseUint(f[12], 10, 64)
	return u + k, true
}

func procRSSMB(pid int) float64 {
	b, err := os.ReadFile(fmt.Sprintf("/proc/%d/status", pid))
	if err != nil {
		return 0
	}
	for _, l := range strings.Split(string(b), "\n") {
		if strings.HasPrefix(l, "VmRSS:") {
			f := strings.Fields(l)
			kb, _ := strconv.ParseFloat(f[1], 64)
			return kb / 1024
		}
	}
	return 0
}

// ---- resultados ----

type stageResult struct {
	Label     string                `json:"label"`
	VUs       int                   `json:"vus"`
	ThinkMs   int                   `json:"think_ms"`
	Seconds   float64               `json:"seconds"`
	Requests  int                   `json:"requests"`
	ReqPerSec float64               `json:"req_per_sec"`
	P50       float64               `json:"p50_ms"`
	P95       float64               `json:"p95_ms"`
	P99       float64               `json:"p99_ms"`
	Max       float64               `json:"max_ms"`
	ErrorPct  float64               `json:"error_pct"`
	Statuses  map[string]int        `json:"statuses"`
	CPUPct    float64               `json:"server_cpu_pct_of_1core"`
	RSSMB     float64               `json:"server_rss_mb"`
	PerAction map[string]actionStat `json:"per_action,omitempty"`
}

type actionStat struct {
	N   int     `json:"n"`
	P50 float64 `json:"p50_ms"`
	P95 float64 `json:"p95_ms"`
}

func pct(sorted []time.Duration, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	i := int(float64(len(sorted)-1) * p)
	return float64(sorted[i].Microseconds()) / 1000
}

func runStage(label string, base string, tokens []string, ex string, vus int, think time.Duration, ramp, measure time.Duration, pid int) stageResult {
	client := newClient(vus)
	var mu sync.Mutex
	var all []sample
	stop := make(chan struct{})
	var wg sync.WaitGroup
	start := time.Now()
	mStart := start.Add(ramp)
	mEnd := mStart.Add(measure)

	for i := 0; i < vus; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			rnd := rand.New(rand.NewSource(int64(i)*7919 + time.Now().UnixNano()))
			token := tokens[i%len(tokens)]
			// arranque escalonado durante la rampa
			time.Sleep(time.Duration(rnd.Int63n(int64(ramp))))
			var local []sample
			for {
				select {
				case <-stop:
					mu.Lock()
					all = append(all, local...)
					mu.Unlock()
					return
				default:
				}
				a := pick(rnd)
				t0 := time.Now()
				code, err := a.do(client, base, token, rnd, ex)
				d := time.Since(t0)
				if t0.After(mStart) && t0.Before(mEnd) {
					local = append(local, sample{at: t0, dur: d, status: code, err: err != nil || code >= 400 || code == 0, name: a.name})
				}
				if think > 0 {
					time.Sleep(think/2 + time.Duration(rnd.Int63n(int64(think))))
				}
			}
		}(i)
	}

	// muestreo de CPU/RAM del servidor durante la ventana de medición
	var cpuStart uint64
	var tStart time.Time
	var rss float64
	time.Sleep(time.Until(mStart))
	if pid > 0 {
		cpuStart, _ = procCPUTicks(pid)
		tStart = time.Now()
	}
	for time.Now().Before(mEnd) {
		time.Sleep(time.Second)
		if pid > 0 {
			if r := procRSSMB(pid); r > rss {
				rss = r
			}
		}
	}
	var cpuPct float64
	if pid > 0 {
		cpuEnd, _ := procCPUTicks(pid)
		cpuPct = float64(cpuEnd-cpuStart) / 100 / time.Since(tStart).Seconds() * 100
	}
	close(stop)
	wg.Wait()
	client.CloseIdleConnections()

	res := stageResult{Label: label, VUs: vus, ThinkMs: int(think / time.Millisecond), Seconds: measure.Seconds(),
		Statuses: map[string]int{}, CPUPct: cpuPct, RSSMB: rss, PerAction: map[string]actionStat{}}
	durs := make([]time.Duration, 0, len(all))
	by := map[string][]time.Duration{}
	errs := 0
	for _, s := range all {
		durs = append(durs, s.dur)
		by[s.name] = append(by[s.name], s.dur)
		key := strconv.Itoa(s.status)
		if s.status == 0 {
			key = "error de red/timeout"
		}
		res.Statuses[key]++
		if s.err {
			errs++
		}
	}
	sort.Slice(durs, func(i, j int) bool { return durs[i] < durs[j] })
	res.Requests = len(all)
	res.ReqPerSec = float64(len(all)) / measure.Seconds()
	res.P50, res.P95, res.P99 = pct(durs, .50), pct(durs, .95), pct(durs, .99)
	if len(durs) > 0 {
		res.Max = float64(durs[len(durs)-1].Microseconds()) / 1000
		res.ErrorPct = float64(errs) / float64(len(all)) * 100
	}
	for k, v := range by {
		sort.Slice(v, func(i, j int) bool { return v[i] < v[j] })
		res.PerAction[k] = actionStat{N: len(v), P50: pct(v, .5), P95: pct(v, .95)}
	}
	return res
}

// ---- preparación: registro y login ----

type authResp struct {
	Token string `json:"token"`
}

func setup(base string, n int, runID string) ([]string, string, error) {
	client := newClient(16)
	tokens := make([]string, n)
	var failed int32
	sem := make(chan struct{}, 16)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		sem <- struct{}{}
		go func(i int) {
			defer wg.Done()
			defer func() { <-sem }()
			user := fmt.Sprintf("lt%s_%d", runID, i)
			email := user + "@loadtest.local"
			body, _ := json.Marshal(map[string]string{"username": user, "full_name": "Carga " + user, "email": email, "password": "LoadTest123"})
			if code, err := req(client, "POST", base+"/api/v1/auth/register", "", body); err != nil || code >= 300 {
				atomic.AddInt32(&failed, 1)
				return
			}
			lb, _ := json.Marshal(map[string]string{"email": email, "password": "LoadTest123"})
			r, _ := http.NewRequest("POST", base+"/api/v1/auth/login", bytes.NewReader(lb))
			r.Header.Set("Content-Type", "application/json")
			resp, err := client.Do(r)
			if err != nil {
				atomic.AddInt32(&failed, 1)
				return
			}
			var ar authResp
			json.NewDecoder(resp.Body).Decode(&ar)
			resp.Body.Close()
			if ar.Token == "" {
				atomic.AddInt32(&failed, 1)
				return
			}
			tokens[i] = ar.Token
		}(i)
	}
	wg.Wait()
	if failed > 0 {
		return nil, "", fmt.Errorf("%d usuarios fallaron en el registro/login", failed)
	}
	// un ejercicio del catálogo
	r, _ := http.NewRequest("GET", base+"/api/v1/exercises", nil)
	r.Header.Set("Authorization", "Bearer "+tokens[0])
	resp, err := client.Do(r)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	var list []map[string]any
	raw, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(raw, &list); err != nil {
		var wrap struct {
			Exercises []map[string]any `json:"exercises"`
		}
		if err2 := json.Unmarshal(raw, &wrap); err2 != nil {
			return nil, "", fmt.Errorf("respuesta de /exercises no reconocida: %.200s", raw)
		}
		list = wrap.Exercises
	}
	for _, e := range list {
		if id, ok := e["id"].(string); ok && id != "" {
			return tokens, id, nil
		}
	}
	return nil, "", fmt.Errorf("sin ejercicios en el catálogo")
}

func runLogin(base string, conc int, dur time.Duration, runID string, n int) stageResult {
	client := newClient(conc)
	var mu sync.Mutex
	var durs []time.Duration
	errs := 0
	stop := time.Now().Add(dur)
	var wg sync.WaitGroup
	for i := 0; i < conc; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			rnd := rand.New(rand.NewSource(int64(i) + time.Now().UnixNano()))
			for time.Now().Before(stop) {
				email := fmt.Sprintf("lt%s_%d@loadtest.local", runID, rnd.Intn(n))
				lb, _ := json.Marshal(map[string]string{"email": email, "password": "LoadTest123"})
				t0 := time.Now()
				code, err := req(client, "POST", base+"/api/v1/auth/login", "", lb)
				d := time.Since(t0)
				mu.Lock()
				durs = append(durs, d)
				if err != nil || code != 200 {
					errs++
				}
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	sort.Slice(durs, func(i, j int) bool { return durs[i] < durs[j] })
	r := stageResult{Label: "login", VUs: conc, Seconds: dur.Seconds(), Requests: len(durs), ReqPerSec: float64(len(durs)) / dur.Seconds(),
		P50: pct(durs, .5), P95: pct(durs, .95), P99: pct(durs, .99), Statuses: map[string]int{}}
	if len(durs) > 0 {
		r.Max = float64(durs[len(durs)-1].Microseconds()) / 1000
		r.ErrorPct = float64(errs) / float64(len(durs)) * 100
	}
	return r
}

func main() {
	base := flag.String("base", "http://127.0.0.1:8099", "URL base del servidor")
	users := flag.Int("users", 500, "usuarios de prueba a crear")
	vuList := flag.String("vus", "25,50,100,200,400,800", "etapas de usuarios virtuales con pausa")
	peakList := flag.String("peak", "8,32,128", "etapas sin pausa (rendimiento máximo)")
	loginList := flag.String("login", "1,10,50", "concurrencias para la prueba de login")
	measure := flag.Duration("measure", 30*time.Second, "ventana de medición por etapa")
	ramp := flag.Duration("ramp", 5*time.Second, "rampa de subida por etapa")
	pid := flag.Int("pid", 0, "PID del servidor (para CPU y memoria)")
	out := flag.String("out", "resultados.json", "archivo de salida")
	only := flag.String("only", "", "ejecutar solo: think, peak o login (vacío = todo)")
	allowRemote := flag.Bool("allow-remote", false,
		"permite apuntar a un servidor que no sea local; solo para un entorno de pruebas autorizado")
	flag.Parse()

	if err := checkBase(*base, *allowRemote); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}

	runID := strconv.FormatInt(time.Now().Unix()%1000000, 36)
	fmt.Printf("Preparando %d usuarios de prueba...\n", *users)
	t0 := time.Now()
	tokens, ex, err := setup(*base, *users, runID)
	if err != nil {
		fmt.Println("ERROR en la preparación:", err)
		os.Exit(1)
	}
	fmt.Printf("Listo en %.1f s (registro + login de %d usuarios)\n\n", time.Since(t0).Seconds(), *users)

	var results []stageResult
	show := func(r stageResult) {
		fmt.Printf("%-16s VU=%-4d %7.1f req/s  p50=%6.1f  p95=%7.1f  p99=%7.1f  máx=%7.1f ms  err=%5.2f%%  CPU=%5.1f%%  RAM=%5.1f MB  %v\n",
			r.Label, r.VUs, r.ReqPerSec, r.P50, r.P95, r.P99, r.Max, r.ErrorPct, r.CPUPct, r.RSSMB, r.Statuses)
		results = append(results, r)
		b, _ := json.MarshalIndent(results, "", "  ")
		os.WriteFile(*out, b, 0o644)
	}
	ints := func(s string) []int {
		var v []int
		for _, p := range strings.Split(s, ",") {
			if n, err := strconv.Atoi(strings.TrimSpace(p)); err == nil {
				v = append(v, n)
			}
		}
		return v
	}

	if *only == "" || *only == "think" {
		for _, n := range ints(*vuList) {
			show(runStage("con pausa", *base, tokens, ex, n, time.Second, *ramp, *measure, *pid))
			time.Sleep(3 * time.Second)
		}
	}
	if *only == "" || *only == "peak" {
		for _, n := range ints(*peakList) {
			show(runStage("sin pausa", *base, tokens, ex, n, 0, 2*time.Second, *measure, *pid))
			time.Sleep(3 * time.Second)
		}
	}
	if *only == "" || *only == "login" {
		for _, n := range ints(*loginList) {
			show(runLogin(*base, n, 15*time.Second, runID, *users))
			time.Sleep(2 * time.Second)
		}
	}
	fmt.Println("\nResultados guardados en", *out)
}
