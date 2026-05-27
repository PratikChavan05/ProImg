export const LoadingAnimation = () => (
  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
);

export const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-paper">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto border-3 border-ocean-100 border-t-ocean-600 rounded-full animate-spin" />
      <p className="mt-4 text-ink-muted font-medium">Loading ProImg…</p>
    </div>
  </div>
);
