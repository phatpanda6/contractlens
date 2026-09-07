"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AcceptBaselineButtonProps = {
  endpointId: string;
  testRunId: string;
};

export function AcceptBaselineButton({
  endpointId,
  testRunId,
}: AcceptBaselineButtonProps) {
  const router = useRouter();

  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    setSuccess(null);
    setIsAccepting(true);

    try {
      const response = await fetch(`/api/endpoints/${endpointId}/baseline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testRunId,
        }),
      });

      if (!response.ok) {
        throw new Error("The baseline could not be updated");
      }

      setSuccess("Baseline updated. Run another check to verify it.");
      router.refresh();
    } catch (caughtError) {
      console.error("Failed to update baseline", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The baseline could not be updated",
      );
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <div className="mt-6 border-t border-stone-100 pt-4">
      <button
        type="button"
        onClick={handleAccept}
        disabled={isAccepting}
        aria-busy={isAccepting}
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition-colors enabled:hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isAccepting ? "Updating baseline..." : "Accept as new baseline"}
      </button>
      {error !== null && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success !== null && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          {success}
        </p>
      )}
    </div>
  );
}
