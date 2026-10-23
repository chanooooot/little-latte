import { SIZE, ROUND_SECONDS, ORDERS, targetMask, pourSegment, scoreMask, secondsLeft, inCup, tiltAim } from './game.js?v=quality1';
import { createScene } from './scene.js?v=local-three1';

const $ = id => document.getElementById(id);
const phone = matchMedia('(pointer: coarse)').matches;
document.body.dataset.control = phone ? 'tilt' : 'mouse';
if (!phone) $('scene').setAttribute('aria-label', 'Coffee cup. Move your mouse to aim. Hold the Pour button to pour. Arrow keys and Space also work.');
const mask = new Float32Array(SIZE * SIZE);
const keys = new Set();
let scene, phase = 'ready', deadline = 0, previousFrame = performance.now();
let aim = [.5, .5], tiltTarget = [.5, .5], tiltOrigin = null, tiltReading = null, tiltTimeout;
let pointerDown = false, keyboardPour = false, pointerId = null, previous = null, dwell = 0;
let order = ORDERS[0], target = targetMask(order.id);

function showOrder() {
  $('order-name').textContent = $('order-caption').textContent = `${order.name} Latte`;
  $('target-preview').setAttribute('aria-label', `${order.name} Latte example`);
  drawArt($('target-preview'), target);
}

function drawArt(canvas, art) {
  const context = canvas.getContext('2d'), size = canvas.width, center = size / 2, radius = size * .35;
  context.clearRect(0, 0, size, size);
  context.save();
  context.shadowColor = '#4a311a26'; context.shadowBlur = size * .06; context.shadowOffsetY = size * .02;
  context.fillStyle = '#ebe4d6'; context.beginPath(); context.arc(center, center, radius * 1.18, 0, Math.PI * 2); context.fill();
  context.shadowColor = 'transparent';
  context.strokeStyle = '#b7c8ae'; context.lineWidth = size * .055; context.beginPath(); context.ellipse(center + radius * 1.03, center, radius * .2, radius * .24, 0, 0, Math.PI * 2); context.stroke();
  context.fillStyle = '#f8f1e2'; context.beginPath(); context.arc(center, center, radius * 1.04, 0, Math.PI * 2); context.fill();
  const coffee = context.createRadialGradient(center - radius * .2, center - radius * .2, 0, center, center, radius);
  coffee.addColorStop(0, '#aa6c38'); coffee.addColorStop(.8, '#71401f'); coffee.addColorStop(1, '#b9793f');
  context.fillStyle = coffee; context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2); context.fill(); context.clip();
  const surface = document.createElement('canvas'); surface.width = surface.height = SIZE;
  const preview = surface.getContext('2d').createImageData(SIZE, SIZE);
  for (let index = 0; index < art.length; index++) {
    const pixel = index * 4;
    preview.data[pixel] = 255; preview.data[pixel + 1] = 248; preview.data[pixel + 2] = 231;
    preview.data[pixel + 3] = Math.round(Math.max(0, Math.min(1, art[index])) * 255);
  }
  surface.getContext('2d').putImageData(preview, 0, 0);
  context.drawImage(surface, center - radius, center - radius, radius * 2, radius * 2); context.restore();
}

function nextOrder() {
  const options = ORDERS.filter(candidate => candidate.id !== order.id);
  order = options[Math.floor(Math.random() * options.length)];
  target = targetMask(order.id); showOrder();
}

function notice(text = '') {
  $('notice').textContent = text;
  $('notice').hidden = !text;
}

function resetInput() {
  pointerDown = keyboardPour = false; previous = null; dwell = 0; keys.clear();
  if (pointerId !== null && $('pour').hasPointerCapture(pointerId)) $('pour').releasePointerCapture(pointerId);
  pointerId = null;
}

function stopTilt() {
  clearTimeout(tiltTimeout);
  window.removeEventListener('deviceorientation', onTilt);
  tiltOrigin = tiltReading = null;
}

function recenter() {
  if (!tiltReading) return;
  tiltOrigin = tiltReading;
  tiltTarget = aim = [.5, .5]; previous = null; dwell = 0;
}

function beginRound() {
  phase = 'playing'; deadline = performance.now() + ROUND_SECONDS * 1000;
  $('ready-panel').hidden = true; $('result-panel').hidden = true;
  $('play-hint').hidden = false; $('finish').hidden = false; $('recenter').hidden = !phone;
  $('timer').textContent = '30'; notice();
  $('scene').focus({ preventScroll: true });
}

function onTilt(event) {
  if (phase !== 'waiting' && phase !== 'playing') return;
  if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
  const angle = screen.orientation?.angle ?? window.orientation ?? 0;
  tiltReading = [event.beta, event.gamma, angle];
  if (!tiltOrigin || tiltOrigin[2] !== angle) recenter();
  tiltTarget = tiltAim(event.beta, event.gamma, tiltOrigin, angle);
  if (phase === 'waiting') { clearTimeout(tiltTimeout); beginRound(); }
}

function tiltFailed(message) {
  stopTilt(); phase = 'ready'; $('start').disabled = false; notice(message);
}

