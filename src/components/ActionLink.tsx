import Link from "next/link";
import type { ActionLinkProps } from "@/types/components";

export function ActionLink({
  href,
  children,
  className = "",
}: ActionLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`type-button flex min-h-[calc(52px*var(--layout-scale))] max-w-full items-center px-5 py-4 ${className}`}
    >
      {children}
    </Link>
  );
}
