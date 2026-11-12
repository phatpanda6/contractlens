---
name: api-change-investigation
description: Investigate how an API response change affects consuming code. Compares a baseline and a latest saved JSON response with the ContractLens compare command, searches the given consumer folder for code that reads each changed field, optionally runs a focused test against both responses, and reports each field as confirmed broken, may be affected, no usage found, or observed change only. Use when asked whether an API response change breaks a frontend or other consumer.
---

# API change investigation

Sort every changed field in an API response into one honest label, with
evidence. The compare command decides what changed and whether the schema
rule is breaking. You investigate impact and report evidence. You never
overrule the command's verdict.

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

- Never edit, create or delete files. Never write or change a test.
- Never change a baseline.
- Never describe a removed field and a new field as a rename. Report them as
  two separate changes.
- Show the compare command's `breaking` or `info` verdict exactly as given.
- Never write "confirmed broken" without quoting test output from this run.
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

For every diff, take the field name: the last part of `path`, without `[]`
or `$`. Search the consumer folder for that name as a whole word.

- Ignore the baseline and latest files and other `.json` data files.
- Count only code that uses the value, such as `product.price` or a
  destructured `{ price }`. A type declaration or a comment alone is not a
  read.
- Record each read as `file:line`.
- Skip this search for `info` diffs.

### 3. Run the test against both responses (only if a test command was given)

Replace `{response}` with the baseline path and run the command. Then replace
it with the latest path and run it again. A run passes when its exit code is 0.

- Fails on the baseline: the test cannot prove anything about this change.
  Say so, and confirm nothing.
- Passes on both: nothing is confirmed broken.
- Passes on the baseline and fails on the latest: keep the error message and
  the failing file and line.

### 4. Label each changed field

Use the first label that applies:

| Label | When it applies |
|---|---|
| **Confirmed broken** | The test passed on the baseline and failed on the latest, and the error message itself names this field (for example `price.toFixed is not a function`) or a failed assertion shows this field's value. |
| **May be affected** | `breaking`, and code in the consumer folder reads the field. |
| **No usage found** | `breaking`, and no code in the consumer folder reads the field. |
| **Observed change only** | The severity is `info`. |

Being on the same source line as the failing expression does not make a field
confirmed broken. The error has to name the field.

A test stops at its first failure, so a field that is not confirmed is not
proven safe.

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
| `price` | number -> string | breaking | Confirmed broken | test fails: <error> at <file:line> |

### Test evidence
Command: <command with the latest path>
Baseline run: passed
Latest run: failed
<the error lines, quoted>

### Not checked
- <what this run did not cover>
```

- In "Change", write the compare command's finding: `removed`, `added`, or
  `<from> -> <to>`.
- Evidence for "may be affected" is the `file:line` of each read. Evidence for
  "no usage found" is the folder that was searched.
- If no test command was given, replace the test section with one line saying
  no test was run, so nothing can be confirmed broken.
- Under "Not checked", always say that only the consumer folder was searched
  and that the result is based on saved response files. Add anything else
  that applies, such as no test being run or the test failing on the baseline.
- Do not suggest fixes unless asked.
