// Figuras de ejercicio: un muñeco de perfil (mira a la derecha) calculado con
// cinemática simple. Cada ejercicio es una función pura de `t` (0..1, de la
// pose inicial a la pose final) que devuelve la posición de cada articulación.
//
// Coordenadas: viewBox 200 x 170 con y hacia abajo; el suelo está en y = 146.
// Ángulos en grados: 0 = derecha, 90 = abajo, -90 = arriba.
//
// Para añadir un ejercicio: escribe una función `pose(t)` aquí y regístrala en
// FIGURES con el nombre exacto del ejercicio en el catálogo.

export const GROUND_Y = 146;

const SHIN = 38;
const THIGH = 38;
const TORSO = 46;
const UPPER_ARM = 26;
const FOREARM = 24;
const HEAD_DIST = 15;

function lerp(a, b, t) {
  'worklet';
  return a + (b - a) * t;
}

function point(origin, length, deg) {
  'worklet';
  const rad = (deg * Math.PI) / 180;
  return { x: origin.x + length * Math.cos(rad), y: origin.y + length * Math.sin(rad) };
}

// Cinemática inversa de dos huesos: codo entre hombro y muñeca. El codo queda
// del lado "horario" de la línea hombro-muñeca (sentido de las agujas del reloj
// en pantalla).
function elbowIK(shoulder, wrist) {
  'worklet';
  const dx = wrist.x - shoulder.x;
  const dy = wrist.y - shoulder.y;
  const reach = Math.max(8, Math.min(Math.sqrt(dx * dx + dy * dy), UPPER_ARM + FOREARM - 0.5));
  const cosA =
    (UPPER_ARM * UPPER_ARM + reach * reach - FOREARM * FOREARM) / (2 * UPPER_ARM * reach);
  const bend = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
  const base = (Math.atan2(dy, dx) * 180) / Math.PI;
  return point(shoulder, UPPER_ARM, base + bend);
}

// Cinemática inversa de pierna: rodilla entre cadera y tobillo, hacia delante.
function kneeIK(hip, ankle) {
  'worklet';
  const dx = ankle.x - hip.x;
  const dy = ankle.y - hip.y;
  const reach = Math.max(8, Math.min(Math.sqrt(dx * dx + dy * dy), THIGH + SHIN - 0.5));
  const cosA = (THIGH * THIGH + reach * reach - SHIN * SHIN) / (2 * THIGH * reach);
  const bend = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
  const base = (Math.atan2(dy, dx) * 180) / Math.PI;
  return point(hip, THIGH, base - bend);
}

// Articulación intermedia de dos huesos (l1 y l2) entre a y b. Hay dos
// soluciones simétricas; `mode` elige: 'down' (la más baja), 'up', 'left' o 'right'.
function bendIK(a, b, l1, l2, mode) {
  'worklet';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = Math.max(8, Math.min(Math.sqrt(dx * dx + dy * dy), l1 + l2 - 0.5));
  const cosA = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
  const bend = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
  const base = (Math.atan2(dy, dx) * 180) / Math.PI;
  const p1 = point(a, l1, base + bend);
  const p2 = point(a, l1, base - bend);
  if (mode === 'down') return p1.y > p2.y ? p1 : p2;
  if (mode === 'up') return p1.y < p2.y ? p1 : p2;
  if (mode === 'left') return p1.x < p2.x ? p1 : p2;
  return p1.x > p2.x ? p1 : p2;
}

// Parte inferior común de las sentadillas: el tobillo queda fijo, las rodillas
// avanzan, la cadera baja hacia atrás y el torso se inclina.
function squatBody(t) {
  'worklet';
  const ankle = { x: 90, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, lerp(-90, -65, t));
  const hip = point(knee, THIGH, lerp(-90, -170, t));
  const torsoAngle = lerp(-90, -60, t);
  const shoulder = point(hip, TORSO, torsoAngle);
  const head = point(shoulder, HEAD_DIST, torsoAngle);
  return { ankle, knee, hip, shoulder, head, torsoAngle };
}

// Sentadilla: brazos al frente como contrapeso.
function squat(t) {
  'worklet';
  const { ankle, knee, hip, shoulder, head } = squatBody(t);
  const elbow = point(shoulder, UPPER_ARM, 0);
  const wrist = point(elbow, FOREARM, 0);
  return { head, shoulder, elbow, wrist, hip, knee, ankle };
}

// Sentadilla goblet: una mancuerna sostenida junto al pecho.
function gobletSquat(t) {
  'worklet';
  const { ankle, knee, hip, shoulder, head } = squatBody(t);
  const elbow = point(shoulder, UPPER_ARM, lerp(80, 68, t));
  const wrist = point(elbow, FOREARM, -35);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist };
}

// Prensa de piernas: la cadera queda fija en el asiento reclinado y la
// plataforma se aleja o acerca; las rodillas se resuelven con cinemática
// inversa. Además de la figura devuelve las piezas de la máquina.
function legPress(t) {
  'worklet';
  const hip = { x: 60, y: 118 };
  const axis = -40; // dirección del recorrido de la plataforma
  const reclined = -135; // dirección del torso (hacia atrás y arriba)

  const shoulder = point(hip, TORSO, reclined);
  const head = point(shoulder, HEAD_DIST, reclined);

  const distance = lerp(74, 40, t); // cadera -> tobillo
  const ankle = point(hip, distance, axis);
  const cosA = (THIGH * THIGH + distance * distance - SHIN * SHIN) / (2 * THIGH * distance);
  const bend = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
  const knee = point(hip, THIGH, axis - bend);

  const elbow = point(shoulder, UPPER_ARM, 45);
  const wrist = point(elbow, FOREARM, 10);

  // Máquina: plataforma (perpendicular al recorrido), riel, respaldo y asiento.
  const center = point(ankle, 6, axis);
  const platA = point(center, 18, axis - 90);
  const platB = point(center, 18, axis + 90);
  const railOffset = point(hip, 0, 0);
  const railA = point(point(railOffset, 30, axis), 12, axis + 90);
  const railB = point(point(railOffset, 100, axis), 12, axis + 90);
  const backA = point(hip, 9, 135);
  const backB = point(point(shoulder, 20, reclined), 9, 135);
  const seatEnd = { x: backA.x + 34, y: backA.y };
  const pillarTop = { x: backA.x + 18, y: backA.y };
  const pillarBottom = { x: backA.x + 18, y: GROUND_Y };

  return {
    head, shoulder, elbow, wrist, hip, knee, ankle,
    platA, platB, railA, railB, backA, backB, seatEnd, pillarTop, pillarBottom,
  };
}

