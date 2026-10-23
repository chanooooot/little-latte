import { SIZE, ORDERS, ROUND_SECONDS, targetMask, pourSegment, scoreMask, secondsLeft, inCup, tiltAim } from './game.js?v=tilt1';
import { createScene } from './scene.js';

const $ = id => document.getElementById(id);
const mask = new Float32Array(SIZE * SIZE);
let orderIndex = 0, target = targetMask('heart'), phase = 'ready', deadline = 0;
let scene, pointerDown = false, keyboardPour = false, pointerId = null;
let aim = [.5, .5], previous = null, dwell = 0, previousFrame = performance.now();
let soundEnabled = false, audio, pourSound, soundGain, lastSecond = 30;
const keys = new Set();
let tiltEnabled = false, tiltOrigin = null, tiltReading = null, tiltTarget = [.5, .5], tiltTimeout;

function recenterTilt() {
  if (!tiltReading) return;
  tiltOrigin = tiltReading;
  tiltTarget = aim = [.5, .5]; previous = null; dwell = 0;
  setStatus('Tilt centered. Hold the cup to pour.');
}

function onTilt(event) {
  if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
  const angle = screen.orientation?.angle ?? window.orientation ?? 0;
  tiltReading = [event.beta, event.gamma, angle];
  if (!tiltOrigin || tiltOrigin[2] !== angle) recenterTilt();
  tiltTarget = tiltAim(event.beta, event.gamma, tiltOrigin, angle);
  if (!tiltEnabled) {
    clearTimeout(tiltTimeout); tiltEnabled = true;
    $('tilt-button').disabled = false; $('tilt-button').textContent = 'Use touch aiming';
    $('recenter-button').hidden = false; $('controls-hint').hidden = true; $('tilt-hint').hidden = false;
  }
}

function stopTilt(message) {
  clearTimeout(tiltTimeout); window.removeEventListener('deviceorientation', onTilt);
  tiltEnabled = false; tiltOrigin = tiltReading = null;
  $('tilt-button').disabled = false; $('tilt-button').textContent = 'Use phone tilt';
  $('recenter-button').hidden = true; $('controls-hint').hidden = false; $('tilt-hint').hidden = true;
  if (message) setStatus(message);
}

async function toggleTilt() {
  if (tiltEnabled) { stopTilt('Touch aiming is on.'); return; }
  $('tilt-button').disabled = true; $('tilt-button').textContent = 'Waiting for tilt…';
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function' && await DeviceOrientationEvent.requestPermission() !== 'granted') {
      stopTilt('Motion access denied. Use touch aiming.'); return;
    }
    window.addEventListener('deviceorientation', onTilt);
    tiltTimeout = setTimeout(() => stopTilt('No tilt sensor found. Use touch aiming.'), 3000);
  } catch { stopTilt('Motion access unavailable. Use touch aiming.'); }
}

