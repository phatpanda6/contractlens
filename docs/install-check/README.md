# Install check: the skill in a separate project

This checks one thing: that the skill runs in a project that is not
ContractLens, using only the files inside the plugin folder.

## Setup

A new folder outside this repository, with no ContractLens code and no
installed packages:

- `old.json`: `{ "title": "Hoodie", "price": 10 }`
- `new.json`: `{ "price": "10", "currency": "AUD" }`
- `src/label.mjs`: builds a label with `product.title.toUpperCase()` and
  `product.price.toFixed(2)`.
- `test/label.test.mjs`: uses Node's built-in test runner, loads the response
  named by `RESPONSE_FILE`, and expects `HOODIE: $10.00`.

Both breaking changes break this code, but the code reads `title` first, so a
test on the full new response only ever shows the `title` error.

One fresh `claude -p` session was run in that folder with
`--plugin-dir <contractlens>/plugin` and this prompt:

> Use the api-change-investigation skill. Baseline: old.json. Latest:
> new.json. Consumer folder: src. Test command: RESPONSE_FILE={response} node
> --test test/label.test.mjs

Edit tools were not allowed.

## Result

- The skill loaded as `contractlens:api-change-investigation` and ran the
  bundled checker with plain `node`.
- Both `title` and `price` were reported as confirmed broken, each with its
  own test failure. `currency` was reported as an observed change only.
- No file in the project changed.

## Installed from GitHub

After this was merged, the plugin was installed on the author's machine with
the two commands in the main README (`claude plugin marketplace add
phatpanda6/contractlens`, then `claude plugin install
contractlens@contractlens`). One more fresh session in the same separate
project, this time with no `--plugin-dir`, ran the bundled checker from the
installed copy and gave the same three findings. No file in the project
changed.

## What this does not show

- It is one run on a made-up project written for this check. It is not a
  measurement.
- The install was done by the author, on one machine (macOS). Nobody else
  has installed the skill yet.

## The run

Model: claude-opus-5-5. Turns: 8. `<contractlens>` is this repository,
`<project>` the separate folder and `<tmp>` a temporary folder.

### Tool calls

```
Skill: contractlens:api-change-investigation
```

```
Bash: node "<contractlens>/plugin/skills/api-change-investigation/scripts/contractlens.mjs" compare old.json new.json --json; echo "exit=$?"; ls -R src test
```

```
Bash: cat -n src/label.mjs; echo ---; cat -n test/label.test.mjs; echo ---; grep -rnwE 'title|price' src
```

```
Bash: S="<contractlens>/plugin/skills/api-change-investigation/scripts/contractlens.mjs"
for f in old.json new.json; do echo "== $f"; RESPONSE_FILE=$f node --test test/label.test.mjs 2>&1 | grep -E "Error|label.mjs:|^# (pass|fail)" | head -5; done
D=$(mktemp -d); node "$S" isolate old.json new.json --out "$D"
```

```
Bash: D=<tmp>
for f in old.json new.json $D/1-title.json $D/2-price.json $D/3-currency.json; do out=$(RESPONSE_FILE=$f node --test test/label.test.mjs 2>&1); echo "== $(basename $f) exit=$?"; echo "$out" | grep -E "Error|label.mjs:" | head -2; done
```

```
Bash: D=<tmp>
for f in old.json new.json $D/1-title.json $D/2-price.json $D/3-currency.json; do RESPONSE_FILE=$f node --test test/label.test.mjs >/dev/null 2>&1; rc=$?; echo "$(basename $f) exit=$rc"; done
```

### Final answer (verbatim)

## API change investigation

Three fields changed. Two of them, `title` and `price`, each break the test on their own. The third, `currency`, was added and the test still passes with it.

Old response: old.json
New response: new.json
Code searched: src

| Field | Change | Could break code? | Finding | Evidence |
|---|---|---|---|---|
| `title` | removed | Yes | Confirmed broken | Fails on its own: `TypeError: Cannot read properties of undefined (reading 'toUpperCase')` at `src/label.mjs:3:27` |
| `price` | number -> string | Yes | Confirmed broken | Fails on its own: `TypeError: product.price.toFixed is not a function` at `src/label.mjs:3:60` |
| `currency` | added | No | Observed change only | None needed (the test also passes with only this change) |

"Could break code?" is the checker's rule about the response shape (Yes = breaking, No = informational). "Finding" is what happened in this code.

### What the test showed
- Old response: passed
- New response (all changes together): failed, `TypeError: Cannot read properties of undefined (reading 'toUpperCase')` at `src/label.mjs:3:27`. This run stops at the first error, so only the `title` failure shows here.
- Only `title` changed: failed, `TypeError: Cannot read properties of undefined (reading 'toUpperCase')` at `src/label.mjs:3:27`
- Only `price` changed: failed, `TypeError: product.price.toFixed is not a function` at `src/label.mjs:3:60`
- Only `currency` changed: passed

To re-run: `RESPONSE_FILE={response} node --test test/label.test.mjs`, replacing `{response}` with a file path.

### Not checked
- Only the `src` folder was searched. Code elsewhere that reads this response wasn't looked at.
- These results come from the saved files `old.json` and `new.json`, not the live API.
- A passing test proves only what that test checks. This one checks a single exact label string (`"HOODIE: $10.00"`), so the pass with `currency` added only means that label didn't change.
