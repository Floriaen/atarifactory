# Code Merge Module Analysis and Requirements

## Overview
This document outlines the requirements for the code merging functionality and analyzes the current implementation's failures. The goal is to perform a "preservative merge" - keeping all code from both the current and step code, combining them in a way that maintains the original functionality while adding the new functionality.

## Key Behaviors Required

The code merge module should:

1. Preserve all code from both inputs
2. Maintain the original structure of the code
3. Keep all comments and documentation
4. Handle different types of code blocks (functions, classes, etc.)
5. Merge duplicate declarations appropriately
6. Preserve formatting and whitespace where possible
7. Handle early returns and control flow correctly
8. Maintain proper scoping of variables and functions

## Current Implementation Issues

The current implementation using `ast-merge` fails to meet these requirements. Here's a detailed analysis of the failures:

### 1. Function Body Replacement Instead of Merging
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

**Current Output:**
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

### 2. Comments Not Preserved
**Input:**
```javascript
// currentCode
function foo() { /* old comment */ console.log("old"); }

// stepCode
function foo() { // new comment
console.log("new"); }
```

**Current Output:**
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

### 3. Nested Functions Not Handled
**Input:**
```javascript
// currentCode
function outer() { function inner() { return 1; } }

// stepCode
function outer() { function inner2() { return 2; } }
```

**Current Output:**
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

### 4. Control Flow Not Preserved
**Input:**
```javascript
// currentCode
function foo() { if (a) return 1; return 2; }

// stepCode
function foo() { if (b) return 3; }
```

**Current Output:**
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

### 5. Multiple Steps Not Properly Merged
**Input:**
```javascript
// Step 1
const player = { x: 0, y: 0, speed: 5 };
function update() {
  // Player movement
  if (keys.ArrowLeft) player.x -= player.speed;
  if (keys.ArrowRight) player.x += player.speed;
}

// Step 2
const coins = [];
let score = 0;
function update() {
  // Coin collection
  for (const coin of coins) {
    if (checkCollision(player, coin)) {
      score += 10;
      coins.splice(coins.indexOf(coin), 1);
    }
  }
}

// Step 3
const gameObjects = [];
function update() {
  // Collision detection
  for (const obj1 of gameObjects) {
    for (const obj2 of gameObjects) {
      if (obj1 !== obj2 && checkCollision(obj1, obj2)) {
        handleCollision(obj1, obj2);
      }
    }
  }
}
```

**Current Output:**
```javascript
const player = { x: 0, y: 0, speed: 5 };
const coins = [];
let score = 0;
const gameObjects = [];
export function update() {
  // Collision detection
  for (const obj1 of gameObjects) {
    for (const obj2 of gameObjects) {
      if (obj1 !== obj2 && checkCollision(obj1, obj2)) {
        handleCollision(obj1, obj2);
      }
    }
  }
}
```

**Expected Output:**
```javascript
const player = { x: 0, y: 0, speed: 5 };
const coins = [];
let score = 0;
const gameObjects = [];
function update() {
  // Player movement
  if (keys.ArrowLeft) player.x -= player.speed;
  if (keys.ArrowRight) player.x += player.speed;

  // Coin collection
  for (const coin of coins) {
    if (checkCollision(player, coin)) {
      score += 10;
      coins.splice(coins.indexOf(coin), 1);
    }
  }

  // Collision detection
  for (const obj1 of gameObjects) {
    for (const obj2 of gameObjects) {
      if (obj1 !== obj2 && checkCollision(obj1, obj2)) {
        handleCollision(obj1, obj2);
      }
    }
  }
}
```

## Common Issues Summary
1. Function body replacement instead of merging
2. Comments not preserved
3. Nested functions not handled
4. Control flow statements not preserved
5. Early returns not handled correctly
6. Multiple steps not properly merged
7. All functions being made exported

## Proposed Solution
The current implementation using `ast-merge` is not suitable for our needs. We should:

1. Use `@babel/parser` to parse the code into AST
2. Use `@babel/traverse` to analyze and modify the AST
3. Implement custom merging logic that:
   - Preserves all code blocks
   - Maintains comments and documentation
   - Handles nested structures
   - Preserves control flow
   - Properly merges function bodies
   - Maintains proper scoping

This will allow us to have full control over the merging process and ensure all requirements are met. 