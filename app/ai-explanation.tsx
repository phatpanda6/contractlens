"use client";

import { useRef } from "react";
import styles from "./ai-explanation.module.css";

export type ExplanationStatus = "idle" | "generating" | "error" | "ready";

// Saved explanations are plain text. Only group output that matches the
// expected format; show the original text if a provider deviates from it.
function parseExplanation(text: string) {
  const [first, ...rest] = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const summary = first?.match(/^Summary:\s*(.+)$/i)?.[1];
  const checks = rest.map((line) => line.match(/^Check:\s*(.+)$/i)?.[1]);
  if (!summary || !checks.every((check) => check !== undefined)) return null;
  return { summary, checks };
}

export function AiExplanation({
  text,
  status,
  requestPending,
  onExplain,
}: {
  text: string | null;
  status: ExplanationStatus;
  requestPending: boolean;
  onExplain: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const content = text ? parseExplanation(text) : null;
  const generating = status === "generating";
  const showAction = !text || status === "ready";
  const actionUnavailable = requestPending && !text;
  const actionLabel = text
    ? "Read explanation"
    : generating
      ? "Generating…"
      : actionUnavailable
        ? "Finishing previous explanation…"
        : status === "error"
          ? "Retry explanation"
          : "Explain this result";
  const message = generating
    ? "Reviewing the detected changes."
    : status === "ready"
      ? "Explanation ready"
      : actionUnavailable
        ? "The previous explanation is still running."
        : !text && status === "idle"
          ? "See what might break in the frontend and what to check next."
          : "";

  return (
    <section
      className={styles.card}
      aria-labelledby="ai-explanation-heading"
    >
      <div className={styles.header}>
        <div className={styles.intro}>
          <span className={styles.icon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8L10 3Z" />
              <path d="M18.5 13l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
            </svg>
          </span>
          <div className={styles.copy}>
            <h3 id="ai-explanation-heading">AI explanation</h3>
            <p
              role="status"
              className={message ? styles.status : "sr-only"}
            >
              {message}
            </p>
            {status === "error" && (
              <p className="error-text" role="alert">
                Couldn’t generate an explanation. Try again.
              </p>
            )}
          </div>
        </div>
        {showAction && (
          <button
            type="button"
            className={`button ${styles.action} ${text ? "button-secondary" : "button-primary"}`}
            aria-disabled={actionUnavailable || undefined}
            onClick={() => {
              if (text) contentRef.current?.focus();
              else if (!actionUnavailable) onExplain();
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>

      {text && (
        <div
          ref={contentRef}
          tabIndex={-1}
          role="group"
          aria-label="Explanation details"
          className={styles.content}
        >
          {content ? (
            <>
              <h4>Possible frontend impact</h4>
              <p>{content.summary}</p>
              {content.checks.length > 0 && (
                <>
                  <h4>What to check</h4>
                  <ul>
                    {content.checks.map((check, index) => (
                      <li key={index}>{check}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className={styles.plain}>{text}</p>
          )}
        </div>
      )}
    </section>
  );
}
