"use client";

import { useState } from "react";
import { useEndpointActions } from "./endpoint-actions";
import { UiIcon } from "./ui-icon";

export function RunCheckButton({
  endpointId,
  disabled,
}: {
  endpointId: string;
  disabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const { pendingAction, performAction } = useEndpointActions();
  const isRunning = pendingAction === "run";

  function handleRun() {
    setError(null);
    performAction("run", async () => {
      try {
        const response = await fetch(`/api/endpoints/${endpointId}/run`, {
          method: "POST",
        });
        if (!response.ok)
          throw new Error("The endpoint check could not be completed.");
        return await response.json();
      } catch {
        setError(
          "The endpoint check could not be completed. Please try again.",
        );
        return null;
      }
    });
  }

  return (
    <div className="run-control">
      <button
        type="button"
        onClick={handleRun}
        disabled={disabled || pendingAction !== null}
        aria-busy={isRunning}
        className="button button-primary"
      >
        {isRunning ? (
          <span className="spinner" aria-hidden="true" />
        ) : (
          <UiIcon name="play" />
        )}
        {isRunning ? "Running…" : "Run check"}
      </button>
      <span role="status" className="sr-only">
        {isRunning ? "Checking the endpoint…" : ""}
      </span>
      {error !== null && (
        <p role="alert" className="run-error error-text">
          {error}
        </p>
      )}
    </div>
  );
}
