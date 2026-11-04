import Link from "next/link";
import { content } from "@/data/content";

export function Brand() {
  return (
    <Link
      href="/"
      aria-label="Maré — Home"
      className="flex w-[calc(170px*var(--layout-scale))] flex-col"
    >
      <span className="type-wordmark w-[calc(160px*var(--layout-scale))]">
        {content.shared.brand.wordmark}
      </span>
      <span className="type-descriptor whitespace-pre">
        {content.shared.brand.descriptor}
      </span>
    </Link>
  );
}
