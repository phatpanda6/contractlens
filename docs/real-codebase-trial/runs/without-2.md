# Run without-2 (without the skill)

Model: claude-fable-5-2. Turns: 12. Files changed: none.

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
Read: <copy>/app/run-check-button.tsx
```

```
Read: <copy>/app/saved-result.ts
```

```
Read: <copy>/app/dashboard-types.ts
```

```
Grep: projectId|baselineSourceUrl|errorMessage|createdAt|durationMs
```

```
Read: <copy>/app/endpoint-actions.tsx
```

```
Read: <copy>/app/saved-result.response.test.ts
```

```
Grep: applySavedResult|onSaved|performAction|EndpointActionsProvider
```

```
Bash: npx vitest run app/saved-result.response.test.ts 2>&1 | tail -15; RUN_RESPONSE_FIXTURE=docs/real-codebase-trial/fixtures/run-response-v2.json npx vitest run app/saved-result.response.test.ts 2>&1 | tail -30
```

## Final answer (verbatim)

---

Yes, the v2 response breaks the app: after clicking "Run check", the dashboard rejects the response and shows "The saved result could not be displayed. Reload the page to retrieve it." instead of the new run.

I confirmed this by running the existing `app/saved-result.response.test.ts` against both fixtures: v1 passes, v2 fails with `Invalid baseline source`.

The response has five differences; two of them break the code, both in `applySavedResult` / `readRun` in `app/saved-result.ts`:

| Field | v1 | v2 | Effect |
|---|---|---|---|
| `endpoint.baselineSourceUrl` | string | object `{ url, capturedAt }` | **Breaks.** `app/saved-result.ts:70-75` throws unless it is a string or null. |
| `testRun.createdAt` | ISO string | epoch milliseconds (number) | **Breaks.** `app/saved-result.ts:12` throws `Invalid saved check` unless it is a string. Hidden behind the first failure, so the test only reports the first. |
| `testRun.errorMessage` | `null` | absent | Harmless. `app/saved-result.ts:30-31` falls back to `null`. |
| `endpoint.projectId` | string | number | Harmless. The client never reads it. |
| `testRun.durationMs` | absent | `182` | Harmless. The client ignores it. |

The run itself is still saved on the server, so a page reload shows it; only the in-place update after the click fails.

I haven't changed anything. The fix would be to accept both shapes in `app/saved-result.ts` (read `baselineSourceUrl.url` when it is an object, and accept a numeric `createdAt`).
