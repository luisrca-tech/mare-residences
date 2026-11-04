import { Section } from "@/components/layout/Section";
import Image from "next/image";
import { Container } from "@/components/Container";
import { content } from "@/data/content";
import { imageDetails } from "@/data/imageDetails";
import { images } from "@/data/images";
import { heroImageSizes } from "@/data/imageSizes";

export function ResidencesHero() {
  const hero = content.residences.hero;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="hero"
      aria-labelledby="residences-title"
      className="bg-ivory"
    >
      <Container className="grid gap-10 pt-10 pb-14 lg:grid-cols-[minmax(0,508fr)_minmax(0,704fr)] lg:gap-[clamp(48px,calc(12.5vw-80px),100px)] lg:pt-12 lg:pb-[72px]">
        <div className="flex min-w-0 flex-col items-start gap-6">
          <p className="type-label">{hero.eyebrow}</p>
          <h1
            id="residences-title"
            data-text="hero.title"
            className="type-h1 w-full"
          >
            {hero.title}
          </h1>
          <p
            data-text="hero.body"
            className="type-hero-body w-full lg:max-w-[calc(430px*var(--layout-scale))]"
          >
            {hero.body}
          </p>
        </div>
        <figure className="flex min-w-0 flex-col gap-3">
          <div
            data-image-slot="hero"
            className="relative h-[360px] md:aspect-[704/560] md:h-auto min-[90rem]:aspect-auto min-[90rem]:h-[calc(560px*var(--layout-scale))]"
          >
            <Image
              src={images.residences.hero}
              alt={imageDetails.residences.alt}
              fill
              preload
              quality={90}
              sizes={heroImageSizes.residences}
              className="object-cover object-center"
            />
          </div>
          <figcaption
            data-text="hero.caption"
            className="type-caption text-muted"
          >
            {hero.caption}
          </figcaption>
        </figure>
      </Container>
    </Section>
  );
}