function drawCup(canvas, foam) {
  const ctx = canvas.getContext('2d'), w = canvas.width, c = w / 2, r = w * .37;
  ctx.clearRect(0, 0, w, w);
  ctx.save();
  ctx.shadowColor = '#4a311a20'; ctx.shadowBlur = w * .055; ctx.shadowOffsetY = w * .018;
  ctx.fillStyle = '#ebe4d6'; ctx.beginPath(); ctx.arc(c, c, r * 1.19, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ded3c0'; ctx.lineWidth = w * .016; ctx.beginPath(); ctx.arc(c, c, r * 1.11, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#c0cbb6'; ctx.lineWidth = w * .055; ctx.beginPath(); ctx.ellipse(c + r * 1.03, c, r * .20, r * .24, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f8f1e2'; ctx.beginPath(); ctx.arc(c, c, r * 1.04, 0, Math.PI * 2); ctx.fill();
  const gradient = ctx.createRadialGradient(c - r * .2, c - r * .2, 0, c, c, r);
  gradient.addColorStop(0, '#aa6c38'); gradient.addColorStop(.8, '#925126'); gradient.addColorStop(1, '#c58e51');
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill(); ctx.clip();
  const surface = document.createElement('canvas'); surface.width = surface.height = SIZE;
  const sctx = surface.getContext('2d'); const pixels = sctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < foam.length; i++) {
    pixels.data[i*4] = 255; pixels.data[i*4+1] = 247; pixels.data[i*4+2] = 224; pixels.data[i*4+3] = Math.round(foam[i]*255);
  }
  sctx.putImageData(pixels, 0, 0); ctx.drawImage(surface, c-r, c-r, r*2, r*2); ctx.restore();
}

function selectOrder(index) {
  orderIndex = index; const order = ORDERS[index]; target = targetMask(order.id);
  $('order-title').textContent = order.name; $('order-number').textContent = `0${index+1} / 03`;
  $('order-level').textContent = order.level; $('tip').textContent = order.tip;
  $('target').setAttribute('aria-label', `Target latte art: ${order.name}`);
  $('difficulty').setAttribute('aria-label', `Difficulty ${order.difficulty} of 3`);
  [...$('difficulty').children].forEach((dot, i) => dot.classList.toggle('filled', i < order.difficulty));
  document.querySelectorAll('.order-tab').forEach((tab, i) => {
    tab.classList.toggle('selected', i === index); tab.setAttribute('aria-pressed', String(i === index));
  });
  drawCup($('target'), target);
}

function setStatus(text) {
  $('station-status').replaceChildren();
  const dot = document.createElement('span'); dot.className = 'status-dot';
  $('station-status').append(dot, document.createTextNode(text));
}

function resetInput() {
  pointerDown = false; keyboardPour = false; previous = null; dwell = 0; keys.clear();
  if (pointerId !== null && $('scene').hasPointerCapture(pointerId)) $('scene').releasePointerCapture(pointerId);
  pointerId = null;
  if (soundGain && audio) soundGain.gain.setTargetAtTime(0, audio.currentTime, .03);
}

function resetCup() {
  mask.fill(0); scene?.updateFoam(mask); resetInput();
}

function startRound() {
  if (!scene || phase === 'playing') return;
  resetCup(); phase = 'playing'; deadline = performance.now() + ROUND_SECONDS * 1000; lastSecond = 30;
  if (tiltEnabled) recenterTilt();
  $('start-button').querySelector('span').textContent = 'Serve latte';
  $('clear-button').disabled = false; $('help-button').disabled = true;
  document.querySelectorAll('.order-tab').forEach(tab => { tab.disabled = true; });
  setStatus('Your moment. Make it lovely.');
  $('scene').focus({ preventScroll: true });
  if (soundEnabled) setupAudio();
}

function finishRound() {
  if (phase !== 'playing') return;
  phase = 'result'; resetInput(); $('pour-badge').hidden = true;
  $('clear-button').disabled = true; $('help-button').disabled = false; $('start-button').disabled = true;
  const score = scoreMask(mask, target);
  $('score').textContent = score;
  $('result-title').textContent = score >= 80 ? 'A work of heart.' : score >= 50 ? 'Looking lovely.' : 'Your first little masterpiece.';
  $('result-message').textContent = score >= 80 ? 'That one deserves a spot on the café menu.' : score >= 50 ? 'A little more practice. A little more magic.' : 'Every barista starts somewhere. There’s joy in the pour.';
  $('score-comment').textContent = score >= 80 ? 'Beautifully close to the original.' : score >= 50 ? 'You’re finding your flow.' : 'Try matching the shape and size.';
  drawCup($('result-target'), target); drawCup($('result-pour'), mask);
  $('next-button').firstChild.textContent = orderIndex === ORDERS.length - 1 ? 'Back to heart' : 'Next pour';
  setStatus('Poured with love.');
  $('result-dialog').showModal();
  if (soundEnabled) chime();
}

function prepareRound(index) {
  $('result-dialog').close(); phase = 'ready'; resetCup(); selectOrder(index);
  $('start-button').disabled = false; $('start-button').querySelector('span').textContent = 'Start pouring';
  $('time-value').textContent = '30'; $('timer').classList.remove('urgent');
  $('timer').setAttribute('aria-label', '30 seconds remaining');
  $('time-progress').style.transform = 'scaleX(1)';
  document.querySelectorAll('.order-tab').forEach(tab => { tab.disabled = false; });
  setStatus('Your coffee is ready.'); $('start-button').focus({ preventScroll: true });
}

function setupAudio() {
  try {
    if (!audio) {
      audio = new AudioContext();
      const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      pourSound = audio.createBufferSource(); pourSound.buffer = buffer; pourSound.loop = true;
      const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 850;
      soundGain = audio.createGain(); soundGain.gain.value = 0;
      pourSound.connect(filter).connect(soundGain).connect(audio.destination); pourSound.start();
    }
    audio.resume().catch(() => {});
  } catch { soundEnabled = false; }
}

function chime() {
  if (!audio) return;
  for (const [i, frequency] of [523.25, 659.25, 783.99].entries()) {
    const tone = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i * .12;
    tone.frequency.value = frequency; tone.type = 'sine'; gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(.06, t+.015); gain.gain.exponentialRampToValueAtTime(.001, t+.5);
    tone.connect(gain).connect(audio.destination); tone.start(t); tone.stop(t+.55);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  }
}

function movePointer(event) {
  if (!scene) return;
  const point = scene.pointFromClient(event.clientX, event.clientY);
  if (!point) return;
  aim = point.map(v => Math.max(-.1, Math.min(1.1, v)));
}

$('scene').addEventListener('pointerdown', event => {
  if (event.button !== 0 || phase !== 'playing' || pointerId !== null) return;
  event.preventDefault(); $('scene').focus({ preventScroll: true });
  pointerId = event.pointerId; $('scene').setPointerCapture(pointerId);
  if (!tiltEnabled) movePointer(event);
  pointerDown = true; previous = null; dwell = 0;
});
$('scene').addEventListener('pointermove', event => {
  if (!tiltEnabled && (pointerId === null || event.pointerId === pointerId)) movePointer(event);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('scene').addEventListener(type, event => {
  if (pointerId === event.pointerId) resetInput();
});
$('scene').addEventListener('pointerleave', () => { if (!pointerDown) previous = null; });
$('scene').addEventListener('keydown', event => {
  if (phase !== 'playing') return;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(event.key)) {
    event.preventDefault(); keys.add(event.key); if (event.key === ' ') keyboardPour = true;
  }
  if (event.key.toLowerCase() === 'f' && !event.repeat) $('flow').value = +$('flow').value > 2 ? 1 : 4;
});
$('scene').addEventListener('keyup', event => {
  keys.delete(event.key); if (event.key === ' ') { event.preventDefault(); keyboardPour = false; previous = null; dwell = 0; }
});
$('scene').addEventListener('blur', resetInput);
window.addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => {
  resetInput();
  if (phase === 'playing' && secondsLeft(deadline, performance.now()) === 0) finishRound();
});

$('start-button').addEventListener('click', () => phase === 'playing' ? finishRound() : startRound());
$('clear-button').addEventListener('click', () => { if (phase === 'playing') resetCup(); });
$('retry-button').addEventListener('click', () => prepareRound(orderIndex));
$('next-button').addEventListener('click', () => prepareRound((orderIndex + 1) % ORDERS.length));
$('result-dialog').addEventListener('cancel', event => { event.preventDefault(); prepareRound(orderIndex); });
document.querySelectorAll('.order-tab').forEach(tab => tab.addEventListener('click', () => {
  if (phase === 'ready') selectOrder(+tab.dataset.order);
}));
$('help-button').addEventListener('click', () => $('help-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
$('sound-button').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) setupAudio();
  else if (soundGain) soundGain.gain.setTargetAtTime(0, audio.currentTime, .03);
  $('sound-button').setAttribute('aria-pressed', String(soundEnabled));
  $('sound-button').setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on');
});
if ($('tilt-button')) {
  $('tilt-button').addEventListener('click', toggleTilt);
  $('recenter-button').addEventListener('click', recenterTilt);
  if (window.isSecureContext && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) $('tilt-controls').hidden = false;
}

