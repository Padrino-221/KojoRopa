import type { Metadata } from "next";
import Link from "next/link";
import { getAllSettings } from "@/lib/actions/settings";
import { Reveal } from "@/components/ui/reveal";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getAllSettings();
  return {
    title: "Our story",
    description: s.aboutMetaDescription || "How KojoRopa became a curated secondhand shirt shop in Accra — and why we'll never restock a single piece.",
  };
}

export default async function AboutPage() {
  const s = await getAllSettings();

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <div className="max-w-2xl">
          <Reveal>
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.22em] text-clay uppercase">
              <span aria-hidden className="h-px w-8 bg-clay/60" />
              Our story
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.06] tracking-tight text-balance text-espresso sm:text-5xl">
              {s.aboutHeading || "Started with one bale at Kantamanto"}
            </h1>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-mocha sm:text-base">
              <p>
                {s.aboutBody || "KojoRopa began at Kantamanto Market in Accra — the world's largest secondhand clothing market — with a single bale of imported tees and a stubborn belief: the best shirts are the ones that already lived a little."}
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
          </Reveal>
        </div>

        {/* values */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { title: s.value1Title || "Curated, not dumped", copy: s.value1Copy || "We buy the way we would thrift ourselves — slowly, suspiciously, and only for the good stuff. Less than one shirt in ten makes it onto the rack." },
            { title: s.value2Title || "Honest labels", copy: s.value2Copy || "Condition, era, fit and every honest flaw are written on the page. A limp collar is a feature when we tell you about it first." },
            { title: s.value3Title || "No restocks, ever", copy: s.value3Copy || "One of one is the whole point. When a piece sells, its story ends on someone's shoulders — not in a warehouse." },
          ].map((v, i) => (
            <Reveal key={v.title} delay={i * 90} className="h-full">
              <div className="h-full rounded-2xl bg-surface p-5 ring-1 ring-border/40 transition-all duration-300 hover:-translate-y-1 hover:ring-clay/25 sm:p-7">
                <span className="font-display text-3xl text-clay/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 font-display text-xl text-espresso">
                  {v.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-mocha">{v.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-14 pb-8 text-center">
          <Reveal>
            <h2 className="font-display text-2xl tracking-tight text-balance text-espresso sm:text-3xl">
              Enough about us —{" "}
              <em className="text-clay italic">go meet the rack</em>
            </h2>
            <Link
              href="/#shop"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-clay px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
            >
              Shop this week&rsquo;s pieces
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
