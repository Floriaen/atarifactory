window.gamepadState = { up: false, down: false, left: false, right: false, btn1: false, btn2: false };
function emitGamepadEvent(type, key) {
  const event = new CustomEvent('gamepad-' + type, { detail: { key } });
  window.dispatchEvent(event);
}
function handlePadPress(e) {
  e.preventDefault();
  const key = e.currentTarget.dataset.key;
  e.currentTarget.classList.add('active');
  window.gamepadState[key] = true;
  emitGamepadEvent('press', key);
}
function handlePadRelease(e) {
  e.preventDefault();
  const key = e.currentTarget.dataset.key;
  e.currentTarget.classList.remove('active');
  window.gamepadState[key] = false;
  emitGamepadEvent('release', key);
}
Array.from(document.querySelectorAll('.dpad-btn, .game-btn')).forEach(btn => {
  btn.addEventListener('mousedown', handlePadPress);
  btn.addEventListener('touchstart', handlePadPress, { passive: false });
  btn.addEventListener('mouseup', handlePadRelease);
  btn.addEventListener('mouseleave', handlePadRelease);
  btn.addEventListener('touchend', handlePadRelease);
  btn.addEventListener('touchcancel', handlePadRelease);
});

// Keyboard support for controlBar
const keyMap = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  a: 'btn1',
  z: 'btn2',
  A: 'btn1',
  Z: 'btn2',
};
const pressedKeys = {};
window.addEventListener('keydown', (e) => {
  const key = keyMap[e.key];
  if (!key || pressedKeys[key]) return;
  pressedKeys[key] = true;
  const btn = document.querySelector(`[data-key="${key}"]`);
  if (btn) {
    btn.classList.add('active');
  }
  window.gamepadState[key] = true;
  emitGamepadEvent('press', key);
});
window.addEventListener('keyup', (e) => {
  const key = keyMap[e.key];
  if (!key || !pressedKeys[key]) return;
  pressedKeys[key] = false;
  const btn = document.querySelector(`[data-key="${key}"]`);
  if (btn) {
    btn.classList.remove('active');
  }
  window.gamepadState[key] = false;
  emitGamepadEvent('release', key);
});
