export function AdminTablesPageLoading() {
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-muted" />
      </header>

      <div className="flex-1 space-y-8 px-6 py-6">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="h-7 w-24 animate-pulse rounded-xl bg-muted" />
            </div>
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
