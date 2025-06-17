# Pipeline-v3 Test Plan (TDD-First)

> All code for pipeline-v3 MUST be written only after the relevant tests below are implemented and passing (initially with mocks / TODO expectations).

---

## 1 · Scope & Goals
* Verify functional correctness of each new component (agents, controller changes).
* Ensure legacy regressions are caught (playability, lint errors, no external assets).
* Provide fast feedback (<20 s unit, <60 s integration) so the team can iterate confidently.

---

## 2 · Technology Stack
* **Jest** – unit & integration runner.
* **MockOpenAI** – deterministic mock LLM responses.
* **Puppeteer** – headless runtime playability testing (existing helper).
* **Supertest** (optional) – HTTP API tests for `/generate` endpoint.

Directory convention:
```
server/tests/unit/pipeline-v3/*
server/tests/integration/pipeline-v3/*
```

---

## 3 · Unit Tests
### 3.1 ContextStepBuilderAgent
| # | Scenario | Given | Expect |
|---|-----------|-------|--------|
| 1 | Adds new code without erasing old | `gameSource` with a `draw()` fn, step: "Add score" | Result includes `draw()` unchanged **and** new `score` logic |
| 2 | Respects guard-rails | Step tries to include `alert()` | StaticChecker later fails; builder itself allowed but our guard covers it (see 3.2) |
| 3 | No external asset creation | Mock LLM returns `new Image()`; StaticChecker should catch (see 3.2) |

### 3.2 StaticCheckerAgent (v-3 mode)
| # | Scenario | Input | Expect |
|---|----------|-------|--------|
| 1 | Valid code | simple `function foo(){}` | `errors.length === 0` |
| 2 | Undefined variable | `bar()` | `no-undef` error returned |
| 3 | External asset usage | `const img=new Image();img.src='foo.png'` | Error `external-asset` custom rule |
| 4 | Oversize file | ≥2501 lines dummy file | Error `file-too-large` |

### 3.3 ContextStepFixerAgent
| # | Scenario | Given | Expect |
|---|-----------|-------|--------|
| 1 | Fixes eslint error | Source with `bar()` + error list | Returns code with `function bar(){}` added |

---

## 4 · Integration Tests
### 4.1 Happy Path – Two-Step Game
* **Plan**: (1) "Setup canvas", (2) "Draw rectangle".
* Mock LLM responses pre-canned to add the necessary code each step.
* Assertions:
  1. Pipeline completes with `playable === true`.
  2. Final `game.js` contains both setup and rectangle drawing.
  3. No lint errors, no external asset strings.

### 4.2 Guard-rail Violation – External Image
* Step 2 mock includes `new Image()`.
* Expect pipeline to abort after StaticChecker with appropriate error.

### 4.3 Retry Path – Fixer Recovers
* Builder introduces an undefined var; StaticChecker fails; Fixer mock returns corrected code; pipeline succeeds.

---

## 5 · Non-Functional Tests
* **Performance**: log build time; warn if >30 s for 5-step mock plan.
* **Memory**: ensure `gameSource.length` remains < 65 kB after 10 incremental steps (guard against runaway code).

---

## 6 · CI Configuration
* `npm run test:unit:v3` – runs all unit tests in `pipeline-v3` dir.
* `npm run test:integration:v3` – runs integration suite (Puppeteer in `--ci` mode, XVFB if needed).
* Workflow must green-light before allowing merge to `main`.

---

**End of Test Plan – ready for implementation of empty test files.**
