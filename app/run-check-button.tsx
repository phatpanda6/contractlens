"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RunCheckButtonProps = {
  endpointId: string;
  disabled: boolean;
  disabledReason: string | null;
};

export function RunCheckButton({
  endpointId,
  disabled,
  disabledReason,
}: RunCheckButtonProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isButtonDisabled = isRunning || disabled;

  async function handleRun() {
    setError(null);
    setIsRunning(true);

    try {
      const response = await fetch(`/api/endpoints/${endpointId}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("The endpoint check could not be completed");
      }
      router.refresh();
    } catch (caughtError) {
      console.error("failed to check endpoint", caughtError);
      setError("The endpoint check could not be completed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      <button
        type="button"
        onClick={handleRun}
        disabled={isButtonDisabled}
        aria-busy={isRunning}
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors enabled:hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? "Running…" : "Run check"}
      </button>

      {disabled && disabledReason !== null && (
        <p className="mt-2 text-sm text-stone-500">{disabledReason}</p>
      )}

      {error !== null && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
