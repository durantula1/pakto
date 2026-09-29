import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** A quiet mid-page call to action: the same verb as the hero, with the reassurance right under it. */
export function InlineCta({ title }: { title: string }) {
  return (
    <div className="mt-14 flex flex-col gap-5 border-t border-[#102b38]/15 pt-8 sm:flex-row sm:items-center sm:justify-between lg:mt-20">
      <p className="max-w-xl text-xl font-black leading-tight tracking-[-0.04em] sm:text-2xl">
        {title}
      </p>
      <div className="flex flex-col gap-2 sm:items-end">
        <Link href="/app" className="mf-when-in mf-primary-button">
          КЪМ ОБЕКТИТЕ <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/sign-up"
          prefetch={false}
          className="mf-when-out mf-primary-button"
        >
          ЗАПОЧНИ БЕЗПЛАТНО <ArrowRight className="size-4" />
        </Link>
        <p className="mf-when-out text-sm text-[#46636e]">
          Безплатно в бета · без карта
        </p>
      </div>
    </div>
  );
}
