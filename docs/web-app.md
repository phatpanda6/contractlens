# Web app demo

Part of the [ContractLens README](../README.md).

## Live Demo

The web app is the hosted demo and a place to inspect saved check history.

[Open the deployed ContractLens demo](https://contractlens-iota.vercel.app/)

The hosted demo accepts only the built-in `/api/demo/products/v1` and
`/api/demo/products/v2` routes. Local and self-hosted installations can also
check validated public HTTPS endpoints. The hosted demo shows deterministic
results; live AI explanation requests are available only in local development.

To try the breaking-change workflow:

1. Choose **Original response v1**, then click **Run check**. The version shortcuts save the target; **Edit endpoint** opens the full configuration form.
2. If the shared demo currently uses a different baseline, click **Accept as new baseline** and run `/v1` again.
3. Confirm that the latest recorded check is `Pass` with `0 changes found`.
4. Choose **Changed response v2**, then click **Run check** again.
5. Confirm that the latest recorded check is `Fail` with `3 changes found`. The detected changes should include:

   - `price` changed from number to string
   - `title` is missing
   - `name` was added
6. Click **Accept as new baseline** after reviewing the detected changes.
7. Confirm that the existing failed check remains in the history, then click **Run check** again. The new check should pass with `0` changes because `/v2` is now the expected contract.

The comparison workspace places detected changes directly above the saved
baseline and latest recorded response. Use the **Response / Schema** switch to
inspect either view. On smaller screens, changes become stacked cards and the
response panels stack vertically. Long JSON scrolls within each panel; previews
are limited to 200 lines and 2,000 characters per line.

Response and schema panels show the baseline source URL and the latest checked
URL separately. Selecting v1 or v2 changes the next check target, not the saved
baseline. Capturing or accepting a baseline records its source; older baselines
show "Source not recorded" rather than guessing from the configured endpoint.

Each new check records its target URL. Editing an endpoint keeps the old result
and shows a warning until the target matches or a new check is run. Older checks
without a recorded target are labelled explicitly. The table describes the
baseline **at the time of the check**; the baseline JSON panel shows the **current
saved contract**, which can change after acceptance.
