import Link from "next/link";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@example.com";
const INSTAGRAM =
  process.env.NEXT_PUBLIC_INSTAGRA_HANDLE ?? "@example";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface pb-24 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-display text-xl tracking-tight text-espresso">
              Kojo<span className="text-clay">Ropa</span>
            </p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-mocha">
              Secondhand shirts, one of one. Picked at Kantamanto Market, Accra
              — washed, checked and priced to move.
            </p>
          </div>

          {/* shop */}
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-espresso">
              Shop
            </p>
            <ul className="mt-3 space-y-2 text-sm text-mocha">
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

          {/* policies */}
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-espresso">
              Policies
            </p>
            <ul className="mt-3 space-y-2 text-sm text-mocha">
              <li>
                <Link href="/about" className="transition-colors hover:text-clay">
                  Returns
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors hover:text-clay">
                  Shipping
                </Link>
              </li>
            </ul>
          </div>

          {/* contact */}
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-espresso">
              Contact
            </p>
            <ul className="mt-3 space-y-2 text-sm text-mocha">
              <li>Kantamanto Market, Accra</li>
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
            © {new Date().getFullYear()} KojoRopa — a demo storefront. No real
            orders are placed.
          </p>
          <p>Made in Accra 🇬🇭</p>
        </div>
      </div>
    </footer>
  );
}
