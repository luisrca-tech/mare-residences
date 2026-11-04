import { Section } from "@/components/layout/Section";
import Image from "next/image";
import { ActionLink } from "@/components/ActionLink";
import { Container } from "@/components/Container";
import { MotionScene } from "@/components/motion/MotionScene";
import { content } from "@/data/content";
import { imageDetails } from "@/data/imageDetails";
import { images } from "@/data/images";

export function ResidencesTeaser() {
  const section = content.home.residences;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="residences"
      aria-labelledby="residences-title"
      className="bg-paper"
    >
      <MotionScene sceneKey="home-residences">
        <Container className="grid gap-10 py-14 lg:grid-cols-[minmax(0,548fr)_minmax(0,588fr)] lg:gap-[clamp(64px,calc(26.923077vw-211.692308px),176px)] lg:py-[88px]">
          <div className="flex min-w-0 flex-col items-start gap-6">
            <p data-motion-part="label" className="type-label">
              {section.eyebrow}
            </p>
            <h2
              id="residences-title"
              data-motion-part="heading"
              data-text="residences.title"
              className="type-h2"
            >
              {section.title}
            </h2>
            <p
              data-motion-part="body"
              data-text="residences.body"
              className="type-body"
            >
              {section.body}
            </p>
            <ul data-motion-part="list" className="type-feature">
              {section.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <ActionLink
              href={section.button.href}
              className="w-[calc(238px*var(--layout-scale))] bg-petrol text-ivory"
            >
              {section.button.label}
            </ActionLink>
          </div>
          <figure className="flex min-w-0 flex-col gap-3">
            <div
              data-motion-part="image"
              data-image-slot="residences"
              className="relative h-[420px] md:h-[520px] lg:aspect-[588/520] lg:h-auto"
            >
              <Image
                src={images.home.residences}
                alt={imageDetails.residences.alt}
                fill
                quality={90}
                sizes="(min-width: 1920px) 837px, (min-width: 1440px) 52vw, (min-width: 1024px) 48vw, (min-width: 768px) 704px, calc(100vw - 32px)"
                className="object-cover object-center"
              />
            </div>
            <figcaption
              data-motion-part="caption"
              className="type-caption text-muted"
            >
              {section.caption}
            </figcaption>
          </figure>
        </Container>
      </MotionScene>
    </Section>
  );
}
