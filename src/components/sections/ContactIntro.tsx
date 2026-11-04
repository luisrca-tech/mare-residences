import { Section } from "@/components/layout/Section";
import { Container } from "@/components/Container";
import { content } from "@/data/content";
export function ContactIntro() {
  const intro = content.contact.intro;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="contact-intro"
      aria-labelledby="contact-title"
      className="bg-ivory"
    >
      <Container className="flex flex-col items-start gap-6 pt-10 pb-12 lg:pt-16">
        <p className="type-label">{intro.eyebrow}</p>
        <h1
          id="contact-title"
          data-text="intro.title"
          className="type-h1-wide w-full wrap-anywhere lg:max-w-[calc(1000px*var(--layout-scale))]"
        >
          {intro.title}
        </h1>
      </Container>
    </Section>
  );
}
