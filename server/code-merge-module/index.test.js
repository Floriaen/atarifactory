const { mergeCode } = require('./index');
const fs = require('fs').promises;
const path = require('path');

describe('Code Merge Module', () => {
  const testDir = path.join(__dirname, 'test-files');
  
  beforeEach(async () => {
    // Create test directory if it doesn't exist
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(testDir);
      await Promise.all(files.map(file => 
        fs.unlink(path.join(testDir, file))
      ));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  });

  it('should merge two pieces of code correctly', async () => {
    const currentCode = `
      function foo() {
        console.log('a');
      }
    `;
    
    const stepCode = `
      function foo() {
        console.log('b');
      }
    `;

    const merged = await mergeCode(currentCode, stepCode);
    
    // The merged code should contain both console.log statements
    expect(merged).toContain("console.log('a')");
    expect(merged).toContain("console.log('b')");
  });

  it('should handle variable declarations', async () => {
    const currentCode = `
      const x = 1;
      let y = 2;
    `;
    
    const stepCode = `
      const x = 3;
      let z = 4;
    `;

    const merged = await mergeCode(currentCode, stepCode);
    
    // Should keep the latest x value and both y and z
    expect(merged).toContain('const x = 3');
    expect(merged).toContain('let y = 2');
    expect(merged).toContain('let z = 4');
  });

  it('should handle class extensions', async () => {
    const currentCode = `
      class Test {
        constructor() {
          this.x = 1;
        }
      }
    `;
    
    const stepCode = `
      class Test {
        method() {
          return this.x;
        }
      }
    `;

    const merged = await mergeCode(currentCode, stepCode);
    
    // Should have both constructor and method
    expect(merged).toContain('constructor()');
    expect(merged).toContain('method()');
  });
}); 