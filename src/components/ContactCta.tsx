import { Section } from "@/components/layout/Section";
import { ActionLink } from "@/components/ActionLink";
import { Container } from "@/components/Container";
import { MotionScene } from "@/components/motion/MotionScene";
import { content } from "@/data/content";

export function ContactCta() {
  const cta = content.shared.cta;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="cta"
      aria-labelledby="contact-cta-title"
      className="bg-sand"
    >
      <MotionScene sceneKey="contact-cta">
        <Container className="flex flex-col items-start gap-6 py-14 lg:py-20">
          <p data-motion-part="label" className="type-label">
            {cta.eyebrow}
          </p>
          <h2
            id="contact-cta-title"
            data-motion-part="heading"
            data-text="cta.title"
            className="type-cta max-w-[calc(950px*var(--layout-scale))]"
          >
            {cta.title}
          </h2>
          <p
            data-motion-part="body"
            data-text="cta.body"
            className="type-body max-w-[calc(670px*var(--layout-scale))]"
          >
            {cta.body}
          </p>
          <ActionLink
            href={cta.button.href}
            className="w-[calc(226px*var(--layout-scale))] bg-petrol text-ivory"
          >
            {cta.button.label}
          </ActionLink>
        </Container>
      </MotionScene>
    </Section>
  );
}
