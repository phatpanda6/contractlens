"use client";

import { useTransition } from "react";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function DashboardError({
  unstable_retry,
}: DashboardErrorProps) {
  const [isRetrying, startRetryTransition] = useTransition();

  function handleRetry() {
    startRetryTransition(() => {
      unstable_retry();
    });
  }

  return (
    <main className="workspace message-workspace">
      <div className="message-card">
        <div role="alert">
          <h1>ContractLens could not load</h1>
          <p>Try again to reload your endpoint and saved checks.</p>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          aria-busy={isRetrying}
          className="button button-primary"
        >
          {isRetrying ? "Trying again…" : "Try again"}
        </button>
      </div>
    </main>
  );
}
