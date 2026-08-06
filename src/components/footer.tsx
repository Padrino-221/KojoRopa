import Link from "next/link";
import { Brand } from "@/components/brand";
import { getAllSettings } from "@/lib/actions/settings";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@example.com";
const INSTAGRAM =
  process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? "@example";

export async function Footer() {
  const s = await getAllSettings();
  return (
    <footer className="border-t border-border bg-surface pb-24 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        {/* brand lockup */}
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-md">
            <Brand
              href="/"
              name={s.siteName || "KojoRopa"}
              logoClassName="h-8 w-auto sm:h-10"
              nameClassName="font-display text-3xl tracking-tight sm:text-4xl"
            />
            <p className="mt-4 text-sm leading-relaxed text-mocha">
              {s.footerDescription || "Secondhand shirts, one of one. Picked at Kantamanto Market, Accra — washed, checked and priced to move."}
            </p>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-taupe uppercase">
            {s.footerTagline || "Made in Accra"}
          </p>
        </div>

        {/* columns */}
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-taupe uppercase">
              Shop
            </p>
            <ul className="mt-4 space-y-3 text-sm text-mocha">
              <li>
                <Link href="/#shop" className="transition-colors hover:text-clay">
                  The rack
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors hover:text-clay">
                  Our story
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-taupe uppercase">
              Contact
            </p>
            <ul className="mt-4 space-y-3 text-sm text-mocha">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="transition-colors hover:text-clay"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={`https://instagram.com/${INSTAGRAM.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-clay"
                >
                  {INSTAGRAM}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-taupe uppercase">
              Visit
            </p>
            <ul className="mt-4 space-y-3 text-sm text-mocha">
              <li>{s.footerAddress || "Kantamanto Market, Accra"}</li>
              <li className="text-taupe">
                New finds every week — one of one, no restocks.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-taupe sm:flex-row">
          <p>
            {(s.footerCopyright || "© {year} KojoRopa").replace("{year}", String(new Date().getFullYear()))}
          </p>
          <p>{s.footerTagline || "Made in Accra"}</p>
        </div>
      </div>
    </footer>
  );
}
