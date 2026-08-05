import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center sm:py-28">
      <p className="font-display text-6xl text-clay">404</p>
      <h1 className="font-display text-2xl text-espresso sm:text-3xl">
        Nothing hanging here
      </h1>
      <p className="max-w-sm text-sm text-mocha">
        That page doesn&rsquo;t exist, or the piece it pointed to has left the
        rack. The rack turns over every week — something good is probably
        waiting.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-clay px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
      >
        Back to the rack
      </Link>
    </div>
  );
}
