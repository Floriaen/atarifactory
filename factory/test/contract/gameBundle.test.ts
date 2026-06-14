import { describe, it, expect } from 'vitest';
import { parseGameBundle } from '../../src/contracts/gameBundle.js';
import { GameCode } from '../../src/contracts/codeSchemas.js';
import { gameBundleFixture, gameCodeFixture } from '../helpers/fixtures.js';

describe('GameBundleV1 contract', () => {
  it('accepts a valid bundle fixture', () => {
    expect(() => parseGameBundle(gameBundleFixture)).not.toThrow();
  });

  it('rejects unknown top-level fields', () => {
    expect(() => parseGameBundle({ ...gameBundleFixture, extra: true })).toThrow();
  });

  it('rejects a wrong schemaVersion', () => {
    expect(() => parseGameBundle({ ...gameBundleFixture, schemaVersion: 'gamebundle/v2' })).toThrow();
  });

  it('rejects a non-index entry', () => {
    expect(() => parseGameBundle({ ...gameBundleFixture, entry: 'main.html' })).toThrow();
  });

  it('rejects a bundle missing index.html', () => {
    const files = gameBundleFixture.files.filter((f) => f.path !== 'index.html');
    expect(() => parseGameBundle({ ...gameBundleFixture, files })).toThrow();
  });

  it('rejects a bundle missing game.js', () => {
    const files = gameBundleFixture.files.filter((f) => f.path !== 'game.js');
    expect(() => parseGameBundle({ ...gameBundleFixture, files })).toThrow();
  });

  it('rejects a bundle missing the inlined sprite-data file', () => {
    const files = gameBundleFixture.files.filter((f) => f.path !== 'sprites.data.js');
    expect(() => parseGameBundle({ ...gameBundleFixture, files })).toThrow();
  });

  it('rejects duplicate file paths', () => {
    const files = [...gameBundleFixture.files, { path: 'game.js', contents: 'duplicate' }];
    expect(() => parseGameBundle({ ...gameBundleFixture, files })).toThrow();
  });

  it('rejects fewer than three files', () => {
    expect(() => parseGameBundle({ ...gameBundleFixture, files: gameBundleFixture.files.slice(0, 2) })).toThrow();
  });

  it('rejects empty file contents', () => {
    const files = gameBundleFixture.files.map((f) => (f.path === 'game.js' ? { ...f, contents: '' } : f));
    expect(() => parseGameBundle({ ...gameBundleFixture, files })).toThrow();
  });
});

describe('GameCode contract', () => {
  it('accepts a non-empty js fixture', () => {
    expect(() => GameCode.parse(gameCodeFixture)).not.toThrow();
  });

  it('rejects empty js', () => {
    expect(() => GameCode.parse({ js: '' })).toThrow();
  });

  it('rejects unknown fields', () => {
    expect(() => GameCode.parse({ js: 'const a = 1;', foo: 1 })).toThrow();
  });
});