function tick(now) {
  const dt = Math.min((now - previousFrame) / 1000, .05); previousFrame = now;
  if (phase === 'playing') {
    const remaining = secondsLeft(deadline, now);
    const displaySecond = Math.ceil(remaining);
    if (displaySecond !== lastSecond) {
      lastSecond = displaySecond; $('time-value').textContent = displaySecond;
      $('timer').setAttribute('aria-label', `${displaySecond} seconds remaining`);
      $('timer').classList.toggle('urgent', remaining <= 10);
    }
    $('time-progress').style.transform = `scaleX(${remaining / ROUND_SECONDS})`;
    if (remaining <= 0) finishRound();
  }
  if (phase === 'playing') {
    if (tiltEnabled) {
      const smoothing = 1 - Math.exp(-dt * 14);
      aim = aim.map((value, i) => value + (tiltTarget[i] - value) * smoothing);
    }
    if (keys.has('ArrowLeft')) aim[0] -= dt * .32;
    if (keys.has('ArrowRight')) aim[0] += dt * .32;
    if (keys.has('ArrowUp')) aim[1] -= dt * .32;
    if (keys.has('ArrowDown')) aim[1] += dt * .32;
    aim = aim.map(v => Math.max(0, Math.min(1, v)));
  }
  const pouring = phase === 'playing' && (pointerDown || keyboardPour) && inCup(...aim);
  const flow = +$('flow').value;
  if (pouring) {
    const distance = previous ? Math.hypot(aim[0] - previous[0], aim[1] - previous[1]) : 0;
    dwell = distance < .004 ? Math.min(dwell + dt, 1.3) : 0;
    const radius = (.009 + flow * .011) * (1 + Math.sqrt(dwell) * .55);
    pourSegment(mask, previous || aim, aim, radius, dt);
    scene.updateFoam(mask); previous = [...aim];
  } else { previous = null; dwell = 0; }
  $('pour-badge').hidden = !pouring;
  if (soundGain && soundEnabled) soundGain.gain.setTargetAtTime(pouring ? .07 : 0, audio.currentTime, .06);
  scene?.render(aim, pouring, phase === 'playing' && inCup(...aim), flow);
  requestAnimationFrame(tick);
}

selectOrder(0);
try {
  scene = await createScene($('scene'));
  $('loading').hidden = true; $('start-button').disabled = false;
  requestAnimationFrame(tick);
} catch (error) {
  console.error('Could not start the 3D coffee scene:', error);
  $('loading').replaceChildren();
  const message = document.createElement('p');
  message.textContent = 'Your cup couldn’t load. Check your internet connection and use a browser with WebGL enabled.';
  const retry = document.createElement('button'); retry.className = 'primary-button'; retry.textContent = 'Reload the café';
  retry.addEventListener('click', () => location.reload()); $('loading').append(message, retry);
  setStatus('Waiting for the coffee station.');
}