// Flexión: puntas de los pies y manos fijas en el suelo; el cuerpo es una
// línea recta que pivota y los codos se resuelven con cinemática inversa.
function pushUp(t) {
  'worklet';
  const ankle = { x: 30, y: GROUND_Y - 6 };
  const wrist = { x: 144, y: GROUND_Y };
  const bodyLength = SHIN + THIGH + TORSO;

  const shoulderY = lerp(96, 128, t);
  const bodyAngle = -(Math.asin((ankle.y - shoulderY) / bodyLength) * 180) / Math.PI;

  const knee = point(ankle, SHIN, bodyAngle);
  const hip = point(ankle, SHIN + THIGH, bodyAngle);
  const shoulder = point(ankle, bodyLength, bodyAngle);
  const head = point(shoulder, HEAD_DIST, bodyAngle);

  // Dos huesos: codo entre el hombro y la muñeca, hacia atrás.
  const dx = wrist.x - shoulder.x;
  const dy = wrist.y - shoulder.y;
  const reach = Math.min(Math.sqrt(dx * dx + dy * dy), UPPER_ARM + FOREARM - 0.5);
  const cosA =
    (UPPER_ARM * UPPER_ARM + reach * reach - FOREARM * FOREARM) / (2 * UPPER_ARM * reach);
  const bend = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
  const base = (Math.atan2(dy, dx) * 180) / Math.PI;
  const elbow = point(shoulder, UPPER_ARM, base + bend);

  return { head, shoulder, elbow, wrist, hip, knee, ankle };
}

// Curl de bíceps: de pie, brazo pegado al cuerpo; solo gira el antebrazo.
function bicepCurl(t) {
  'worklet';
  const ankle = { x: 100, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, -90);
  const hip = point(knee, THIGH, -90);
  const shoulder = point(hip, TORSO, -90);
  const head = point(shoulder, HEAD_DIST, -90);
  const elbow = point(shoulder, UPPER_ARM, 85);
  const wrist = point(elbow, FOREARM, lerp(88, -75, t));
  return { head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist };
}

// Press de banca: tumbado en el banco (cabeza a la izquierda, pies en el
// suelo). La barra baja hasta el pecho y sube; los codos salen de la cinemática
// inversa. t = 0 con los brazos arriba, t = 1 con la barra en el pecho.
function benchPress(t) {
  'worklet';
  const hip = { x: 110, y: 122 };
  const shoulder = point(hip, TORSO, 180);
  const head = point(shoulder, HEAD_DIST, 180);
  const knee = point(hip, THIGH, -30);
  const ankle = point(knee, SHIN, 90);

  const wrist = { x: shoulder.x + 4, y: lerp(shoulder.y - 50, shoulder.y - 14, t) };
  const elbow = elbowIK(shoulder, wrist);

  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist,
    benchA: { x: 30, y: 130 }, benchB: { x: 128, y: 130 },
    legA: { x: 40, y: 130 }, legB: { x: 40, y: GROUND_Y },
    legC: { x: 116, y: 130 }, legD: { x: 116, y: GROUND_Y },
  };
}

// Peso muerto rumano: rodillas casi rectas, la cadera se va hacia atrás y el
// torso se inclina hasta casi la horizontal mientras la barra roza las piernas.
function romanianDeadlift(t) {
  'worklet';
  const ankle = { x: 90, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, lerp(-90, -82, t));
  const hip = point(knee, THIGH, lerp(-90, -130, t));
  const torsoAngle = lerp(-90, -35, t);
  const shoulder = point(hip, TORSO, torsoAngle);
  const head = point(shoulder, HEAD_DIST, torsoAngle - 12 * t);
  const elbow = point(shoulder, UPPER_ARM, 90);
  const wrist = point(elbow, FOREARM, 90);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist };
}

// Dominada: colgado de la barra (muñecas fijas); el cuerpo sube hasta pasar la
// barbilla. t = 0 colgando, t = 1 arriba.
function pullUp(t) {
  'worklet';
  const bar = { x: 100, y: -6 };
  const shoulder = { x: 92, y: lerp(44, 0, t) };
  const wrist = { x: bar.x, y: bar.y };
  const elbow = elbowIK(shoulder, wrist);
  const head = point(shoulder, HEAD_DIST, -90);
  const hip = point(shoulder, TORSO, 90);
  const knee = point(hip, THIGH, 90);
  const ankle = point(knee, SHIN, 175);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle,
    barA: { x: 50, y: bar.y }, barB: { x: 150, y: bar.y },
    postA: { x: 50, y: bar.y }, postB: { x: 50, y: GROUND_Y },
    postC: { x: 150, y: bar.y }, postD: { x: 150, y: GROUND_Y },
  };
}

// Base sentada común (press de hombros y jalón): cadera fija en el asiento,
// muslo horizontal y pantorrilla vertical.
function seatedBase(torsoAngle) {
  'worklet';
  const hip = { x: 60, y: GROUND_Y - 4 - SHIN };
  const knee = point(hip, THIGH, 0);
  const ankle = point(knee, SHIN, 90);
  const shoulder = point(hip, TORSO, torsoAngle);
  const head = point(shoulder, HEAD_DIST, torsoAngle);
  const seat = {
    seatA: { x: 38, y: hip.y + 8 },
    seatB: { x: 86, y: hip.y + 8 },
    seatPostA: { x: 62, y: hip.y + 8 },
    seatPostB: { x: 62, y: GROUND_Y },
  };
  return { hip, knee, ankle, shoulder, head, seat };
}

// Press de hombros con mancuernas, sentado con respaldo. t = 0 mancuernas a la
// altura de los hombros, t = 1 brazos arriba.
function shoulderPress(t) {
  'worklet';
  const { hip, knee, ankle, shoulder, head, seat } = seatedBase(-90);
  // Arriba el brazo queda por delante de la cabeza (codo adelantado y
  // antebrazo vertical) para no taparla.
  const elbow = point(shoulder, UPPER_ARM, lerp(70, -65, t));
  const wrist = point(elbow, FOREARM, -90);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist,
    ...seat,
    backA: { x: hip.x - 9, y: hip.y + 8 },
    backB: { x: hip.x - 9, y: shoulder.y - 26 },
  };
}

// Jalón al pecho: sentado, ligeramente reclinado; la barra baja desde arriba
// hasta el pecho y el cable la sigue. t = 0 brazos arriba, t = 1 barra en pecho.
function latPulldown(t) {
  'worklet';
  const { hip, knee, ankle, shoulder, head, seat } = seatedBase(lerp(-90, -80, t));
  const wrist = { x: shoulder.x + lerp(14, 8, t), y: shoulder.y + lerp(-50, 4, t) };
  const elbow = elbowIK(shoulder, wrist);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist,
    ...seat,
    padA: { x: knee.x - 14, y: knee.y - 9 },
    padB: { x: knee.x + 2, y: knee.y - 9 },
    cableTop: { x: wrist.x, y: -8 },
  };
}

