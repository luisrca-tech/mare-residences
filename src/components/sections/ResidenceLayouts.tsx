import { Section } from "@/components/layout/Section";
import Image from "next/image";
import { Container } from "@/components/Container";
import { content } from "@/data/content";
import { imageDetails } from "@/data/imageDetails";
import { images } from "@/data/images";

export function ResidenceLayouts() {
  const layouts = content.residences.layouts;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="layouts"
      aria-labelledby="layouts-title"
      className="bg-paper"
    >
      <Container className="flex flex-col gap-8 py-16">
        <p className="type-label">{layouts.eyebrow}</p>
        <h2
          id="layouts-title"
          data-text="layouts.title"
          className="type-h2 max-w-[calc(900px*var(--layout-scale))]"
        >
          {layouts.title}
        </h2>
        <div className="grid gap-12 lg:grid-cols-2">
          {layouts.items.map((item, index) => (
            <article
              key={item.key}
              aria-labelledby={`${item.key}-title`}
              className="flex min-w-0 flex-col gap-4"
            >
              <div
                data-image-slot={item.key}
                className="relative h-[340px] md:aspect-[632/390] md:h-auto"
              >
                <Image
                  src={images.residences.items[index]}
                  alt={
                    index === 0
                      ? imageDetails.hero.alt
                      : imageDetails.residences.alt
                  }
                  fill
                  quality={90}
                  sizes={
                    index === 0
                      ? "(min-width: 1920px) 872px, (min-width: 1440px) 50vw, (min-width: 1024px) 49vw, (min-width: 768px) 704px, max(calc(100vw - 32px), 456px)"
                      : "(min-width: 1920px) 872px, (min-width: 1440px) 50vw, (min-width: 1024px) 49vw, (min-width: 768px) 704px, calc(100vw - 32px)"
                  }
                  className="object-cover object-center"
                />
              </div>
              <h3
                id={`${item.key}-title`}
                data-text={`${item.key}.title`}
                className="type-h3"
              >
                {item.title}
              </h3>
              <p
                data-text={`${item.key}.description`}
                className="type-nav text-clay"
              >
                {item.description}
              </p>
              <p data-text={`${item.key}.body`} className="type-body">
                {item.body}
              </p>
            </article>
          ))}
        </div>
        <p data-text="layouts.disclaimer" className="type-caption text-muted">
          {layouts.disclaimer}
        </p>
      </Container>
    </Section>
  );
}
