# Run without-1 (without the skill)

Model: claude-fable-5-2. Turns: 13. Files changed: none.

`<copy>` stands for the clean copy of the repository the session ran in.

## Tool calls

```
Read: <copy>/docs/real-codebase-trial/fixtures/run-response-v1.json
```

```
Read: <copy>/docs/real-codebase-trial/fixtures/run-response-v2.json
```

```
Glob: app/**/*
```

```
Grep: projectId|baselineSourceUrl|errorMessage|createdAt|durationMs
```

```
Read: <copy>/app/run-check-button.tsx
```

```
Read: <copy>/app/saved-result.ts
```

```
Read: <copy>/app/dashboard-types.ts
```

```
Read: <copy>/app/endpoint-actions.tsx
```

```
Grep: applySavedResult|onSaved|durationMs
```

```
Grep: applySavedResult|onSavedResult
```

```
Read: <copy>/app/saved-result.response.test.ts
```

```
Bash: npx vitest run app/saved-result.response.test.ts 2>&1 | tail -15; RUN_RESPONSE_FIXTURE=$PWD/docs/real-codebase-trial/fixtures/run-response-v2.json npx vitest run app/saved-result.response.test.ts 2>&1 | tail -30
```

## Final answer (verbatim)

---

Yes, the v2 response breaks the dashboard's "Run check" flow. I ran the existing fixture test (`app/saved-result.response.test.ts`) against both files: v1 passes, v2 fails with `Invalid baseline source`.

After a run, the dashboard passes the response through `applySavedResult` in `app/saved-result.ts`, which throws on two of the v2 changes:

| Change in v2 | Effect | Where |
|---|---|---|
| `endpoint.baselineSourceUrl` is now an object `{ url, capturedAt }` instead of a string | **Breaks**: throws `Invalid baseline source` | `app/saved-result.ts:70` |
| `testRun.createdAt` is now an epoch-ms number instead of an ISO string | **Breaks**: throws `Invalid saved check` (it would be hit once the first is fixed) | `app/saved-result.ts:12` |
| `testRun.errorMessage` removed | Harmless for this response: it falls back to `null`. | `app/saved-result.ts:30` |
| `endpoint.projectId` is now a number instead of a string | Harmless: nothing in `app` reads it from this response | — |
| `testRun.durationMs` added | Harmless: ignored | — |

The user-visible effect is that clicking "Run check" shows "The saved result could not be displayed. Reload the page to retrieve it." and the new run does not appear. The check itself has still run and been saved by then, so a reload shows it.

If `errorMessage` is gone from ERROR runs too, a fresh failed run would show the generic "Check could not complete" instead of the specific reason until reload. The fixture only covers a FAIL run, so I couldn't confirm that case.

I haven't changed anything. The fix is to accept both shapes in `applySavedResult` and `readRun`: read `baselineSourceUrl.url` when it is an object, and accept a numeric `createdAt`.
