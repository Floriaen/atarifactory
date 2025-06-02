function FinalTesterAgent(code) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(code);
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = FinalTesterAgent; 