package services

import (
	"regexp"
	"strings"
)

type ContentModerationService struct {
	badWords []string
}

func NewContentModerationService() *ContentModerationService {
	// Lista de palabras inapropiadas comunes en español
	badWords := []string{
		// Malas palabras comunes
		"mierda", "puta", "puto", "cabrón", "maldito", "imbécil", "idiota",
		"estúpido", "tonto", "asno", "burro", "cerdo", "perro", "rata",
		"bastardo", "desgraciado", "hijo de puta", "hijo de la gran puta",
		"coño", "verga", "carajo", "pendejo", "pendeja", "boludo", "boluda",
		"pelotudo", "boludo", "choto", "chamuyero", "quilombo", "chambo",
		"bolonqui", "bolonquis", "chamuyada", "patota", "quilombo",

		// Abuso y discriminación
		"retrasado", "retardado", "minusválido", "loco",
		"negro de mierda", "sudaca", "mojado", "gringo basura",
		"indio", "cholo", "gitano", "fanático", "terrorista",
		"pedófilo", "pederasta", "violador", "asesino",

		// Slurs y ofensas
		"mariquita", "marica", "facha", "nazi", "comunista hijo de puta",
		"bolche", "bolchevique", "fascista", "dictador",
		"rata", "traidor", "mugriento", "asqueroso",

		// Contenido violento o autolesivo
		"suicidio", "matarme", "matarte", "matar", "drogas", "cocaína", "heroína",
		"éxtasis", "metanfetamina", "droga", "fentanilo", "autolisis",
		"me voy a matar", "voy a matarte", "muérete", "colgarse", "cortarse",

		// Spam y estafas
		"bitcoin", "crypto", "estafa", "scam", "dinero rápido",
		"gana dinero", "criptomoneda", "nft", "blockchain estafa",

		// URLs y promoción
		"compra aquí", "click aquí", "enlace directo", "descarga gratis",
	}

	return &ContentModerationService{
		badWords: badWords,
	}
}

// ValidateContent verifica si el contenido contiene palabras inapropiadas
// Retorna (true, "") si el contenido es válido
// Retorna (false, "mensaje de error") si hay contenido inapropiado
func (s *ContentModerationService) ValidateContent(content string) (bool, string) {
	if content == "" {
		return true, ""
	}

	// Normalizar: convertir a minúsculas y remover caracteres especiales
	normalizedContent := s.normalizeText(content)

	// Buscar palabras inapropiadas
	for _, badWord := range s.badWords {
		if s.containsWord(normalizedContent, badWord) {
			return false, "El contenido contiene lenguaje inapropiado. Por favor, revísalo e intenta de nuevo."
		}
	}

	return true, ""
}

// normalizeText convierte el texto a minúsculas y lo prepara para búsqueda
func (s *ContentModerationService) normalizeText(text string) string {
	// Convertir a minúsculas
	text = strings.ToLower(text)

	// Remover acentos comunes (á, é, í, ó, ú -> a, e, i, o, u)
	replacer := strings.NewReplacer(
		"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u",
		"à", "a", "è", "e", "ì", "i", "ò", "o", "ù", "u",
	)
	text = replacer.Replace(text)

	return text
}

// containsWord verifica si una palabra está en el texto (con límites de palabra)
func (s *ContentModerationService) containsWord(text, word string) bool {
	// Usar regex para buscar la palabra con límites de palabra
	// \b marca un límite de palabra
	pattern := `\b` + regexp.QuoteMeta(word) + `\b`
	regex := regexp.MustCompile(pattern)
	return regex.MatchString(text)
}
