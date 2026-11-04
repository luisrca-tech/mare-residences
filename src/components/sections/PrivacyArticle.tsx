import { Section } from "@/components/layout/Section";
import { Container } from "@/components/Container";
import { content } from "@/data/content";

export function PrivacyArticle() {
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="privacy-article"
      className="bg-ivory"
    >
      <Container className="pb-20">
        <article className="flex w-full flex-col gap-10 wrap-anywhere lg:max-w-[calc(920px*var(--layout-scale))]">
          {content.privacy.article.sections.map((section, index) => (
            <section
              key={section.title}
              aria-labelledby={`privacy-section-${index}`}
              className="flex min-w-0 flex-col gap-4"
            >
              <h2
                id={`privacy-section-${index}`}
                data-text={`article.sections.${index}.title`}
                className="type-article-title"
              >
                {section.title}
              </h2>
              <p
                data-text={`article.sections.${index}.body`}
                className="type-body"
              >
                {section.body}
              </p>
            </section>
          ))}
        </article>
      </Container>
    </Section>
  );
}
