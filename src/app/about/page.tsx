import type { Metadata } from "next";
import Link from "next/link";
import { ShirtArt } from "@/components/shirt-art";
import { products } from "@/lib/products";
import { getPublicProducts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Our story",
  description:
    "How KojoRopa became a curated secondhand shirt shop in Accra — and why we'll never restock a single piece.",
};

const VALUES = [
  {
    title: "Curated, not dumped",
    copy: "We buy the way we would thrift ourselves — slowly, suspiciously, and only for the good stuff. Less than one shirt in ten makes it onto the rack.",
  },
  {
    title: "Honest labels",
    copy: "Condition, era, fit and every honest flaw are written on the page. A limp collar is a feature when we tell you about it first.",
  },
  {
    title: "No restocks, ever",
    copy: "One of one is the whole point. When a piece sells, its story ends on someone's shoulders — not in a warehouse.",
  },
];

export default async function AboutPage() {
  const allProducts = await getPublicProducts();
  const tee = allProducts[0] ?? products[0];

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.8fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-clay">
              Our story
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.06] tracking-tight text-espresso sm:text-5xl">
              Started with one bale at{" "}
              <em className="text-clay italic">Kantamanto</em>
            </h1>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-mocha sm:text-base">
              <p>
                KojoRopa began at Kantamanto Market in Accra — the world&rsquo;s
                largest secondhand clothing market — with a single bale of
                imported tees and a stubborn belief: the best shirts are the ones
                that already lived a little.
              </p>
              <p>
                Every week we dig through the bales so you don&rsquo;t have to.
                Each piece is washed, checked under good light, and given a fair
                price with its original retail shown — so you can see exactly how
                much secondhand saves you.
              </p>
              <p>
                There is no warehouse, no restock button, no algorithm deciding
                what you see. Just a rack, a weekly turnover, and shirts with
                stories that are still being written.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-surface p-6 sm:p-10 shadow-lg ring-1 ring-border/50">
            {tee && <ShirtArt art={tee.art} className="h-auto w-full" />}
            <p className="mt-2 text-center text-xs tracking-wide text-taupe">
              The heavyweight blank we&rsquo;re quietly obsessed with
            </p>
          </div>
        </div>

        {/* values */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <div
              key={v.title}
              className="rounded-2xl bg-surface p-5 sm:p-7 ring-1 ring-border/50 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-clay/20"
            >
              <span className="font-display text-3xl text-clay/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 font-display text-xl text-espresso">
                {v.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-mocha">{v.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 pb-8 text-center">
          <h2 className="font-display text-2xl tracking-tight text-espresso sm:text-3xl">
            Enough about us —{" "}
            <em className="text-clay italic">go meet the rack</em>
          </h2>
          <Link
            href="/#shop"
            className="mt-6 inline-block rounded-full bg-clay px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
          >
            Shop this week&rsquo;s pieces
          </Link>
        </div>
      </section>
    </>
  );
}
