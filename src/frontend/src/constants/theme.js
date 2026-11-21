// Sistema de diseño de Gymify — estilo gamificado (inspirado en Duolingo)
// con tema claro y oscuro.
//
// - `colors` es un objeto "vivo": cada propiedad lee la paleta del tema activo,
//   así `colors.card` siempre devuelve el color correcto.
// - `themedStyles(() => ({...}))` reemplaza a `StyleSheet.create`: recalcula los
//   estilos al cambiar de tema y aplica el look "chunky" (bordes gruesos,
//   botones con relieve, barras de progreso gordas, tipografía más fuerte).
// - `ThemeProvider` / `useTheme()` guardan la preferencia (sistema/claro/oscuro).
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paleta "Brasa": tinta azul-noche (o papel cálido en claro) con UN solo
// acento coral. Los demás tonos son apagados y se usan solo para significado
// (éxito, error, XP); azul/violeta/verde-azulado comparten una misma familia
// índigo para que ninguna pestaña tenga "su" color.
const palettes = {
  dark: {
    background: '#0F1020',
    card: '#181A2E',
    card2: '#202340',
    border: '#2E3253',
    tabBar: '#131427',

    text: '#F3F1FA',
    textMuted: '#A09FC0',
    textDim: '#6C6B8F',

    accent: '#FF8F6B',
    accentDark: '#D96A47',
    accentSoft: '#3A2230',
    onAccent: '#1B1020',

    success: '#6FD6B0',
    successDark: '#46AA86',
    successSoft: '#163A39',

    blue: '#9A9CFF',
    blueDark: '#7274D6',
    blueSoft: '#25274A',

    gold: '#F5C978',
    goldDark: '#C99B4C',
    goldSoft: '#3A3020',

    red: '#F0788C',
    redDark: '#C75468',
    redSoft: '#40202D',

    purple: '#9A9CFF',
    purpleDark: '#7274D6',
    purpleSoft: '#25274A',

    teal: '#9A9CFF',
    tealDark: '#7274D6',
    tealSoft: '#25274A',

    xp: '#F5C978',
    overlay: 'rgba(8, 8, 20, 0.72)',
  },
  light: {
    background: '#FBF7F3',
    card: '#FFFFFF',
    card2: '#F5EEE8',
    border: '#EADFD6',
    tabBar: '#FFFFFF',

    text: '#2A2540',
    textMuted: '#73708A',
    textDim: '#A9A5BC',

    accent: '#F2704A',
    accentDark: '#C9522F',
    accentSoft: '#FFE9E0',
    onAccent: '#FFFFFF',

    success: '#2FB58A',
    successDark: '#1F8F6B',
    successSoft: '#DDF5EC',

    blue: '#6B6DE8',
    blueDark: '#5254C2',
    blueSoft: '#E8E8FD',

    gold: '#E8A63A',
    goldDark: '#BF8120',
    goldSoft: '#FDF0D6',

    red: '#E5576F',
    redDark: '#BF3F56',
    redSoft: '#FCE3E8',

    purple: '#6B6DE8',
    purpleDark: '#5254C2',
    purpleSoft: '#E8E8FD',

    teal: '#6B6DE8',
    tealDark: '#5254C2',
    tealSoft: '#E8E8FD',

    xp: '#D9922A',
    overlay: 'rgba(30, 24, 50, 0.5)',
  },
};

// Medianoche: negro profundo (ideal para OLED) con acento hielo-cian.
palettes.midnight = {
  ...palettes.dark,
  background: '#06070C',
  card: '#0F111A',
  card2: '#161926',
  border: '#232637',
  tabBar: '#0A0B12',

  text: '#EEF2F8',
  textMuted: '#8F97AE',
  textDim: '#586079',

  accent: '#5CE1E6',
  accentDark: '#35B5BA',
  accentSoft: '#0F2C33',
  onAccent: '#04141A',

  blue: '#8E9BFF',
  blueDark: '#6E7BD9',
  blueSoft: '#1A1F3F',
  purple: '#8E9BFF',
  purpleDark: '#6E7BD9',
  purpleSoft: '#1A1F3F',
  teal: '#8E9BFF',
  tealDark: '#6E7BD9',
  tealSoft: '#1A1F3F',

  overlay: 'rgba(0, 0, 0, 0.8)',
};

