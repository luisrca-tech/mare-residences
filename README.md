# Mare Residences

A standalone Next.js real-estate website with five public pages: Home, Residences, Neighborhood, Contact and Privacy. Content, images and licensed local Lora/Inter fonts are bundled with the application. No BluePrint monorepo packages, CMS, external source folders or environment variables are required.

## Local development

```sh
npm ci
npm run dev
```

## Validation and production

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

## Vercel

Import this repository, choose the Next.js preset and use the repository root (`.`) as Root Directory. The build command is `npm run build`. No custom workspace installation or outside-root source access is needed.

## Current behavior

Home and the shared contact CTA include measured heading-line reveals, viewport-triggered narrative beats, image curtains and accessible interruption fallbacks. A persistent owner manages the Home introduction, page transitions and Lenis smoothing. Local inner-page sections have not received the full Home motion rollout.

The contact form is a local demonstration with validation, loading, recovery and simulated success; it does not send email or persist leads.

Native visual and elapsed-motion inspection, perceived cadence and final human artistic acceptance remain pending. Automated checks do not replace that review.

## Listening

This repository starts with new Git history and contains only the Mare application. The original shared Section, ContainerSection, viewport and width-scaling helpers were copied locally from the released BluePrint snapshot. Their class-merging helper uses explicit clsx and tailwind-merge dependencies. Import paths and Tailwind/Biome configuration were localized; source content, geometry, motion logic and bundled assets were retained. Local logs, orchestration records, generated output, dependencies and credentials are excluded. Third-party font license notices remain bundled; no new license is granted for the original project code.