// Zancada: pies fijos en el suelo (el trasero apoyado en la punta) y la cadera
// sube y baja; ambas rodillas salen de la cinemática inversa. La pierna trasera
// se dibuja como pieza de apoyo, detrás de la figura. t = 0 arriba, t = 1 abajo.
function walkingLunge(t) {
  'worklet';
  const ankle = { x: 128, y: GROUND_Y - 4 };
  const ankleR = { x: 44, y: GROUND_Y - 14 };
  const hip = { x: 92, y: lerp(76, 104, t) };
  const knee = kneeIK(hip, ankle);
  const kneeR = kneeIK(hip, ankleR);
  const shoulder = point(hip, TORSO, -90);
  const head = point(shoulder, HEAD_DIST, -90);
  const elbow = point(shoulder, UPPER_ARM, 90);
  const wrist = point(elbow, FOREARM, 90);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, kneeR, ankleR, weight: wrist };
}

// Zancada estática (split lunge): la misma posición que las zancadas con
// mancuernas pero sin peso; los brazos cuelgan.
function splitLunge(t) {
  'worklet';
  const pose = walkingLunge(t);
  pose.weight = undefined;
  return pose;
}

// Zancada con paso: parte de pie, el pie delantero da un paso al frente y
// aterriza mientras el trasero se queda fijo apoyado en la punta; la cadera
// avanza y baja hasta que ambas rodillas forman unos 90°. t = 0 de pie, t = 1 abajo.
function steppingLunge(t) {
  'worklet';
  const ankleR = { x: 44, y: lerp(GROUND_Y - 4, GROUND_Y - 14, t) };
  const ankle = {
    x: lerp(44, 128, t),
    y: GROUND_Y - 4 - 16 * Math.sin(Math.PI * t),
  };
  const hip = { x: lerp(44, 92, t), y: lerp(66, 104, t) };
  const knee = kneeIK(hip, ankle);
  const kneeR = kneeIK(hip, ankleR);
  const shoulder = point(hip, TORSO, -90);
  const head = point(shoulder, HEAD_DIST, -90);
  const elbow = point(shoulder, UPPER_ARM, 90);
  const wrist = point(elbow, FOREARM, 90);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, kneeR, ankleR };
}

// Sentadilla en pared: isométrica. Espalda apoyada, muslos horizontales y
// pantorrillas verticales (rodillas a 90°); solo una leve respiración.
function wallSit(t) {
  'worklet';
  const hip = { x: 62, y: 104 };
  const knee = point(hip, THIGH, 0);
  const ankle = point(knee, SHIN, 90);
  const shoulder = { x: 62, y: 58 - 2 * t };
  const head = { x: shoulder.x, y: shoulder.y - HEAD_DIST };
  const elbow = point(shoulder, UPPER_ARM, 80);
  const wrist = point(elbow, FOREARM, 40);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle,
    wallA: { x: 56, y: -34 }, wallB: { x: 56, y: GROUND_Y },
  };
}

// Subida al cajón: el pie delantero queda apoyado en el cajón; el cuerpo sube
// extendiendo esa pierna y la otra se lleva hacia arriba con la rodilla al
// frente. t = 0 abajo, t = 1 de pie sobre el cajón.
function stepUp(t) {
  'worklet';
  const ankle = { x: 126, y: 112 };
  const ankleR = {
    x: lerp(80, 146, t),
    y: lerp(GROUND_Y - 4, 78, t) - 30 * Math.sin(Math.PI * t),
  };
  const hip = { x: lerp(98, 122, t), y: lerp(70, 36, t) };
  const knee = kneeIK(hip, ankle);
  const kneeR = kneeIK(hip, ankleR);
  const shoulder = point(hip, TORSO, -88);
  const head = point(shoulder, HEAD_DIST, -88);
  const elbow = point(shoulder, UPPER_ARM, 90);
  const wrist = point(elbow, FOREARM, 90);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, kneeR, ankleR,
    boxA: { x: 104, y: 116 }, boxB: { x: 170, y: 116 },
    boxC: { x: 104, y: GROUND_Y }, boxD: { x: 170, y: GROUND_Y },
  };
}

// Remo con barra: torso inclinado y fijo, rodillas flexionadas; la barra cuelga
// y se lleva al abdomen con el codo hacia atrás. t = 0 brazos abajo, t = 1 arriba.
function barbellRow(t) {
  'worklet';
  const ankle = { x: 90, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, -75);
  const hip = point(knee, THIGH, -140);
  const shoulder = point(hip, TORSO, -30);
  const head = point(shoulder, HEAD_DIST, -42);
  const wrist = {
    x: lerp(shoulder.x + 1, shoulder.x - 14, t),
    y: lerp(shoulder.y + 48, shoulder.y + 20, t),
  };
  const elbow = elbowIK(shoulder, wrist);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist };
}

// Extensión de tríceps en polea: el brazo queda pegado al cuerpo y el antebrazo
// baja hasta extenderse; el cable sigue a la mano. t = 0 flexionado, t = 1 estirado.
function tricepPushdown(t) {
  'worklet';
  const ankle = { x: 90, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, -90);
  const hip = point(knee, THIGH, -90);
  const shoulder = point(hip, TORSO, -90);
  const head = point(shoulder, HEAD_DIST, -90);
  const elbow = point(shoulder, UPPER_ARM, 90);
  const wrist = point(elbow, FOREARM, lerp(-15, 90, t));
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist,
    cableTop: { x: 104, y: -8 },
    cableEnd: wrist,
    beamA: { x: 104, y: -8 }, beamB: { x: 146, y: -8 },
    postA: { x: 146, y: -8 }, postB: { x: 146, y: GROUND_Y },
  };
}

// Extensión de cuádriceps en máquina: sentado, el muslo queda horizontal y la
// pantorrilla se eleva hasta extender la rodilla contra el rodillo.
function legExtension(t) {
  'worklet';
  const hip = { x: 60, y: GROUND_Y - 4 - SHIN };
  const knee = point(hip, THIGH, 0);
  const ankle = point(knee, SHIN, lerp(80, -5, t));
  const shoulder = point(hip, TORSO, -100);
  const head = point(shoulder, HEAD_DIST, -100);
  const elbow = point(shoulder, UPPER_ARM, 70);
  const wrist = point(elbow, FOREARM, 60);
  const backA = { x: hip.x - 9, y: hip.y + 8 };
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: ankle,
    seatA: { x: 38, y: hip.y + 8 }, seatB: { x: 96, y: hip.y + 8 },
    seatPostA: { x: 66, y: hip.y + 8 }, seatPostB: { x: 66, y: GROUND_Y },
    backA, backB: point(backA, 66, -100),
  };
}

// Elevación frontal: de pie, el brazo estirado sube desde el costado hasta la
// horizontal. t = 0 abajo, t = 1 arriba.
function frontRaise(t) {
  'worklet';
  const ankle = { x: 90, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, -90);
  const hip = point(knee, THIGH, -90);
  const shoulder = point(hip, TORSO, -90);
  const head = point(shoulder, HEAD_DIST, -90);
  const armAngle = lerp(90, -5, t);
  const elbow = point(shoulder, UPPER_ARM, armAngle);
  const wrist = point(elbow, FOREARM, armAngle);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist };
}

