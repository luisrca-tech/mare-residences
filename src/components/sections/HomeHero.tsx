import { Section } from "@/components/layout/Section";
import Image from "next/image";
import { ActionLink } from "@/components/ActionLink";
import { Container } from "@/components/Container";
import { MotionScene } from "@/components/motion/MotionScene";
import { content } from "@/data/content";
import { imageDetails } from "@/data/imageDetails";
import { images } from "@/data/images";
import { heroImageSizes } from "@/data/imageSizes";

export function HomeHero() {
  const hero = content.home.hero;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      viewportMinusHeader
      fillChildren={false}
      data-section="hero"
      aria-labelledby="home-title"
      className="h-auto min-h-0 bg-ivory lg:min-h-[var(--bps-section-fill-minus-header)]"
    >
      <MotionScene sceneKey="home-hero" kind="hero">
        <Container
          fullBleed
          className="grid gap-10 pt-10 pb-14 lg:grid-cols-[minmax(0,508fr)_minmax(0,704fr)] lg:gap-[clamp(48px,calc(12.5vw-80px),100px)] lg:min-h-[inherit] lg:pt-12 lg:pb-[72px] min-[90rem]:grid-cols-[calc(508px*var(--layout-scale))_minmax(0,1fr)]"
        >
          <div className="flex min-w-0 flex-col items-start gap-6">
            <p data-motion-part="label" className="type-label">
              {hero.eyebrow}
            </p>
            <h1
              id="home-title"
              data-motion-part="heading"
              data-text="hero.title"
              className="type-h1 w-full"
            >
              {hero.title}
            </h1>
            <p
              data-motion-part="body"
              data-text="hero.body"
              className="type-hero-body w-full lg:max-w-[calc(430px*var(--layout-scale))]"
            >
              {hero.body}
            </p>
            <ActionLink
              href={hero.button.href}
              className="w-[calc(230px*var(--layout-scale))] bg-petrol text-ivory"
            >
              {hero.button.label}
            </ActionLink>
          </div>
          <figure className="flex min-w-0 flex-col gap-3">
            <div
              data-motion-part="image"
              data-image-slot="hero"
              className="relative h-[360px] md:aspect-[704/560] md:h-auto lg:aspect-auto lg:min-h-[calc(560px*var(--layout-scale))] lg:flex-1"
            >
              <Image
                src={images.home.hero}
                alt={imageDetails.hero.alt}
                fill
                preload
                quality={90}
                sizes={heroImageSizes.home}
                className="object-cover object-center"
              />
            </div>
            <figcaption
              data-motion-part="caption"
              className="type-caption text-muted"
            >
              {hero.caption}
            </figcaption>
          </figure>
        </Container>
      </MotionScene>
    </Section>
  );
}
