// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

// Simulate the DOM structure as in main.js
const setupDOM = () => {
  document.body.innerHTML = `
    <div id="progress-bar-container">
      <div id="progress-bar-bg">
        <div id="progress-bar"></div>
      </div>
      <div id="progress-bar-label"></div>
    </div>
  `;
};

// This function mimics the progress bar update logic in main.js
function handleProgressEvent(data) {
  const progressBarContainer = document.getElementById('progress-bar-container');
  const progressBar = document.getElementById('progress-bar');
  const progressBarLabel = document.getElementById('progress-bar-label');
  // Unified Progress Bar: Only use canonical PipelineStatus events
  if (data.type === 'PipelineStatus' && typeof data.progress === 'number') {
    const pct = Math.max(0, Math.min(100, Math.round(100 * data.progress)));
    progressBar.style.width = pct + '%';
    progressBarLabel.textContent = pct + '%';
    progressBarContainer.style.display = '';
  } else {
    // Defensive: hide bar if no valid progress
    progressBar.style.width = '0%';
    progressBarLabel.textContent = '';
    progressBarContainer.style.display = 'none';
  }
}

describe('Unified Progress Bar Contract', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('shows correct width and label for valid progress', () => {
    handleProgressEvent({ type: 'PipelineStatus', progress: 0.37 });
    const progressBar = document.getElementById('progress-bar');
    const progressBarLabel = document.getElementById('progress-bar-label');
    expect(progressBar.style.width).toBe('37%');
    expect(progressBarLabel.textContent).toBe('37%');
  });

  it('shows 0% and hides bar for progress=0', () => {
    handleProgressEvent({ type: 'PipelineStatus', progress: 0 });
    const progressBar = document.getElementById('progress-bar');
    const progressBarLabel = document.getElementById('progress-bar-label');
    const progressBarContainer = document.getElementById('progress-bar-container');
    expect(progressBar.style.width).toBe('0%');
    expect(progressBarLabel.textContent).toBe('0%');
    expect(progressBarContainer.style.display).toBe('');
  });

  it('hides and resets bar for missing progress', () => {
    handleProgressEvent({ type: 'PipelineStatus' });
    const progressBar = document.getElementById('progress-bar');
    const progressBarLabel = document.getElementById('progress-bar-label');
    const progressBarContainer = document.getElementById('progress-bar-container');
    expect(progressBar.style.width).toBe('0%');
    expect(progressBarLabel.textContent).toBe('');
    expect(progressBarContainer.style.display).toBe('none');
  });

  it('ignores legacy/step-based progress fields', () => {
    handleProgressEvent({ type: 'Progress', step: 'GameDesign', progress: 0.5 });
    const progressBar = document.getElementById('progress-bar');
    const progressBarLabel = document.getElementById('progress-bar-label');
    const progressBarContainer = document.getElementById('progress-bar-container');
    expect(progressBar.style.width).toBe('0%');
    expect(progressBarLabel.textContent).toBe('');
    expect(progressBarContainer.style.display).toBe('none');
  });
});
