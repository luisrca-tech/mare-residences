import { Section } from "@/components/layout/Section";
import Image from "next/image";
import { ActionLink } from "@/components/ActionLink";
import { Container } from "@/components/Container";
import { MotionScene } from "@/components/motion/MotionScene";
import { content } from "@/data/content";
import { imageDetails } from "@/data/imageDetails";
import { images } from "@/data/images";

export function NeighborhoodTeaser() {
  const section = content.home.neighborhood;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="neighborhood"
      aria-labelledby="neighborhood-title"
      className="bg-petrol text-ivory"
    >
      <MotionScene sceneKey="home-neighborhood">
        <Container className="grid gap-10 py-14 lg:grid-cols-[minmax(0,548fr)_minmax(0,588fr)] lg:gap-[clamp(64px,calc(26.923077vw-211.692308px),176px)] lg:py-[88px]">
          <div className="flex min-w-0 flex-col items-start gap-6">
            <p data-motion-part="label" className="type-label">
              {section.eyebrow}
            </p>
            <h2
              id="neighborhood-title"
              data-motion-part="heading"
              data-text="neighborhood.title"
              className="type-h2"
            >
              {section.title}
            </h2>
            <p
              data-motion-part="body"
              data-text="neighborhood.body"
              className="type-body"
            >
              {section.body}
            </p>
            <ActionLink
              href={section.button.href}
              className="w-[calc(226px*var(--layout-scale))] bg-ivory text-petrol"
            >
              {section.button.label}
            </ActionLink>
          </div>
          <figure className="flex min-w-0 flex-col gap-3">
            <div
              data-motion-part="image"
              data-image-slot="neighborhood"
              className="relative h-[340px] md:h-[440px] lg:aspect-[588/440] lg:h-auto"
            >
              <Image
                src={images.home.neighborhood}
                alt={imageDetails.neighborhood.alt}
                fill
                quality={90}
                sizes="(min-width: 1920px) 916px, (min-width: 1440px) 58vw, (min-width: 1024px) 53vw, (min-width: 768px) 704px, max(calc(100vw - 32px), 497px)"
                className="object-cover object-center"
              />
            </div>
            <figcaption data-motion-part="caption" className="type-caption">
              {section.caption}
            </figcaption>
          </figure>
        </Container>
      </MotionScene>
    </Section>
  );
}