// Elevación de talones: la punta del pie queda fija y el talón sube, levantando
// todo el cuerpo. t = 0 apoyado, t = 1 de puntillas.
function calfRaise(t) {
  'worklet';
  const toe = { x: 110, y: GROUND_Y };
  // El pie mide siempre lo mismo: el tobillo gira alrededor de la punta.
  const ankle = point(toe, 18, lerp(-167, -125, t));
  const knee = point(ankle, SHIN, -90);
  const hip = point(knee, THIGH, -90);
  const shoulder = point(hip, TORSO, -90);
  const head = point(shoulder, HEAD_DIST, -90);
  const elbow = point(shoulder, UPPER_ARM, 90);
  const wrist = point(elbow, FOREARM, 90);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, weight: wrist };
}

// Fondos en paralelas: manos fijas en la barra, el cuerpo sube y baja
// colgando entre los brazos y las rodillas flexionadas hacia atrás.
// t = 0 brazos estirados, t = 1 abajo.
function dips(t) {
  'worklet';
  const wrist = { x: 100, y: 70 };
  const shoulder = { x: 94, y: lerp(20, 46, t) };
  const elbow = elbowIK(shoulder, wrist);
  const head = point(shoulder, HEAD_DIST, -90);
  const hip = point(shoulder, TORSO, 90);
  const knee = point(hip, THIGH, 90);
  const ankle = point(knee, SHIN, 175);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle,
    barA: { x: 80, y: 70 }, barB: { x: 130, y: 70 },
    postA: { x: 130, y: 70 }, postB: { x: 130, y: GROUND_Y },
  };
}

// Abdominal (crunch): tumbado sobre una colchoneta con las rodillas dobladas;
// solo se enrollan los hombros hacia arriba. t = 0 tumbado, t = 1 arriba.
function crunch(t) {
  'worklet';
  const hip = { x: 100, y: 135 };
  const knee = point(hip, THIGH, -50);
  const ankle = point(knee, SHIN, 77);
  const torsoAngle = lerp(180, 205, t);
  const shoulder = point(hip, TORSO, torsoAngle);
  const head = point(shoulder, HEAD_DIST, torsoAngle);
  const elbow = point(shoulder, UPPER_ARM, -10);
  const wrist = point(elbow, FOREARM, -10);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle,
    matA: { x: 20, y: GROUND_Y - 1 }, matB: { x: 180, y: GROUND_Y - 1 },
  };
}

// Remo en polea baja: sentado en el suelo con las piernas al frente apoyadas en
// la placa; el torso se endereza y la manija viaja del frente al abdomen.
// t = 0 brazos estirados, t = 1 manija en el abdomen.
function seatedCableRow(t) {
  'worklet';
  const hip = { x: 60, y: 136 };
  const knee = point(hip, THIGH, -15);
  const ankle = point(knee, SHIN, 10);
  const torsoAngle = lerp(-70, -95, t);
  const shoulder = point(hip, TORSO, torsoAngle);
  const head = point(shoulder, HEAD_DIST, torsoAngle);
  const wrist = {
    x: lerp(shoulder.x + 49, shoulder.x + 12, t),
    y: lerp(shoulder.y + 6, shoulder.y + 26, t),
  };
  const elbow = elbowIK(shoulder, wrist);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist,
    pulley: { x: 150, y: 112 },
    seatA: { x: 36, y: 142 }, seatB: { x: 84, y: 142 },
    plateA: { x: 142, y: 104 }, plateB: { x: 142, y: GROUND_Y },
  };
}

// Curl femoral tumbado: boca abajo en el banco, la pantorrilla sube hacia el
// glúteo con el rodillo en el tobillo. t = 0 pierna estirada, t = 1 flexionada.
function lyingLegCurl(t) {
  'worklet';
  const hip = { x: 80, y: 124 };
  const knee = point(hip, THIGH, 0);
  const ankle = point(knee, SHIN, lerp(0, -100, t));
  const shoulder = point(hip, TORSO, 180);
  const head = point(shoulder, HEAD_DIST, 180);
  const elbow = point(shoulder, UPPER_ARM, -150);
  const wrist = point(elbow, FOREARM, -40);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: ankle,
    benchA: { x: 16, y: 136 }, benchB: { x: 132, y: 136 },
    legA: { x: 30, y: 136 }, legB: { x: 30, y: GROUND_Y },
    legC: { x: 118, y: 136 }, legD: { x: 118, y: GROUND_Y },
  };
}

// Press inclinado con mancuernas: banco reclinado, pies en el suelo; las
// mancuernas suben casi en vertical. t = 0 en el pecho, t = 1 brazos arriba.
function inclinePress(t) {
  'worklet';
  const hip = { x: 70, y: 118 };
  const reclined = -135;
  const shoulder = point(hip, TORSO, reclined);
  const head = point(shoulder, HEAD_DIST, reclined);
  const knee = point(hip, THIGH, -20);
  const ankle = point(knee, SHIN, 90);
  const wrist = {
    x: lerp(shoulder.x + 14, shoulder.x + 6, t),
    y: lerp(shoulder.y - 4, shoulder.y - 50, t),
  };
  const elbow = elbowIK(shoulder, wrist);
  const backA = point(hip, 9, 135);
  const backB = point(point(shoulder, 20, reclined), 9, 135);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist,
    backA, backB,
    seatA: backA, seatB: { x: backA.x + 40, y: backA.y },
    postA: { x: backA.x + 20, y: backA.y }, postB: { x: backA.x + 20, y: GROUND_Y },
  };
}

// Curl predicador: sentado frente a un atril; el brazo se apoya en la
// almohadilla inclinada y solo se mueve el antebrazo. t = 0 estirado, t = 1 arriba.
function preacherCurl(t) {
  'worklet';
  const { hip, knee, ankle, shoulder, head, seat } = seatedBase(-80);
  const elbow = point(shoulder, UPPER_ARM, 50);
  const wrist = point(elbow, FOREARM, lerp(80, -55, t));
  const padA = point(point(shoulder, 10, 50), 5, 140);
  const padB = point(point(elbow, 8, 50), 5, 140);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist,
    ...seat,
    padA, padB,
    padPostA: padB, padPostB: { x: padB.x, y: GROUND_Y },
  };
}

// Extensión de tríceps sobre la cabeza: de pie, el codo apunta al techo y el
// antebrazo baja detrás de la cabeza y vuelve a subir. t = 0 flexionado, t = 1 estirado.
function overheadTricepsExtension(t) {
  'worklet';
  const ankle = { x: 90, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, -90);
  const hip = point(knee, THIGH, -90);
  const shoulder = point(hip, TORSO, -90);
  // La cabeza se adelanta un poco para que el antebrazo cuelgue detrás sin
  // atravesarla.
  const head = { x: shoulder.x + 8, y: shoulder.y - HEAD_DIST };
  const elbow = point(shoulder, UPPER_ARM, -100);
  const wrist = point(elbow, FOREARM, lerp(125, 260, t));
  return { head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist };
}

