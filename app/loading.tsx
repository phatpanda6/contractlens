export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-950">
      <div
        role="status"
        className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-lg border border-stone-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          Loading ContractLens
        </h1>
        <p className="text-sm leading-6 text-stone-500">
          Fetching the configured endpoint and recent check history...
        </p>
      </div>
    </main>
  );
}
