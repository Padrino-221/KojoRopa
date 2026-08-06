import Link from "next/link";

const LOGO_WIDTH = 4092;
const LOGO_HEIGHT = 2748;

type BrandProps = {
  name: string;
  href?: string;
  className?: string;
  logoClassName?: string;
  nameClassName?: string;
};

export function Brand({
  name,
  href,
  className = "",
  logoClassName = "h-6 w-auto sm:h-7 md:h-8",
  nameClassName = "font-display text-xl leading-none tracking-tight md:text-[22px]",
}: BrandProps) {
  const content = (
    <>
      <img src="/logo.png" alt="" className={logoClassName} />
      <span className={`min-w-0 truncate text-espresso ${nameClassName}`}>
        {name}
      </span>
    </>
  );

  const wrap = `inline-flex items-center gap-2 ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${wrap} min-w-0 overflow-hidden transition-opacity hover:opacity-70`}>
        {content}
      </Link>
    );
  }

  return <span className={`${wrap} min-w-0 overflow-hidden`}>{content}</span>;
}
