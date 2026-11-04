import Link from "next/link";
import { Fragment } from "react";
import { Container } from "@/components/Container";
import { content } from "@/data/content";

export function SiteFooter() {
  const { footer, brand } = content.shared;
  return (
    <footer
      data-section="footer"
      data-scale-2xl=""
      className="bg-petrol text-ivory"
    >
      <Container className="flex flex-col gap-10 pt-12 pb-8 lg:pt-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-[100px]">
          <div className="flex flex-col gap-3 lg:w-[calc(400px*var(--layout-scale))]">
            <Link
              href="/"
              aria-label="Maré — Home"
              className="type-footer-brand w-[calc(240px*var(--layout-scale))]"
            >
              {brand.wordmark}
            </Link>
            <p className="type-small">{footer.tagline}</p>
          </div>
          <nav
            aria-label="Rodapé"
            className="type-nav flex flex-col gap-3 whitespace-pre-wrap lg:w-[calc(660px*var(--layout-scale))]"
          >
            {footer.rows.map((row) => (
              <p key={row[0].href}>
                {row.map((item, index) => (
                  <Fragment key={item.href}>
                    {index > 0 && "  ·  "}
                    <Link href={item.href} prefetch={false}>
                      {item.label}
                    </Link>
                  </Fragment>
                ))}
              </p>
            ))}
          </nav>
        </div>
        <p data-text="footer.notice" className="type-caption">
          {footer.notice}
        </p>
      </Container>
    </footer>
  );
}
