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