// Rompecráneos: tumbado en el banco, el codo apunta al techo y la barra baja
// hacia la frente. t = 0 barra junto a la frente, t = 1 brazos estirados.
function skullCrusher(t) {
  'worklet';
  const hip = { x: 110, y: 122 };
  const shoulder = point(hip, TORSO, 180);
  const head = point(shoulder, HEAD_DIST, 180);
  const knee = point(hip, THIGH, -30);
  const ankle = point(knee, SHIN, 90);
  const elbow = point(shoulder, UPPER_ARM, -85);
  const wrist = point(elbow, FOREARM, lerp(150, 275, t));
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist,
    benchA: { x: 30, y: 130 }, benchB: { x: 128, y: 130 },
    legA: { x: 40, y: 130 }, legB: { x: 40, y: GROUND_Y },
    legC: { x: 116, y: 130 }, legD: { x: 116, y: GROUND_Y },
  };
}

// Elevación de piernas tumbado: sobre la colchoneta, las piernas estiradas
// suben hasta la vertical. t = 0 abajo, t = 1 arriba.
function lyingLegRaise(t) {
  'worklet';
  const hip = { x: 100, y: 135 };
  const legAngle = lerp(-8, -90, t);
  const knee = point(hip, THIGH, legAngle);
  const ankle = point(knee, SHIN, legAngle);
  const shoulder = point(hip, TORSO, 180);
  const head = point(shoulder, HEAD_DIST, 180);
  const elbow = point(shoulder, UPPER_ARM, 10);
  const wrist = point(elbow, FOREARM, 10);
  return {
    head, shoulder, elbow, wrist, hip, knee, ankle,
    matA: { x: 20, y: GROUND_Y - 1 }, matB: { x: 180, y: GROUND_Y - 1 },
  };
}

// Encogimiento de hombros con mancuernas: los hombros suben hacia las orejas
// con los brazos estirados. t = 0 relajado, t = 1 arriba.
function dumbbellShrug(t) {
  'worklet';
  const ankle = { x: 90, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, -90);
  const hip = point(knee, THIGH, -90);
  const lift = lerp(0, 7, t);
  const shoulder = { x: hip.x, y: hip.y - TORSO - lift };
  const head = { x: shoulder.x, y: shoulder.y - HEAD_DIST };
  const elbow = point(shoulder, UPPER_ARM, 90);
  const wrist = point(elbow, FOREARM, 90);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist };
}

// Swing con kettlebell: la cadera se lanza hacia delante y los brazos suben
// hasta la horizontal por el impulso. t = 0 abajo (entre las piernas), t = 1 arriba.
function kettlebellSwing(t) {
  'worklet';
  const ankle = { x: 90, y: GROUND_Y - 4 };
  const knee = point(ankle, SHIN, lerp(-75, -90, t));
  const hip = point(knee, THIGH, lerp(-140, -90, t));
  const torsoAngle = lerp(-30, -90, t);
  const shoulder = point(hip, TORSO, torsoAngle);
  const head = point(shoulder, HEAD_DIST, torsoAngle);
  const armAngle = lerp(115, -5, t);
  const elbow = point(shoulder, UPPER_ARM, armAngle);
  const wrist = point(elbow, FOREARM, armAngle);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, weight: wrist };
}

// Plancha: isométrica. Antebrazos y puntas fijos; solo una leve respiración
// que sube un poco la cadera. t = 0 recta, t = 1 cadera apenas elevada.
function plank(t) {
  'worklet';
  const ankle = { x: 30, y: GROUND_Y - 6 };
  const shoulder = { x: 150, y: GROUND_Y - 30 };
  const elbow = point(shoulder, UPPER_ARM, 90);
  const wrist = point(elbow, FOREARM, 0);
  const dx = shoulder.x - ankle.x;
  const dy = shoulder.y - ankle.y;
  const along = (f) => ({ x: ankle.x + dx * f, y: ankle.y + dy * f - 3 * t * Math.sin(Math.PI * f) });
  const knee = along(SHIN / (SHIN + THIGH + TORSO));
  const hip = along((SHIN + THIGH) / (SHIN + THIGH + TORSO));
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const head = point(shoulder, HEAD_DIST, angle);
  return { head, shoulder, elbow, wrist, hip, knee, ankle };
}

// Pierna de un ciclo de carrera: el muslo oscila y la rodilla se dobla más
// cuando la pierna pasa hacia delante.
function runLeg(hip, phase) {
  'worklet';
  const thigh = 90 - 40 * Math.sin(phase);
  const flex = 20 + 65 * Math.max(0, Math.cos(phase));
  const knee = point(hip, THIGH, thigh);
  const ankle = point(knee, SHIN, thigh + flex);
  return { knee, ankle };
}

// Carrera: ciclo continuo; los brazos se mueven al contrario que las piernas.
// El cuerpo baja justo lo necesario para que el pie más bajo toque el suelo.
function running(t) {
  'worklet';
  const phase = 2 * Math.PI * t;
  const hip = { x: 90, y: 60 };
  const near = runLeg(hip, phase);
  const far = runLeg(hip, phase + Math.PI);
  const shoulder = point(hip, TORSO, -80);
  const head = point(shoulder, HEAD_DIST, -80);

  const swing = 35 * Math.sin(phase);
  const elbow = point(shoulder, UPPER_ARM, 90 + swing);
  const wrist = point(elbow, FOREARM, 10 + swing);
  const elbowR = point(shoulder, UPPER_ARM, 90 - swing);
  const wristR = point(elbowR, FOREARM, 10 - swing);

  const pts = {
    head, shoulder, elbow, wrist, hip,
    knee: near.knee, ankle: near.ankle,
    kneeR: far.knee, ankleR: far.ankle,
    elbowR, wristR,
  };
  // Para que el pie más bajo toque el suelo el cuerpo tendría que subir y
  // bajar ~12 px, lo que se ve como rebote. Seguimos solo una fracción de ese
  // movimiento alrededor de su valor medio (el pie puede quedar a unos px).
  const exact = GROUND_Y - 4 - Math.max(near.ankle.y, far.ankle.y);
  const MEAN_DROP = 13.2;
  const BOUNCE = 0.25;
  const dy = MEAN_DROP + BOUNCE * (exact - MEAN_DROP);
  Object.keys(pts).forEach((key) => {
    pts[key] = { x: pts[key].x, y: pts[key].y + dy };
  });
  return pts;
}

