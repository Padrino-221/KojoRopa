"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center sm:py-28">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream text-3xl">
        ⚠️
      </div>
      <h1 className="font-display text-2xl text-espresso sm:text-3xl">
        Something came apart
      </h1>
      <p className="max-w-sm text-sm text-mocha">
        An error happened while showing this page. It&rsquo;s probably
        temporary — give it another go.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-full bg-clay px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
      >
        Try again
      </button>
    </div>
  );
}
