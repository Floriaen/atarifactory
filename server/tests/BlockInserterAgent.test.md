# BlockInserterAgent Test Analysis

## Overview
This document analyzes the failing tests for BlockInserterAgent, showing the input code, actual output, and expected output for each case.

## Failed Tests Analysis

### 1. "should merge new code into existing code"
**Input:**
```javascript
// currentCode
function update() {
  // existing logic
}

// stepCode
function update() {
  // new logic
  player.x += 1;
}
```

**Actual Output:**
```javascript
export function update() {
  // new logic
  player.x += 1;
}
```

**Expected Output:**
```javascript
function update() {
  // existing logic
  // new logic
  player.x += 1;
}
```

**Issue:** Function body replacement instead of merging

### 2. "should handle empty stepCode"
**Not implemented in .test.js**

### 3. "should preserve function declarations"
**Not implemented in .test.js**

### 4. "should handle variable declarations correctly (AST)"
**Not implemented in .test.js**

### 5. "should merge stepCode into an existing function if names match"
**Input:**
```javascript
// currentCode
function update() { console.log("old"); }

// stepCode
function update() { console.log("new"); }
```

**Actual Output:**
```javascript
export function update() {
  console.log("new");
}
```

**Expected Output:**
```javascript
function update() {
  console.log("old");
  console.log("new");
}
```

**Issue:** Function body replacement

### 6. "should merge functions with early returns without breaking logic"
**Input:**
```javascript
// currentCode
function foo() { if (a) return 1; return 2; }

// stepCode
function foo() { if (b) return 3; }
```

**Actual Output:**
```javascript
export function foo() {
  if (b) return 3;
}
```

**Expected Output:**
```javascript
function foo() {
  if (a) return 1;
  if (b) return 3;
  return 2;
}
```

**Issue:** Control flow and early returns not preserved

### 7. "should merge functions with different control flow"
**Input:**
```javascript
// currentCode
function baz() { for(let i=0; i<3; i++) { doA(); } }

// stepCode
function baz() { while(true) { doB(); break; } }
```

**Actual Output:**
```javascript
export function baz() {
  while(true) {
    doB();
    break;
  }
}
```

**Expected Output:**
```javascript
function baz() {
  for(let i=0; i<3; i++) {
    doA();
  }
  while(true) {
    doB();
    break;
  }
}
```

**Issue:** Control flow statements not merged

### 8. "should merge multiple functions at once"
**Input:**
```javascript
// currentCode
function a() { doA(); return 1; }
function b() { return 2; }

// stepCode
function a() { doA(); }
function c() { return 3; }
```

**Actual Output:**
```javascript
export function b() {
  return 2;
}
export function a() {
  doA();
}
export function c() {
  return 3;
}
```

**Expected Output:**
```javascript
function a() {
  doA();
  return 1;
}
function b() {
  return 2;
}
function c() {
  return 3;
}
```

**Issue:** Function body replacement

### 9. "should merge code with nested functions"
**Input:**
```javascript
// currentCode
function outer() { function inner() { return 1; } }

// stepCode
function outer() { function inner2() { return 2; } }
```

**Actual Output:**
```javascript
export function outer() {
  function inner2() {
    return 2;
  }
}
```

**Expected Output:**
```javascript
function outer() {
  function inner() {
    return 1;
  }
  function inner2() {
    return 2;
  }
}
```

**Issue:** Nested functions not preserved

### 10. "should merge code with comments and formatting differences"
**Input:**
```javascript
// currentCode
function foo() { /* old comment */ console.log("old"); }

// stepCode
function foo() { // new comment
console.log("new"); }
```

**Actual Output:**
```javascript
export function foo() {
  // new comment
  console.log("new");
}
```

**Expected Output:**
```javascript
function foo() {
  /* old comment */
  console.log("old");
  // new comment
  console.log("new");
}
```

**Issue:** Comments not preserved

### 11. "should merge function bodies correctly across multiple steps"
**Not implemented in .test.js**

## Common Issues Summary
1. Function body replacement instead of merging
2. Comments not preserved
3. Nested functions not handled
4. Control flow statements not preserved
5. Early returns not handled correctly
6. Multiple steps not properly merged
7. All functions being made exported 