// Ciclismo: bicicleta de perfil con las ruedas fijas; los pies siguen los
// pedales en círculo y las rodillas salen de la cinemática inversa.
function cycling(t) {
  'worklet';
  const phase = 360 * t; // grados: `point` trabaja en grados
  const bb = { x: 90, y: 118 };
  const hip = { x: 74, y: 80 };
  const ankle = point(bb, 14, phase);
  const ankleR = point(bb, 14, phase + 180);
  const knee = kneeIK(hip, ankle);
  const kneeR = kneeIK(hip, ankleR);
  const shoulder = point(hip, TORSO, -50);
  const head = point(shoulder, HEAD_DIST, -40);
  const bar = { x: 136, y: 78 };
  const elbow = elbowIK(shoulder, bar);
  return {
    head, shoulder, elbow, wrist: bar, hip, knee, ankle, kneeR, ankleR,
    bb, hubR: { x: 44, y: 128 }, hubF: { x: 148, y: 128 },
    seat: { x: 76, y: 86 }, headT: { x: 128, y: 86 }, headB: { x: 134, y: 100 },
    bar, saddleA: { x: 64, y: 85 }, saddleB: { x: 86, y: 85 },
  };
}

// Escaladora: de pie, sujeto al pasamanos; los pedales suben y bajan en
// oposición y las rodillas salen de la cinemática inversa.
function stairClimbing(t) {
  'worklet';
  const phase = 2 * Math.PI * t;
  const hip = { x: 90, y: 66 };
  const ankle = { x: 84, y: 126 + 12 * Math.sin(phase) };
  const ankleR = { x: 98, y: 126 - 12 * Math.sin(phase) };
  const knee = kneeIK(hip, ankle);
  const kneeR = kneeIK(hip, ankleR);
  const shoulder = point(hip, TORSO, -82);
  const head = point(shoulder, HEAD_DIST, -82);
  const rail = { x: 124, y: 50 };
  const elbow = elbowIK(shoulder, rail);
  return {
    head, shoulder, elbow, wrist: rail, hip, knee, ankle, kneeR, ankleR,
    padA: { x: ankle.x - 8, y: ankle.y + 5 }, padB: { x: ankle.x + 12, y: ankle.y + 5 },
    padRA: { x: ankleR.x - 8, y: ankleR.y + 5 }, padRB: { x: ankleR.x + 12, y: ankleR.y + 5 },
    railTop: { x: 150, y: 50 }, mastTop: { x: 150, y: 20 }, mastBottom: { x: 150, y: GROUND_Y },
  };
}

// Hip thrust: la parte alta de la espalda descansa en un banco y los pies
// quedan fijos; la cadera sube y baja con la barra y las rodillas salen de la
// cinemática inversa. t = 0 cadera abajo, t = 1 torso y muslos en línea.
function hipThrust(t) {
  'worklet';
  const shoulder = { x: 48, y: 104 };
  const ankle = { x: 132, y: GROUND_Y - 4 };
  const hip = point(shoulder, TORSO, lerp(31.4, 0, t));
  const knee = kneeIK(hip, ankle);
  const head = point(shoulder, HEAD_DIST, -170);
  const elbow = bendIK(shoulder, hip, UPPER_ARM, FOREARM, 'up');
  return {
    head, shoulder, elbow, wrist: hip, hip, knee, ankle, weight: hip,
    benchA: { x: 18, y: 112 }, benchB: { x: 56, y: 112 },
    legA: { x: 28, y: 112 }, legB: { x: 28, y: GROUND_Y },
    legC: { x: 50, y: 112 }, legD: { x: 50, y: GROUND_Y },
  };
}

// ───────────── Vista de frente ─────────────
// Para movimientos que ocurren de lado a lado. El muñeco mira al espectador y
// es simétrico: se calcula el lado izquierdo (x < 100) y se refleja el derecho.

function mirror(p) {
  'worklet';
  return { x: 200 - p.x, y: p.y };
}

// Tronco y piernas de frente. Las rodillas se doblan hacia fuera si la cadera
// está más cerca del suelo que el largo de la pierna.
function frontBody(hipY, chestY, headY, ankleY) {
  'worklet';
  const hipL = { x: 89, y: hipY };
  const ankleL = { x: 89, y: ankleY };
  const kneeL = bendIK(hipL, ankleL, THIGH, SHIN, 'left');
  const shoulderL = { x: 80, y: chestY };
  return {
    head: { x: 100, y: headY },
    pelvis: { x: 100, y: hipY },
    chest: { x: 100, y: chestY },
    hipL, hipR: mirror(hipL),
    kneeL, kneeR: mirror(kneeL),
    ankleL, ankleR: mirror(ankleL),
    shoulderL, shoulderR: mirror(shoulderL),
  };
}

function withArms(body, elbowL, wristL) {
  'worklet';
  return {
    ...body,
    elbowL, wristL,
    elbowR: mirror(elbowL),
    wristR: mirror(wristL),
    weight: wristL,
    weightR: mirror(wristL),
  };
}

// Elevación lateral: de pie, los brazos suben de los costados a la horizontal.
function lateralRaise(t) {
  'worklet';
  const body = frontBody(66, 20, 5, 142);
  const angle = lerp(100, 175, t);
  const elbow = point(body.shoulderL, UPPER_ARM, angle);
  const wrist = point(elbow, FOREARM, angle);
  return withArms(body, elbow, wrist);
}

// Pájaros (deltoide posterior): inclinado hacia delante con las rodillas
// flexionadas; el torso se ve acortado y los brazos se abren hacia los lados.
function rearDeltRaise(t) {
  'worklet';
  const body = frontBody(68, 52, 46, 142);
  const angle = lerp(95, 172, t);
  const elbow = point(body.shoulderL, UPPER_ARM, angle);
  const wrist = point(elbow, FOREARM, angle);
  return withArms(body, elbow, wrist);
}

// Torres con poleas. Las aperturas usan poleas a la altura del pecho; el cruce,
// poleas altas.
function cableTowers(pulleyY) {
  'worklet';
  return {
    pulleyL: { x: 14, y: pulleyY },
    pulleyR: { x: 186, y: pulleyY },
    towerLA: { x: 14, y: -6 },
    towerLB: { x: 14, y: GROUND_Y },
    towerRA: { x: 186, y: -6 },
    towerRB: { x: 186, y: GROUND_Y },
  };
}

// Aperturas en polea: los brazos se mueven en un plano horizontal a la altura
// del pecho, como un abrazo. Se calcula con ángulos en ese plano (0° = hacia el
// lado, 90° = hacia el espectador), por eso los huesos se ven acortados.
function cableFly(t) {
  'worklet';
  const body = frontBody(66, 20, 5, 142);
  const upper = (lerp(5, 75, t) * Math.PI) / 180;
  const fore = (lerp(5, 155, t) * Math.PI) / 180;
  const elbow = { x: body.shoulderL.x - UPPER_ARM * Math.cos(upper), y: 22 };
  const wrist = { x: elbow.x - FOREARM * Math.cos(fore), y: 24 };
  return { ...withArms(body, elbow, wrist), ...cableTowers(24) };
}