// Dreamy: fondo verde azulado pastel (salvia) con crema, rosa coral y dorado.
palettes.dreamy = {
  ...palettes.light,
  background: '#9391ffff',
  card: '#FBF7F2',
  card2: '#D0E3DF',
  border: '#B9D1CC',
  tabBar: '#FBF7F2',

  text: '#2D4541',
  textMuted: '#628079',
  textDim: '#9AB7B1',

  accent: '#E8706E',
  accentDark: '#C4504F',
  accentSoft: '#F7D0CA',
  onAccent: '#FFFFFF',

  success: '#5C9A7E',
  successDark: '#447A60',
  successSoft: '#D8EBE1',

  blue: '#5F8F86',
  blueDark: '#446F67',
  blueSoft: '#D4E6E2',
  purple: '#5F8F86',
  purpleDark: '#446F67',
  purpleSoft: '#D4E6E2',
  teal: '#5F8F86',
  tealDark: '#446F67',
  tealSoft: '#D4E6E2',

  gold: '#F2B54F',
  goldDark: '#C48B2A',
  goldSoft: '#FBE7BE',

  xp: '#E0A03A',
  overlay: 'rgba(45, 69, 65, 0.5)',
};

// Bosque: verde-pino profundo con acento salvia-lima, calmado y natural.
palettes.forest = {
  ...palettes.dark,
  background: '#0A1411',
  card: '#111F1A',
  card2: '#182B24',
  border: '#254036',
  tabBar: '#0D1A15',

  text: '#EEF5EF',
  textMuted: '#97B0A2',
  textDim: '#5F7A6C',

  accent: '#A3D98F',
  accentDark: '#7CB268',
  accentSoft: '#1D3320',
  onAccent: '#0B1A10',

  success: '#6FD6B0',
  successDark: '#46AA86',
  successSoft: '#143A33',

  blue: '#E3C58A',
  blueDark: '#BC9E62',
  blueSoft: '#33301D',
  purple: '#E3C58A',
  purpleDark: '#BC9E62',
  purpleSoft: '#33301D',
  teal: '#E3C58A',
  tealDark: '#BC9E62',
  tealSoft: '#33301D',

  overlay: 'rgba(4, 12, 9, 0.78)',
};

// Arena: papel beige cálido con acento terracota y un verde oliva apagado;
// sobria y poco saturada, cansa menos la vista de día que Dreamy.
palettes.sand = {
  ...palettes.light,
  background: '#F3EDE3',
  card: '#FBF8F2',
  card2: '#EAE2D5',
  border: '#DDD2C1',
  tabBar: '#FBF8F2',

  text: '#2E2A24',
  textMuted: '#7A7060',
  textDim: '#ADA38F',

  accent: '#B5654A',
  accentDark: '#8F4A33',
  accentSoft: '#F4E1D8',
  onAccent: '#FFFFFF',

  success: '#4E9A6C',
  successDark: '#3A7A54',
  successSoft: '#E0EEE4',

  blue: '#7D8B4F',
  blueDark: '#5E6840',
  blueSoft: '#E9ECD9',
  purple: '#7D8B4F',
  purpleDark: '#5E6840',
  purpleSoft: '#E9ECD9',
  teal: '#7D8B4F',
  tealDark: '#5E6840',
  tealSoft: '#E9ECD9',

  gold: '#C99A3B',
  goldDark: '#A27A24',
  goldSoft: '#F6E9CB',

  red: '#C4524A',
  redDark: '#A03C35',
  redSoft: '#F6DCD8',

  xp: '#B8862B',
  overlay: 'rgba(46, 42, 36, 0.5)',
};

