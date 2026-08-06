import Link from "next/link";
import { getAllSettings } from "@/lib/actions/settings";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@example.com";
const INSTAGRAM =
  process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? "@example";

export async function Footer() {
  const s = await getAllSettings();
  return (
    <footer className="border-t border-border bg-surface pb-24 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          {/* brand */}
          <div className="max-w-xs">
            <p className="font-display text-xl tracking-tight text-espresso">
              {s.siteName || "KojoRopa"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-mocha">
              {s.footerDescription || "Secondhand shirts, one of one. Picked at Kantamanto Market, Accra — washed, checked and priced to move."}
            </p>
          </div>

          {/* links */}
          <div className="flex gap-12 text-sm text-mocha">
            <ul className="space-y-2">
              <li>
                <Link href="/#shop" className="transition-colors hover:text-clay">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors hover:text-clay">
                  Our story
                </Link>
              </li>
            </ul>
            <ul className="space-y-2">
              <li>{s.footerAddress || "Kantamanto Market, Accra"}</li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="transition-colors hover:text-clay"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>{INSTAGRAM}</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-taupe sm:flex-row">
          <p>
            {(s.footerCopyright || "© {year} KojoRopa").replace("{year}", String(new Date().getFullYear()))}
          </p>
          <p>{s.footerTagline || "Made in Accra"}</p>
        </div>
      </div>
    </footer>
  );
}
