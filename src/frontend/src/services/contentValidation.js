/**
 * Utilidad para validación de contenido en publicaciones
 * Detecta lenguaje inapropiado para feedback inmediato
 */

const BAD_WORDS = [
  // Malas palabras comunes
  'mierda', 'puta', 'puto', 'cabrón', 'maldito', 'imbécil', 'idiota',
  'estúpido', 'tonto', 'asno', 'burro', 'cerdo', 'perro', 'rata',
  'bastardo', 'desgraciado', 'coño', 'verga', 'carajo', 'pendejo', 'pendeja',
  'boludo', 'boluda', 'pelotudo', 'choto', 'chamuyero', 'quilombo', 'chambo',

  // Abuso y discriminación
  'retrasado', 'retardado', 'minusválido',
  'negro', 'sudaca', 'mojado', 'gringo', 'indio', 'cholo', 'gitano',
  'terrorista', 'pedófilo', 'pederasta', 'violador',

  // Slurs
  'mariquita', 'marica', 'facha', 'nazi', 'fascista', 'comunista',
  'bolche', 'traidor', 'asqueroso',

  // Contenido peligroso
  'suicidio', 'matarme', 'matarte', 'matar', 'drogas', 'cocaína', 'heroína',
  'éxtasis', 'metanfetamina', 'fentanilo', 'cortarse', 'colgarse',

  // Spam
  'bitcoin', 'crypto', 'estafa', 'scam', 'dinero rápido', 'criptomoneda',
];

/**
 * Normaliza el texto para búsqueda de palabras inapropiadas
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto normalizado
 */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
};

/**
 * Valida si el contenido contiene palabras inapropiadas
 * @param {string} content - Contenido a validar
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validatePostContent = (content) => {
  if (!content || content.trim() === '') {
    return {
      isValid: true,
      message: '',
    };
  }

  const normalized = normalizeText(content);

  for (const badWord of BAD_WORDS) {
    // Usar regex con límites de palabra
    const regex = new RegExp(`\\b${badWord}\\b`, 'g');
    if (regex.test(normalized)) {
      return {
        isValid: false,
        message: 'El contenido contiene lenguaje inapropiado. Por favor, revísalo e intenta de nuevo.',
      };
    }
  }

  return {
    isValid: true,
    message: '',
  };
};
