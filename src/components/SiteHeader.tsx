import { MeasuredHeader } from "./MeasuredHeader";
import Link from "next/link";
import { content } from "@/data/content";
import { Brand } from "./Brand";
import { Container } from "./Container";
import { MobileNavigation } from "./MobileNavigation";

export function SiteHeader() {
  return (
    <MeasuredHeader>
      <Container className="flex items-center justify-between py-[18px] lg:py-[22px]">
        <Brand />
        <nav
          aria-label="Principal"
          className="hidden w-[calc(614px*var(--layout-scale)+96px)] grid-cols-[calc(64px*var(--layout-scale))_calc(110px*var(--layout-scale))_calc(68px*var(--layout-scale))_calc(78px*var(--layout-scale))_calc(230px*var(--layout-scale))] items-center gap-6 lg:grid"
        >
          {content.shared.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="type-nav flex min-h-11 items-center"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={content.shared.headerCta.href}
            prefetch={false}
            className="type-button flex min-h-[calc(52px*var(--layout-scale))] items-center bg-petrol px-5 py-4 text-ivory"
          >
            {content.shared.headerCta.label}
          </Link>
        </nav>
        <MobileNavigation />
      </Container>
    </MeasuredHeader>
  );
}
