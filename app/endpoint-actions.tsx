"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type EndpointAction = "save" | "run" | "accept";
type EndpointActions = {
  pendingAction: EndpointAction | null;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  performAction: (action: EndpointAction, work: () => Promise<unknown>) => void;
};

const ActionsContext = createContext<EndpointActions | null>(null);

// An action returns the server's persisted result. Apply it before releasing
// the controls; no second page request is needed to display the saved change.
export function EndpointActionsProvider({
  children,
  onSavedResult,
}: {
  children: ReactNode;
  onSavedResult: (action: EndpointAction, result: unknown) => void;
}) {
  const [pendingAction, setPendingAction] = useState<EndpointAction | null>(
    null,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function performAction(
    action: EndpointAction,
    work: () => Promise<unknown>,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingAction(action);
    setError(null);
    try {
      const result = await work();
      if (result !== null) onSavedResult(action, result);
    } catch {
      setError(
        "The saved result could not be displayed. Reload the page to retrieve it.",
      );
    } finally {
      inFlight.current = false;
      setPendingAction(null);
    }
  }

  return (
    <ActionsContext.Provider
      value={{
        pendingAction,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        performAction,
      }}
    >
      {error !== null && (
        <p role="alert" className="target-warning">
          {error}
        </p>
      )}
      {children}
    </ActionsContext.Provider>
  );
}

export function useEndpointActions() {
  const context = useContext(ActionsContext);
  if (context === null)
    throw new Error("Endpoint controls need EndpointActionsProvider");
  return context;
}
