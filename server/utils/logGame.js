const fs = require('fs');
const path = require('path');
const LOGS_DIR = path.join(__dirname, '../logs');

function logGame(id, gameSpec, mechanicsBlock) {
  const logPath = path.join(LOGS_DIR, `game-${id}.log`);
  const logData = {
    timestamp: new Date().toISOString(),
    gameSpec,
    mechanicsBlock,
  };
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
}

module.exports = logGame; 