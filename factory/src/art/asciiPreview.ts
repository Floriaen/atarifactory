/** Render compiled frames as `#`/`·` rows for trace/CLI eyeballing. No PNG dep. */
export function maskToAscii(frames: boolean[][][]): string {
  return frames
    .map((frame) => frame.map((row) => row.map((on) => (on ? '#' : '·')).join('')).join('\n'))
    .join('\n\n');
}