// Vino: ciruela profunda con acento rosa-dorado, cálida y elegante de noche.
palettes.wine = {
  ...palettes.dark,
  background: '#140A12',
  card: '#1E1019',
  card2: '#2A1824',
  border: '#432637',
  tabBar: '#180C15',

  text: '#F7EDF1',
  textMuted: '#B79AA9',
  textDim: '#7C5E6E',

  accent: '#F2A7B8',
  accentDark: '#D07F93',
  accentSoft: '#3A1A27',
  onAccent: '#2A0E18',

  blue: '#E8C48F',
  blueDark: '#C29C68',
  blueSoft: '#38291B',
  purple: '#E8C48F',
  purpleDark: '#C29C68',
  purpleSoft: '#38291B',
  teal: '#E8C48F',
  tealDark: '#C29C68',
  tealSoft: '#38291B',

  overlay: 'rgba(14, 4, 10, 0.8)',
};

// Sunset: atardecer claro sobre violeta grisáceo; acento terracota con
// índigo, violeta y mostaza como contrapunto.
palettes.sunset = {
  ...palettes.light,
  background: '#906f8d',
  card: '#F6F3FA',
  card2: '#D8D1E6',
  border: '#d3b9d8ff',
  tabBar: '#F6F3FA',

  text: '#8f143dff',
  textMuted: '#490e22ff',
  textDim: '#A199BD',

  accent: '#f7cb0bff',
  accentDark: '#e2ac15ff',
  accentSoft: '#f9edcbff',
  onAccent: '#FFFFFF',

  success: '#e75676ff',
  successDark: '#aa4a62ff',
  successSoft: '#DDEBE2',

  blue: '#4D4469',
  blueDark: '#38314F',
  blueSoft: '#DDD8EA',
  purple: '#412ba1ff',
  purpleDark: '#554C7B',
  purpleSoft: '#E1DCEE',
  teal: '#4D4469',
  tealDark: '#38314F',
  tealSoft: '#DDD8EA',

  gold: '#E3B65B',
  goldDark: '#B98E33',
  goldSoft: '#F8E8C2',

  red: '#C65140',
  redDark: '#9E3A2C',
  redSoft: '#F5D4CC',

  xp: '#DCA13F',
  overlay: 'rgba(46, 41, 72, 0.5)',
};

const DARK_PALETTES = ['dark', 'midnight', 'forest', 'wine'];
// Dreamy, Arena (sand) y Sunset están definidas arriba pero ocultas por ahora.
const PALETTE_NAMES = [
  'light', 'dark', 'midnight', 'forest', 'wine',
];

let activeMode = 'dark';

export const colors = {};
Object.keys(palettes.dark).forEach((key) => {
  Object.defineProperty(colors, key, {
    enumerable: true,
    get: () => palettes[activeMode][key],
  });
});

export const getThemeMode = () => activeMode;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  title: { fontSize: 26, fontWeight: '800' },
  heading: { fontSize: 16, fontWeight: '800' },
  body: { fontSize: 13, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '700' },
};

// ───────────── Look "chunky" ─────────────

const FONT_WEIGHT_UP = { '600': '700', '700': '800' };

// Fondos sólidos que se convierten en botón con relieve, y su "sombra".
const solidShadows = () => [
  [colors.accent, colors.accentDark],
  [colors.success, colors.successDark],
  [colors.blue, colors.blueDark],
  [colors.gold, colors.goldDark],
  [colors.red, colors.redDark],
  [colors.purple, colors.purpleDark],
  [colors.teal, colors.tealDark],
];

const isChunkyName = (name) => !/input|field|search|bar|track|fill|dot|avatar|badge/i.test(name);

