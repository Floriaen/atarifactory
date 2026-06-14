'use strict';
// The fixed virtual gamepad: the 4-way D-pad + two buttons — exactly the GamepadInput enum.
// SINGLE SOURCE OF TRUTH: `gamepad-press`/`gamepad-release` events drive `window.gamepadState`.
// The on-screen buttons fire those events; the sandbox dispatches the same events directly.
(function () {
  var INPUTS = ['up', 'down', 'left', 'right', 'btn1', 'btn2'];
  var LABELS = { up: '▲', down: '▼', left: '◀', right: '▶', btn1: 'A', btn2: 'B' };

  var state = { up: false, down: false, left: false, right: false, btn1: false, btn2: false };
  window.gamepadState = state;

  window.addEventListener('gamepad-press', function (e) {
    var input = e && e.detail && e.detail.input;
    if (input in state) state[input] = true;
  });
  window.addEventListener('gamepad-release', function (e) {
    var input = e && e.detail && e.detail.input;
    if (input in state) state[input] = false;
  });

  function fire(type, input) {
    window.dispatchEvent(new CustomEvent(type, { detail: { input: input } }));
  }

  function build() {
    var bar = document.getElementById('control-bar');
    if (!bar) return;
    var dpad = document.createElement('div');
    dpad.className = 'gp-dpad';
    var buttons = document.createElement('div');
    buttons.className = 'gp-btns';

    INPUTS.forEach(function (input) {
      var key = document.createElement('button');
      key.type = 'button';
      key.className = 'gp-key gp-' + input;
      key.textContent = LABELS[input];
      key.setAttribute('aria-label', input);

      var press = function (ev) {
        ev.preventDefault();
        key.classList.add('on');
        fire('gamepad-press', input);
      };
      var release = function (ev) {
        ev.preventDefault();
        if (!key.classList.contains('on')) return;
        key.classList.remove('on');
        fire('gamepad-release', input);
      };
      key.addEventListener('pointerdown', press);
      key.addEventListener('pointerup', release);
      key.addEventListener('pointerleave', release);
      key.addEventListener('pointercancel', release);
      (input === 'btn1' || input === 'btn2' ? buttons : dpad).appendChild(key);
    });

    bar.appendChild(dpad);
    bar.appendChild(buttons);
  }

  // The #control-bar div precedes this script in the body, so it already exists — build now.
  build();
})();
