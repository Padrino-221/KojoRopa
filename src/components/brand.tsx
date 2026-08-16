import Link from "next/link";

const LOGO_WIDTH = 4092;
const LOGO_HEIGHT = 2748;

type BrandProps = {
  name: string;
  href?: string;
  className?: string;
  logoClassName?: string;
  /** Wraps the logo in a container (e.g. a white rounded badge on dark backgrounds). */
  logoWrapClassName?: string;
  nameClassName?: string;
  /** Uses white name text — for use on dark backgrounds. */
  onDark?: boolean;
};

export function Brand({
  name,
  href,
  className = "",
  logoClassName = "h-6 w-auto sm:h-7 md:h-8",
  logoWrapClassName,
  nameClassName = "font-display text-xl leading-none tracking-tight md:text-[22px]",
  onDark = false,
}: BrandProps) {
  const logo = logoWrapClassName ? (
    <span
      className={`flex shrink-0 items-center justify-center ${logoWrapClassName}`}
    >
      <img src="/logo.png" alt="" className={logoClassName} />
    </span>
  ) : (
    <img src="/logo.png" alt="" className={logoClassName} />
  );

  const content = (
    <>
      {logo}
      <span
        className={`min-w-0 ${onDark ? "text-white" : "text-espresso"} ${nameClassName}`}
      >
        {name}
      </span>
    </>
  );

  const wrap = `inline-flex items-center gap-2 ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${wrap} min-w-0 transition-opacity hover:opacity-70`}>
        {content}
      </Link>
    );
  }

  return <span className={`${wrap} min-w-0`}>{content}</span>;
}
