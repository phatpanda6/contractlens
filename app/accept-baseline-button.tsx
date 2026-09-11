"use client";

import { useState } from "react";
import { useEndpointActions } from "./endpoint-actions";
import { UiIcon } from "./ui-icon";

export function AcceptBaselineButton({
  endpointId,
  testRunId,
  hasDifferentTarget,
}: {
  endpointId: string;
  testRunId: string;
  hasDifferentTarget: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { pendingAction, hasUnsavedChanges, performAction } =
    useEndpointActions();
  const isAccepting = pendingAction === "accept";

  function handleAccept() {
    setError(null);
    setSuccess(null);
    performAction("accept", async () => {
      try {
        const response = await fetch(`/api/endpoints/${endpointId}/baseline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testRunId }),
        });
        if (!response.ok) throw new Error("The baseline could not be updated");
        setSuccess("Baseline updated. Run another check to verify it.");
        return await response.json();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "The baseline could not be updated",
        );
        return null;
      }
    });
  }

  return (
    <div className="accept-bar">
      <div>
        <p className="accept-title">Is this change intentional?</p>
        <p id="accept-explanation">
          Use this recorded response as the baseline for future checks. Previous
          results stay unchanged.
        </p>
        {(hasDifferentTarget || hasUnsavedChanges) && (
          <p className="accept-hint">
            Save your target and run a new check before accepting a response.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleAccept}
        disabled={
          pendingAction !== null ||
          hasDifferentTarget ||
          hasUnsavedChanges ||
          success !== null
        }
        aria-busy={isAccepting}
        aria-describedby="accept-explanation"
        className="button button-secondary"
      >
        <UiIcon name={success ? "check" : "arrow"} />
        {isAccepting
          ? "Updating baseline…"
          : success
            ? "Baseline accepted"
            : "Accept as new baseline"}
      </button>
      {error !== null && (
        <p role="alert" className="accept-feedback error-text">
          {error}
        </p>
      )}
      {success !== null && (
        <p role="status" className="accept-feedback success-text">
          {success}
        </p>
      )}
    </div>
  );
}
