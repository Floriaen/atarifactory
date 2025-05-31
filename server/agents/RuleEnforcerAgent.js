function RuleEnforcerAgent(gameJs) {
  const violations = [];
  const lines = gameJs.split('\n');
  let compliant = true;
  // 1. No alert/confirm/prompt
  const forbiddenCalls = [/alert\s*\(/, /confirm\s*\(/, /prompt\s*\(/];
  forbiddenCalls.forEach((regex) => {
    lines.forEach((line, i) => {
      if (regex.test(line)) {
        compliant = false;
        violations.push({ rule: 'No alert/confirm/prompt', lines: [`${i+1}: ${line.trim()}`] });
      }
    });
  });
  // 2. No document.createElement, innerHTML, etc.
  const forbiddenDom = [/document\.createElement/, /innerHTML/];
  forbiddenDom.forEach((regex) => {
    lines.forEach((line, i) => {
      if (regex.test(line)) {
        compliant = false;
        violations.push({ rule: 'No document.createElement/innerHTML', lines: [`${i+1}: ${line.trim()}`] });
      }
    });
  });
  // 3. No canvas = document.createElement('canvas')
  lines.forEach((line, i) => {
    if (/canvas\s*=\s*document\.createElement\(['"]canvas['"]\)/.test(line)) {
      compliant = false;
      violations.push({ rule: 'No canvas = document.createElement(\'canvas\')', lines: [`${i+1}: ${line.trim()}`] });
    }
  });
  // 4. Must include ctx.fillText
  if (!/ctx\.fillText/.test(gameJs)) {
    compliant = false;
    violations.push({ rule: 'Must include ctx.fillText', lines: [] });
  }
  // 5. Only one getElementById('game-canvas')
  const getElemMatches = gameJs.match(/getElementById\(['"]game-canvas['"]\)/g) || [];
  if (getElemMatches.length !== 1) {
    compliant = false;
    violations.push({ rule: 'Only one getElementById(\'game-canvas\')', lines: [] });
  }
  // 6. No keyboard event listeners
  const forbiddenKeyboardEvents = [/addEventListener\(['"]keydown['"]/, /addEventListener\(['"]keyup['"]/, /addEventListener\(['"]keypress['"]/];
  forbiddenKeyboardEvents.forEach((regex) => {
    lines.forEach((line, i) => {
      if (regex.test(line)) {
        compliant = false;
        violations.push({ rule: 'No keyboard event listeners', lines: [`${i+1}: ${line.trim()}`] });
      }
    });
  });
  // 7. No direct keyboard property access (e.key, event.key)
  const forbiddenKeyProps = [/\bevent\.key\b/, /\be\.key\b/];
  forbiddenKeyProps.forEach((regex) => {
    lines.forEach((line, i) => {
      if (regex.test(line)) {
        compliant = false;
        violations.push({ rule: 'No direct keyboard property access', lines: [`${i+1}: ${line.trim()}`] });
      }
    });
  });
  // 8. No keyCode usage
  const forbiddenKeyCode = [/\bkeyCode\b/];
  forbiddenKeyCode.forEach((regex) => {
    lines.forEach((line, i) => {
      if (regex.test(line)) {
        compliant = false;
        violations.push({ rule: 'No keyCode usage', lines: [`${i+1}: ${line.trim()}`] });
      }
    });
  });
  return { compliant, violations };
}

module.exports = RuleEnforcerAgent; 