function gamify(name, style) {
  if (!style || typeof style !== 'object') return style;

  const out = { ...style };

  if (typeof out.fontSize === 'number' && out.fontSize < 30) {
    out.fontSize = Math.round(out.fontSize * 1.1);
  }
  if (out.fontWeight && FONT_WEIGHT_UP[out.fontWeight]) {
    out.fontWeight = FONT_WEIGHT_UP[out.fontWeight];
  }

  const hasBox = out.borderRadius != null;
  const isRound = out.width != null && out.height != null;
  const hasPadding =
    out.padding != null || out.paddingVertical != null || out.paddingHorizontal != null;
  const thinBorder = typeof out.borderWidth === 'number' && out.borderWidth <= 1.5;

  // Barras de progreso: más gordas y redondeadas.
  if (
    hasBox &&
    typeof out.height === 'number' &&
    out.height >= 3 &&
    out.height <= 10 &&
    out.width == null &&
    !hasPadding
  ) {
    out.height = 14;
    out.borderRadius = 7;
    return out;
  }

  // Bordes finos → gruesos.
  if (thinBorder) {
    out.borderWidth = 2;
  }

  if (!hasBox || isRound) return out;

  // Botones sólidos con relieve.
  if (out.backgroundColor && hasPadding && !out.borderWidth) {
    const match = solidShadows().find(([fill]) => fill === out.backgroundColor);
    if (match) {
      out.borderBottomWidth = 4;
      out.borderBottomColor = match[1];
      return out;
    }
  }

  // Tarjetas con borde: borde grueso y base con relieve.
  if (
    thinBorder &&
    hasPadding &&
    isChunkyName(name) &&
    (out.backgroundColor === colors.card || out.backgroundColor === colors.card2)
  ) {
    out.borderBottomWidth = 4;
  }

  return out;
}

const styleCache = new Map();

// Reemplazo de StyleSheet.create que reacciona al tema.
export function themedStyles(factory) {
  const resolve = () => {
    const cached = styleCache.get(factory);
    if (cached && cached.mode === activeMode) return cached.sheet;

    const raw = factory();
    const processed = {};
    Object.keys(raw).forEach((key) => {
      processed[key] = gamify(key, raw[key]);
    });
    const sheet = StyleSheet.create(processed);
    styleCache.set(factory, { mode: activeMode, sheet });
    return sheet;
  };

  return new Proxy(
    {},
    {
      get: (_, prop) => resolve()[prop],
      has: (_, prop) => prop in resolve(),
      ownKeys: () => Reflect.ownKeys(resolve()),
      getOwnPropertyDescriptor: (_, prop) => ({
        enumerable: true,
        configurable: true,
        value: resolve()[prop],
      }),
    }
  );
}

// ───────────── Preferencia de tema ─────────────

const THEME_PREF_KEY = 'themePreference'; // 'system' o el nombre de una paleta

const ThemeContext = createContext({
  mode: 'dark',
  palette: 'dark',
  preference: 'system',
  setPreference: () => { },
  toggle: () => { },
});

export const useTheme = () => useContext(ThemeContext);

const systemMode = () => (Appearance.getColorScheme() === 'light' ? 'light' : 'dark');

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState('system');
  const [system, setSystem] = useState(systemMode());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREF_KEY)
      .then((saved) => {
        if (saved === 'system' || PALETTE_NAMES.includes(saved)) {
          setPreferenceState(saved);
        }
      })
      .catch(() => { })
      .finally(() => setReady(true));

    const sub = Appearance.addChangeListener(() => setSystem(systemMode()));
    return () => sub?.remove?.();
  }, []);

  const palette = preference === 'system' ? system : preference;
  // `mode` es solo claro/oscuro; `palette` es la paleta concreta.
  const mode = DARK_PALETTES.includes(palette) ? 'dark' : 'light';

  // Se fija ANTES de renderizar a los hijos para que lean la paleta correcta.
  activeMode = palette;

  const setPreference = useCallback((value) => {
    setPreferenceState(value);
    AsyncStorage.setItem(THEME_PREF_KEY, value).catch(() => { });
  }, []);

  const toggle = useCallback(
    () => setPreference(mode === 'dark' ? 'light' : 'dark'),
    [mode, setPreference]
  );

  // Web/PWA: fondo y barra del navegador acordes al tema.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const bg = palettes[palette].tabBar;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', palettes[palette].background);
  }, [palette]);

  const value = useMemo(
    () => ({ mode, palette, preference, setPreference, toggle }),
    [mode, palette, preference, setPreference, toggle]
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
