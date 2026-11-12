---
name: api-change-investigation
description: Investigate how an API response change affects consuming code. Compares a baseline and a latest saved JSON response with the ContractLens compare command, searches the given consumer folder for code that reads each changed field, and, when given a test command, runs the test against each changed field on its own. Reports each field as confirmed broken, test still passes, may be affected, no usage found, or observed change only. Use when asked whether an API response change breaks a frontend or other consumer.
---

# API change investigation

Sort every changed field in an API response into one honest label, with
evidence. The compare command decides what changed and whether the schema
rule is breaking. Tests decide what is proven. You search, run the commands
and report the evidence. You never overrule the command's verdict or a test
result.

This is a read-only investigation of saved response files. It is not live
monitoring.

## Inputs

1. **Baseline file**: the old response (JSON).
2. **Latest file**: the new response (JSON).
3. **Consumer folder**: the folder of code that uses the response.
4. **Test command** (optional): a command containing `{response}` where the
   response file path goes.

If 1, 2 or 3 is missing, ask for it. Do not guess paths and do not go looking
for a test command.

Demo inputs in this repository:

- Baseline: `examples/products-consumer/fixtures/product-v1.json`
- Latest: `examples/products-consumer/fixtures/product-v2.json`
- Consumer folder: `examples/products-consumer`
- Test command: `PRODUCT_FIXTURE={response} npx vitest run examples/products-consumer`

## Rules

- Never edit, create or delete files in the repository. Never write or change
  a test.
- The only files you may create are the ones the isolate command writes, in a
  temporary folder outside the repository.
- Never change a baseline.
- Never describe a removed field and a new field as a rename. Report them as
  two separate changes.
- Show the compare command's `breaking` or `info` verdict exactly as given.
- Never write "confirmed broken" or "test still passes" without a test run
  from this investigation to show for it.
- Search only the consumer folder.
- Give each changed field exactly one label.

## Steps

Run all commands from the repository root.

### 1. Compare the responses

```bash
npm run --silent compare -- <baseline> <latest> --json
```

- Exit code 2: the input is invalid. Show the error message and stop.
- Exit code 0 or 1: read the JSON. `diffs` lists the changes; each has a
  `path`, a `type` and a `severity` (`breaking` or `info`).
- If `counts.total` is 0, report that no changes were found and stop.

### 2. Search for code that reads each changed field

For every `breaking` diff, take the field name: the last part of `path`,
without `[]` or `$`. Search the consumer folder for that name as a whole word.

- Ignore the baseline and latest files and other `.json` data files.
- Count only code that uses the value from this response, such as
  `product.price` or a destructured `{ price }`. A type declaration, a
  comment, or code that produces the response is not a read.
- Record each read as `file:line`.

### 3. Test each change on its own (only if a test command was given)

A run passes when its exit code is 0. To run the test against a file, replace
`{response}` in the test command with that file's path.

1. Run the test against the baseline. If it fails, the test cannot prove
   anything about this change: say so, skip the rest of this step, and label
   as if no test command was given.
2. Run the test against the latest file. Note whether it passes or fails.
3. Write one file per change, each being the baseline with only that change
   applied:

   ```bash
   npm run --silent isolate -- <baseline> <latest> --out "$(mktemp -d)"
   ```

   The output lists each change with its `file`. A change with `file: null`
   could not be isolated; its `reason` says why.
4. Run the test against every listed file, including `info` changes. For each
   one, record pass or fail, and for a failure keep the error message and the
   failing file and line.

### 4. Label each changed field

Use the first label that applies:

| Label | When it applies |
|---|---|
| **Confirmed broken** | The test passed on the baseline and failed on the file with only this field changed. |
| **Test still passes** | Code in the consumer folder reads the field, and the test passed on the file with only this field changed. |
| **May be affected** | `breaking`, code in the consumer folder reads the field, and there is no test result for this field alone (no test command, the baseline run failed, or the change could not be isolated). |
| **No usage found** | `breaking`, and no code in the consumer folder reads the field. |
| **Observed change only** | The severity is `info`. |

- "Test still passes" means only that this one test passed. It is not proof
  the change is safe; say what the test checks if that is clear from the test.
- If the latest file failed but no single change failed on its own, say that
  the failure only appears when changes are combined.
- A test run on the full latest file stops at its first failure, so use the
  per-field runs, not the latest run, to label individual fields.

### 5. Report

Use this layout:

```
## API change investigation

Baseline: <path>
Latest: <path>
Consumer folder: <path>
Compare command: <N> breaking, <N> info

| Field | Change | Schema verdict | Finding | Evidence |
|---|---|---|---|---|
| `price` | number -> string | breaking | Confirmed broken | fails on its own: <error> at <file:line> |

### Test evidence
Command: <the test command as given>
Baseline: passed
Latest (all changes): failed, <error>
Per field:
- `price`: failed, <error> at <file:line>
- `title`: passed

### Not checked
- <what this run did not cover>
```

- In "Change", write the compare command's finding: `removed`, `added`, or
  `<from> -> <to>`.
- Evidence for "confirmed broken" is the error from that field's own run.
  Evidence for "test still passes" and "may be affected" includes the
  `file:line` of each read. Evidence for "no usage found" is the folder that
  was searched, plus that field's test result if there is one.
- If no test command was given, replace the test section with one line saying
  no test was run, so nothing can be confirmed broken or shown to pass.
- Under "Not checked", always say that only the consumer folder was searched,
  that the result is based on saved response files, and that a passing test
  proves only what that test checks. Add anything else that applies.
- Do not suggest fixes unless asked.
