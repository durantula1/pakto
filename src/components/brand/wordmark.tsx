import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The "pakto" wordmark, its "o" a chat bubble with a tick (docs/brand). */
export function Wordmark({
  inverse = false,
  className,
  href,
}: {
  inverse?: boolean;
  className?: string;
  href?: string | null;
}) {
  const content = (
    <Image
      src={inverse ? "/pakto-logo-dark.svg" : "/pakto-logo.svg"}
      alt="Pakto"
      width={97}
      height={32}
      loading="eager"
      className="h-8 w-auto"
    />
  );
  const classes = cn("inline-flex items-center", className);

  if (href === null) return <span className={classes}>{content}</span>;
  return (
    <Link href={href ?? (inverse ? "/app" : "/")} className={classes}>
      {content}
    </Link>
  );
}
