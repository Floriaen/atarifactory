# BlockInserterAgent Test Cases

This document outlines the test cases for the `BlockInserterAgent` and their expected outputs. The agent is expected to perform a "preservative merge" - keeping all code from both the current and step code, combining them in a way that maintains the original functionality while adding the new functionality.

## Test Cases

### 1. Basic Function Merge Test
```javascript
// Input:
currentCode: 'function update() { console.log("old"); }'
stepCode: 'function update() { console.log("new"); }'

// Expected Output:
function update() {
  console.log("old");
  console.log("new");
}
```

### 2. Early Returns Test
```javascript
// Input:
currentCode: 'function foo() { if (a) return 1; return 2; }'
stepCode: 'function foo() { if (b) return 3; }'

// Expected Output:
function foo() {
  if (a) return 1;
  if (b) return 3;
  return 2;
}
```

### 3. Control Flow Test
```javascript
// Input:
currentCode: 'function baz() { for (let i = 0; i < 3; i++) { doA(); } }'
stepCode: 'function baz() { while (true) { doB(); break; } }'

// Expected Output:
function baz() {
  for (let i = 0; i < 3; i++) {
    doA();
  }
  while (true) {
    doB();
    break;
  }
}
```

### 4. Multiple Functions Test
```javascript
// Input:
currentCode: 'function a() { return 1; } function b() { return 2; }'
stepCode: 'function a() { doA(); } function c() { return 3; }'

// Expected Output:
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

### 5. Nested Functions Test
```javascript
// Input:
currentCode: 'function outer() { function inner() { return 1; } }'
stepCode: 'function outer() { function inner2() { return 2; } }'

// Expected Output:
function outer() {
  function inner() {
    return 1;
  }
  function inner2() {
    return 2;
  }
}
```

### 6. Comments and Formatting Test
```javascript
// Input:
currentCode: 'function foo() { /* old comment */ console.log("old"); }'
stepCode: 'function foo() { // new comment\nconsole.log("new"); }'

// Expected Output:
function foo() {
  /* old comment */
  console.log("old");
  // new comment
  console.log("new");
}
```

## Key Behaviors

The `BlockInserterAgent` should:

1. Preserve all code from both inputs
2. Maintain the original structure of the code
3. Keep all comments and documentation
4. Handle different types of code blocks (functions, classes, etc.)
5. Merge duplicate declarations appropriately
6. Preserve formatting and whitespace where possible
7. Handle early returns and control flow correctly
8. Maintain proper scoping of variables and functions