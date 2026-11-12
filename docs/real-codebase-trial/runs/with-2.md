# Run with-2 (with the skill)

Model: claude-fable-5-2. Turns: 9. Files changed: none.

`<copy>` stands for the clean copy of the repository the session ran in.

## Tool calls

```
Skill: api-change-investigation
```

```
Bash: npm run --silent compare -- docs/real-codebase-trial/fixtures/run-response-v1.json docs/real-codebase-trial/fixtures/run-response-v2.json --json; echo "EXIT=$?"
```

```
Bash: RUN_RESPONSE_FIXTURE=docs/real-codebase-trial/fixtures/run-response-v1.json npx vitest run app/saved-result.response.test.ts 2>&1 | tail -40; echo "EXIT=${pipestatus[1]}"
```

```
Bash: RUN_RESPONSE_FIXTURE=docs/real-codebase-trial/fixtures/run-response-v2.json npx vitest run app/saved-result.response.test.ts 2>&1 | tail -60; echo "EXIT=${pipestatus[1]}"
```

```
Grep: \b(projectId|baselineSourceUrl|errorMessage|createdAt)\b
```

```
Read: <copy>/app/saved-result.ts
```

```
Read: <copy>/app/saved-result.response.test.ts
```

## Final answer (verbatim)

---

## API change investigation

Baseline: `docs/real-codebase-trial/fixtures/run-response-v1.json`
Latest: `docs/real-codebase-trial/fixtures/run-response-v2.json`
Consumer folder: `app`
Compare command: 4 breaking, 1 info

| Field | Change | Schema verdict | Finding | Evidence |
|---|---|---|---|---|
| `endpoint.baselineSourceUrl` | string -> object | breaking | Confirmed broken | test fails: `Error: Invalid baseline source` at `app/saved-result.ts:74` |
| `testRun.createdAt` | string -> number | breaking | May be affected | read at `app/saved-result.ts:12`, `app/saved-result.ts:20`, `app/dashboard.tsx:428`, `app/dashboard.tsx:430`, `app/dashboard.tsx:665`, `app/dashboard.tsx:666` |
| `testRun.errorMessage` | removed | breaking | May be affected | read at `app/saved-result.ts:31`, `app/dashboard.tsx:466`, `app/dashboard.tsx:568`, `app/dashboard.tsx:593`, `app/dashboard.tsx:656` |
| `endpoint.projectId` | string -> number | breaking | No usage found | searched `app`; no occurrences of `projectId` in code |
| `testRun.durationMs` | added | info | Observed change only | not searched (info) |

The error for `baselineSourceUrl` names the field in words ("baseline source"), not by its identifier. I counted it as confirmed because the guard that throws at `app/saved-result.ts:70-75` checks only `endpoint.baselineSourceUrl`.

### Test evidence
Command: `RUN_RESPONSE_FIXTURE=docs/real-codebase-trial/fixtures/run-response-v2.json npx vitest run app/saved-result.response.test.ts`
Baseline run: passed (1 test)
Latest run: failed

```
 FAIL  app/saved-result.response.test.ts > accepts a saved run-check response
Error: Invalid baseline source
 ❯ applySavedResult app/saved-result.ts:74:11
     72|     typeof endpoint.baselineSourceUrl !== "string"
     73|   ) {
     74|     throw new Error("Invalid baseline source");
 ❯ app/saved-result.response.test.ts:34:19
```

### Not checked
- Only the `app` folder was searched; code elsewhere that uses this response was not looked at.
- The result is based on saved response files, not a live API.
- The test stopped at its first failure, before `testRun` was read (`app/saved-result.ts:84`). `createdAt` and `errorMessage` are therefore neither confirmed broken nor proven safe.
- Only the one test file, with the `"run"` action, was run; the `"accept"` and `"save"` paths and the dashboard rendering were not exercised.
- Field searches matched by name. Matches that were database queries, writes, type declarations or test fixtures were not counted as reads.
