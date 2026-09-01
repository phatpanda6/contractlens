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
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-950">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <div role="alert" className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            ContractLens could not load
          </h1>

          <p className="text-sm leading-6 text-red-700">
            Something went wrong while loading the dashboard.
          </p>
          <p className="text-sm leading-6 text-stone-500">
            Try again. If this screen remains, wait a moment and refresh the
            page.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          aria-busy={isRetrying}
          className="inline-flex min-h-10 self-start items-center justify-center rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 enabled:hover:bg-stone-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRetrying ? "Trying again…" : "Try again"}
        </button>
      </div>
    </main>
  );
}
