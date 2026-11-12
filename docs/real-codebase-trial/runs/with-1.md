# Run with-1 (with the skill)

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
| `testRun.createdAt` | string -> number | breaking | May be affected | read at `app/saved-result.ts:12`, `app/saved-result.ts:20`; parsed value used at `app/dashboard.tsx:428`, `430`, `665`, `666` |
| `testRun.errorMessage` | removed | breaking | May be affected | read at `app/saved-result.ts:31`; parsed value used at `app/dashboard.tsx:466`, `568`, `593`, `656` |
| `endpoint.projectId` | string -> number | breaking | No usage found | searched `app`; no matches for `projectId` |
| `testRun.durationMs` | added | info | Observed change only | not searched (info) |

The error text for `baselineSourceUrl` says "baseline source" rather than the literal field name. I labelled it confirmed because the guard that throws (`app/saved-result.ts:70-73`) checks only `endpoint.baselineSourceUrl`.

### Test evidence
Command: `RUN_RESPONSE_FIXTURE=docs/real-codebase-trial/fixtures/run-response-v2.json npx vitest run app/saved-result.response.test.ts`
Baseline run: passed (1 test passed)
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
- Only the `app` folder was searched; code elsewhere that reads these fields was not looked at.
- The result is based on saved response files, not a live API.
- The test stops at its first failure (`baselineSourceUrl`), so the code that reads `testRun.createdAt` and `testRun.errorMessage` never ran against the latest response. Those two fields are not confirmed broken and not proven safe.
- Only the one test file given was run; no other tests in `app` were run against the latest response.
- Matches for `createdAt`, `errorMessage` and `baselineSourceUrl` in `app/page.tsx` and under `app/api/` were not counted as reads, since they are database queries and the routes that produce the response.