// Cruce de poleas: poleas altas; los brazos casi estirados bajan en arco y las
// manos se cruzan por delante de la cadera.
function cableCrossover(t) {
  'worklet';
  const body = frontBody(66, 20, 5, 142);
  const angle = lerp(200, 60, t);
  const elbow = point(body.shoulderL, UPPER_ARM, angle);
  const wrist = point(elbow, FOREARM, angle);
  return { ...withArms(body, elbow, wrist), ...cableTowers(-6) };
}

// Giro ruso: sentado con el torso reclinado (acortado por la perspectiva) y las
// rodillas flexionadas; los hombros rotan y el peso se lleva de un lado al otro.
// Las piernas se ven acortadas porque apuntan hacia el espectador.
function russianTwist(t) {
  'worklet';
  const twist = (lerp(-40, 40, t) * Math.PI) / 180;
  const turn = Math.sin(twist);
  const spread = 20 * Math.cos(twist);
  const hipY = 138;
  const chestY = 100;

  const shoulderL = { x: 100 - spread, y: chestY + 4 * turn };
  const shoulderR = { x: 100 + spread, y: chestY - 4 * turn };
  const center = 100 + 30 * turn;
  const wristL = { x: center - 3, y: 118 };
  const wristR = { x: center + 3, y: 118 };
  // Cada codo se dobla hacia fuera de su lado; con 'down' el codo del lado hacia
  // el que se gira se torcía hacia dentro.
  const elbowL = bendIK(shoulderL, wristL, UPPER_ARM, FOREARM, 'left');
  const elbowR = bendIK(shoulderR, wristR, UPPER_ARM, FOREARM, 'right');

  return {
    head: { x: 100 + 5 * turn, y: 84 },
    pelvis: { x: 100, y: hipY },
    chest: { x: 100, y: chestY },
    hipL: { x: 89, y: hipY }, hipR: { x: 111, y: hipY },
    kneeL: { x: 86, y: 112 }, kneeR: { x: 114, y: 112 },
    ankleL: { x: 90, y: 141 }, ankleR: { x: 110, y: 141 },
    shoulderL, shoulderR, elbowL, elbowR, wristL, wristR,
    weight: { x: center, y: 118 },
  };
}

// Segmentos de la vista de frente: [desde, hasta, nombre].
export const FRONT_SEGMENTS = [
  ['pelvis', 'chest', 'spine'],
  ['hipL', 'hipR', 'hips'],
  ['shoulderL', 'shoulderR', 'shoulders'],
  ['hipL', 'kneeL', 'thighL'],
  ['kneeL', 'ankleL', 'shinL'],
  ['hipR', 'kneeR', 'thighR'],
  ['kneeR', 'ankleR', 'shinR'],
  ['shoulderL', 'elbowL', 'upperArmL'],
  ['elbowL', 'wristL', 'forearmL'],
  ['shoulderR', 'elbowR', 'upperArmR'],
  ['elbowR', 'wristR', 'forearmR'],
];

// Segmentos del cuerpo (vista de perfil): [desde, hasta, nombre].
export const SEGMENTS = [
  ['ankle', 'knee', 'shin'],
  ['knee', 'hip', 'thigh'],
  ['hip', 'shoulder', 'torso'],
  ['shoulder', 'elbow', 'upperArm'],
  ['elbow', 'wrist', 'forearm'],
];

