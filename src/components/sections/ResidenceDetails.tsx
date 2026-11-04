import { Section } from "@/components/layout/Section";
import { Container } from "@/components/Container";
import { content } from "@/data/content";

export function ResidenceDetails() {
  const details = content.residences.details;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="details"
      aria-labelledby="details-title"
      className="bg-ivory"
    >
      <Container className="flex flex-col gap-6 py-16">
        <p className="type-label">{details.eyebrow}</p>
        <h2
          id="details-title"
          data-text="details.title"
          className="type-h2 max-w-[calc(1000px*var(--layout-scale))]"
        >
          {details.title}
        </h2>
        <p
          data-text="details.body"
          className="type-body max-w-[calc(800px*var(--layout-scale))]"
        >
          {details.body}
        </p>
      </Container>
    </Section>
  );
}