async function startRound() {
  if (!scene) { location.reload(); return; }
  if (phase !== 'ready') return;
  mask.fill(0); scene.updateFoam(mask); resetInput(); aim = tiltTarget = [.5, .5];
  if (!phone) { beginRound(); return; }
  phase = 'waiting'; $('start').disabled = true; notice('Hold your phone comfortably.');
  if (!window.isSecureContext || !('DeviceOrientationEvent' in window)) {
    tiltFailed('Tilt needs a phone with motion sensors.'); return;
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function' && await DeviceOrientationEvent.requestPermission() !== 'granted') {
      tiltFailed('Allow motion access to play.'); return;
    }
    window.addEventListener('deviceorientation', onTilt);
    tiltTimeout = setTimeout(() => tiltFailed('No motion signal. Try Safari or Chrome on your phone.'), 3500);
  } catch { tiltFailed('Motion access unavailable. Check browser settings.'); }
}

function finishRound() {
  if (phase !== 'playing') return;
  phase = 'result'; resetInput(); stopTilt();
  $('play-hint').hidden = true; $('finish').hidden = true; $('recenter').hidden = true;
  $('score').textContent = scoreMask(mask, target);
  drawArt($('your-preview'), mask); drawArt($('order-preview'), target);
  $('result-panel').hidden = false; $('again').focus({ preventScroll: true });
}

function readyRound() {
  phase = 'ready'; mask.fill(0); scene.updateFoam(mask); resetInput(); aim = [.5, .5];
  nextOrder();
  $('timer').textContent = '30'; $('result-panel').hidden = true;
  $('ready-panel').hidden = false; $('start').disabled = false; notice();
}

function moveMouse(event) {
  if (!scene || phone || event.pointerType !== 'mouse') return;
  const point = scene.pointFromClient(event.clientX, event.clientY);
  if (point) aim = point.map(value => Math.max(0, Math.min(1, value)));
}

$('pour').addEventListener('pointerdown', event => {
  if (event.button !== 0 || phase !== 'playing' || pointerId !== null) return;
  event.preventDefault(); pointerId = event.pointerId;
  $('pour').setPointerCapture(pointerId);
  pointerDown = true; previous = null; dwell = 0;
});
$('scene').addEventListener('pointermove', moveMouse);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('pour').addEventListener(type, event => {
  if (pointerId === event.pointerId) resetInput();
});
for (const id of ['scene', 'pour']) {
  $(id).addEventListener('keydown', event => {
    if (phase !== 'playing') return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(event.key)) {
      event.preventDefault(); keys.add(event.key);
      if (event.key === ' ' || event.key === 'Enter') keyboardPour = true;
    }
  });
  $(id).addEventListener('keyup', event => {
    keys.delete(event.key);
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); keyboardPour = false; previous = null; dwell = 0; }
  });
  $(id).addEventListener('blur', resetInput);
}
window.addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => {
  resetInput();
  if (phase === 'playing' && secondsLeft(deadline, performance.now()) === 0) finishRound();
});
$('start').addEventListener('click', startRound);
$('again').addEventListener('click', readyRound);
$('finish').addEventListener('click', finishRound);
$('recenter').addEventListener('click', recenter);
showOrder();

function tick(now) {
  const dt = Math.min((now - previousFrame) / 1000, .05); previousFrame = now;
  if (phase === 'playing') {
    const remaining = secondsLeft(deadline, now);
    $('timer').textContent = Math.ceil(remaining);
    if (remaining <= 0) finishRound();
  }
  if (phase === 'playing') {
    if (phone) {
      const smoothing = 1 - Math.exp(-dt * 14);
      aim = aim.map((value, i) => value + (tiltTarget[i] - value) * smoothing);
    }
    if (keys.has('ArrowLeft')) aim[0] -= dt * .32;
    if (keys.has('ArrowRight')) aim[0] += dt * .32;
    if (keys.has('ArrowUp')) aim[1] -= dt * .32;
    if (keys.has('ArrowDown')) aim[1] += dt * .32;
    aim = aim.map(value => Math.max(0, Math.min(1, value)));
  }
  const pouring = phase === 'playing' && (pointerDown || keyboardPour) && inCup(...aim);
  if (pouring) {
    const distance = previous ? Math.hypot(aim[0] - previous[0], aim[1] - previous[1]) : 0;
    dwell = distance < .004 ? Math.min(dwell + dt, 1.3) : 0;
    const radius = .042 * (1 + Math.sqrt(dwell) * .55);
    pourSegment(mask, previous || aim, aim, radius, dt);
    scene.updateFoam(mask); previous = [...aim];
  } else { previous = null; dwell = 0; }
  $('play-hint').classList.toggle('pouring', pouring);
  scene.render(aim, pouring, phase === 'playing' && inCup(...aim));
  requestAnimationFrame(tick);
}

try {
  scene = await createScene($('scene'));
  $('start').textContent = 'Start pouring';
  $('start').disabled = false;
  requestAnimationFrame(tick);
} catch (error) {
  console.error('Could not start the 3D coffee scene:', error);
  $('start').disabled = false; $('start').textContent = 'Reload';
  notice('Cup could not load. Check your connection and WebGL.');
}
