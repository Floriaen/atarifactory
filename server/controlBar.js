// controlBar.js

// HTML for the control bar
const controlBarHTML = `
  <div id="gamepad-bar" class="gamepad-bar">
    <div class="dpad">
      <div class="dpad-up-row">
        <button class="dpad-btn" data-key="up">▲</button>
      </div>
      <div class="dpad-mid-row">
        <button class="dpad-btn" data-key="left">◀</button>
        <button class="dpad-btn" data-key="down">▼</button>
        <button class="dpad-btn" data-key="right">▶</button>
      </div>
    </div>
    <div class="btns">
      <button class="game-btn" data-key="btn1">1</button>
      <button class="game-btn" data-key="btn2">2</button>
    </div>
  </div>
`;

// CSS for the control bar
const controlBarCSS = `
  .gamepad-bar{position:fixed;left:0;right:0;bottom:0;width:100vw;display:flex;flex-direction:row;align-items:flex-end;justify-content:space-between;background:#222e;border-radius:1em 1em 0 0;padding:0.5em 2em 0.7em 1.2em;z-index:100;box-shadow:0 -2px 12px #0008;user-select:none;touch-action:none;gap:1.2em;}
  .dpad{display:flex;flex-direction:column;align-items:flex-start;gap:0.1em;}
  .dpad-up-row{display:flex;justify-content:center;width:100%;}
  .dpad-mid-row{display:flex;flex-direction:row;gap:0.2em;}
  .dpad-btn{width:2.2em;height:2.2em;font-size:1.3em;background:#444;color:#ffb300;border:none;border-radius:0.5em;margin:0.1em;font-weight:bold;box-shadow:0 1px 4px #0006;cursor:pointer;transition:background 0.15s;}
  .dpad-btn:active,.dpad-btn.active{background:#ffb300;color:#222;}
  .btns{display:flex;flex-direction:row;gap:0.7em;margin-bottom:0.5em;align-items:flex-end;}
  .game-btn{width:2.7em;height:2.7em;font-size:1.2em;background:#ffb300;color:#222;border:none;border-radius:50%;font-weight:bold;box-shadow:0 1px 4px #0006;cursor:pointer;margin:0.1em;transition:background 0.15s;}
  .game-btn:active,.game-btn.active{background:#fff;color:#ffb300;}
  .game-btn:last-child{margin-right:0.5em;}
`;

// JS for the control bar
const controlBarJS = `
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
`;

module.exports = { controlBarHTML, controlBarCSS, controlBarJS }; 