// `muscle`: segmentos que se resaltan con el acento (zona que trabaja).
// `props`: piezas de apoyo (máquina) que se dibujan detrás: [desde, hasta].
export const FIGURES = {
  Squat: { pose: squat, muscle: ['thigh'], label: 'Sentadilla' },
  'Goblet Squat': { pose: gobletSquat, muscle: ['thigh'], label: 'Sentadilla goblet' },
  'Bench Press': {
    pose: benchPress,
    muscle: ['upperArm', 'torso'],
    label: 'Press de banca',
    props: [
      ['benchA', 'benchB'],
      ['legA', 'legB'],
      ['legC', 'legD'],
    ],
  },
  'Romanian Deadlift': {
    pose: romanianDeadlift,
    muscle: ['thigh', 'torso'],
    label: 'Peso muerto rumano',
  },
  'Pull Up': {
    pose: pullUp,
    muscle: ['upperArm', 'torso'],
    label: 'Dominada',
    viewBox: '0 -30 200 190',
    props: [
      ['barA', 'barB'],
      ['postA', 'postB'],
      ['postC', 'postD'],
    ],
  },
  'Shoulder Press': {
    pose: shoulderPress,
    muscle: ['upperArm'],
    label: 'Press de hombros',
    headBehind: true, // el brazo se dibuja por delante de la cabeza
    props: [
      ['seatA', 'seatB'],
      ['seatPostA', 'seatPostB'],
      ['backA', 'backB'],
    ],
  },
  'Lat Pulldown': {
    pose: latPulldown,
    muscle: ['upperArm', 'torso'],
    label: 'Jalón al pecho',
    props: [
      ['seatA', 'seatB'],
      ['seatPostA', 'seatPostB'],
      ['padA', 'padB'],
      ['cableTop', 'wrist'],
    ],
  },
  'Walking Lunges': {
    pose: walkingLunge,
    muscle: ['thigh'],
    label: 'Zancadas',
    props: [
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
    ],
  },
  'Barbell Row': {
    pose: barbellRow,
    muscle: ['upperArm', 'torso'],
    label: 'Remo con barra',
  },
  'Tricep Pushdown': {
    pose: tricepPushdown,
    muscle: ['upperArm', 'forearm'],
    label: 'Extensión de tríceps en polea',
    props: [
      ['beamA', 'beamB'],
      ['postA', 'postB'],
      ['cableTop', 'cableEnd'],
    ],
  },
  'Leg Extension': {
    pose: legExtension,
    muscle: ['thigh'],
    label: 'Extensión de piernas',
    props: [
      ['seatA', 'seatB'],
      ['seatPostA', 'seatPostB'],
      ['backA', 'backB'],
    ],
  },
  'Hammer Curl': { pose: bicepCurl, muscle: ['upperArm', 'forearm'], label: 'Curl martillo' },
  'Front Raise': { pose: frontRaise, muscle: ['upperArm'], label: 'Elevación frontal' },
  'Standing Calf Raise': {
    pose: calfRaise,
    muscle: ['shin'],
    label: 'Elevación de talones',
    viewBox: '0 -30 200 190',
    props: [['toe', 'ankle']],
  },
  Dips: {
    pose: dips,
    muscle: ['upperArm', 'torso'],
    label: 'Fondos en paralelas',
    props: [
      ['barA', 'barB'],
      ['postA', 'postB'],
    ],
  },
  Crunch: {
    pose: crunch,
    muscle: ['torso'],
    label: 'Abdominal',
    props: [['matA', 'matB']],
  },
  'Seated Cable Row': {
    pose: seatedCableRow,
    muscle: ['upperArm', 'torso'],
    label: 'Remo en polea baja',
    props: [
      ['pulley', 'wrist'],
      ['seatA', 'seatB'],
      ['plateA', 'plateB'],
    ],
  },
  'Lying Leg Curl': {
    pose: lyingLegCurl,
    muscle: ['thigh', 'shin'],
    label: 'Curl femoral tumbado',
    props: [
      ['benchA', 'benchB'],
      ['legA', 'legB'],
      ['legC', 'legD'],
    ],
  },
  'Incline Dumbbell Press': {
    pose: inclinePress,
    muscle: ['upperArm', 'torso'],
    label: 'Press inclinado con mancuernas',
    props: [
      ['backA', 'backB'],
      ['seatA', 'seatB'],
      ['postA', 'postB'],
    ],
  },
  'Preacher Curl': {
    pose: preacherCurl,
    muscle: ['upperArm', 'forearm'],
    label: 'Curl predicador',
    props: [
      ['seatA', 'seatB'],
      ['seatPostA', 'seatPostB'],
      ['padA', 'padB'],
      ['padPostA', 'padPostB'],
    ],
  },
  'Overhead Triceps Extension': {
    pose: overheadTricepsExtension,
    muscle: ['upperArm', 'forearm'],
    label: 'Extensión de tríceps sobre la cabeza',
    viewBox: '0 -40 200 200',
  },
  'Skull Crusher': {
    pose: skullCrusher,
    muscle: ['upperArm', 'forearm'],
    label: 'Rompecráneos',
    props: [
      ['benchA', 'benchB'],
      ['legA', 'legB'],
      ['legC', 'legD'],
    ],
  },
  'Lying Leg Raise': {
    pose: lyingLegRaise,
    muscle: ['thigh', 'shin', 'torso'],
    label: 'Elevación de piernas tumbado',
    props: [['matA', 'matB']],
  },
  'Dumbbell Shrug': { pose: dumbbellShrug, muscle: ['torso'], label: 'Encogimiento de hombros' },
  'Kettlebell Swing': {
    pose: kettlebellSwing,
    muscle: ['thigh', 'torso'],
    label: 'Swing con kettlebell',
  },
  Plank: {
    pose: plank,
    muscle: ['torso', 'thigh'],
    label: 'Plancha',
    note: 'Ejercicio isométrico: mantén la postura. El movimiento solo muestra la respiración.',
  },
  Running: {
    pose: running,
    muscle: ['thigh', 'shin'],
    label: 'Correr',
    cycle: true,
    duration: 700,
    props: [
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
      ['shoulder', 'elbowR'],
      ['elbowR', 'wristR'],
    ],
  },
  Cycling: {
    pose: cycling,
    muscle: ['thigh', 'shin'],
    label: 'Ciclismo',
    cycle: true,
    duration: 1100,
    rings: [
      [44, 128, 18],
      [148, 128, 18],
    ],
    props: [
      ['hubR', 'bb'],
      ['bb', 'seat'],
      ['seat', 'headT'],
      ['bb', 'headB'],
      ['headT', 'hubF'],
      ['headT', 'bar'],
      ['saddleA', 'saddleB'],
      ['bb', 'ankleR'],
      ['bb', 'ankle'],
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
    ],
  },
  'Stair Climbing': {
    pose: stairClimbing,
    muscle: ['thigh', 'shin'],
    label: 'Escaladora',
    cycle: true,
    duration: 1000,
    props: [
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
      ['padA', 'padB'],
      ['padRA', 'padRB'],
      ['mastTop', 'mastBottom'],
      ['railTop', 'wrist'],
    ],
  },
  'Lateral Raise': {
    pose: lateralRaise,
    view: 'front',
    muscle: ['shoulders', 'upperArmL', 'upperArmR'],
    label: 'Elevación lateral',
  },
  'Rear Delt Raise': {
    pose: rearDeltRaise,
    view: 'front',
    muscle: ['shoulders', 'upperArmL', 'upperArmR'],
    label: 'Pájaros (deltoide posterior)',
  },
  'Cable Fly': {
    pose: cableFly,
    view: 'front',
    muscle: ['shoulders', 'spine'],
    label: 'Aperturas en polea',
    props: [
      ['pulleyL', 'wristL'],
      ['pulleyR', 'wristR'],
      ['towerLA', 'towerLB'],
      ['towerRA', 'towerRB'],
    ],
  },
  'Cable Crossover': {
    pose: cableCrossover,
    view: 'front',
    muscle: ['shoulders', 'spine'],
    label: 'Cruce de poleas',
    props: [
      ['pulleyL', 'wristL'],
      ['pulleyR', 'wristR'],
      ['towerLA', 'towerLB'],
      ['towerRA', 'towerRB'],
    ],
  },
  'Russian Twist': {
    pose: russianTwist,
    view: 'front',
    muscle: ['spine', 'shoulders'],
    label: 'Giro ruso',
  },
  'Hip Thrust': {
    pose: hipThrust,
    muscle: ['torso', 'thigh'],
    label: 'Empuje de cadera',
    props: [
      ['benchA', 'benchB'],
      ['legA', 'legB'],
      ['legC', 'legD'],
    ],
  },
  'Split Lunge': {
    pose: splitLunge,
    muscle: ['thigh'],
    label: 'Zancada estática',
    props: [
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
    ],
  },
  Lunges: {
    pose: steppingLunge,
    muscle: ['thigh'],
    label: 'Zancada',
    props: [
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
    ],
  },
  'Wall Sit': {
    pose: wallSit,
    muscle: ['thigh'],
    label: 'Sentadilla en pared',
    note: 'Ejercicio isométrico: mantén la postura con las rodillas a 90°.',
    props: [['wallA', 'wallB']],
  },
  'Step Up': {
    pose: stepUp,
    muscle: ['thigh'],
    label: 'Subida al cajón',
    viewBox: '0 -40 200 200',
    props: [
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
      ['boxA', 'boxB'],
      ['boxA', 'boxC'],
      ['boxB', 'boxD'],
    ],
  },
  'Leg Press': {
    pose: legPress,
    muscle: ['thigh'],
    label: 'Prensa de piernas',
    props: [
      ['railA', 'railB'],
      ['pillarTop', 'pillarBottom'],
      ['backA', 'seatEnd'],
      ['backA', 'backB'],
      ['platA', 'platB'],
    ],
  },
  'Push Up': { pose: pushUp, muscle: ['upperArm', 'torso'], label: 'Flexión' },
  'Bicep Curl': { pose: bicepCurl, muscle: ['upperArm', 'forearm'], label: 'Curl de bíceps' },
};


// Variantes que comparten el movimiento de otra figura, con su propia etiqueta.
const ALIASES = {
  'Chin Up': ['Pull Up', 'Dominada supina'],
  'Dumbbell Deadlift': ['Romanian Deadlift', 'Peso muerto con mancuernas'],
  'One Arm Dumbbell Row': ['Barbell Row', 'Remo con mancuerna'],
};

Object.entries(ALIASES).forEach(([name, [source, label]]) => {
  FIGURES[name] = { ...FIGURES[source], label };
});

export const hasFigure = (exercise) => Boolean(exercise && FIGURES[exercise.name]);
