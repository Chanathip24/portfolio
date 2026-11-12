---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Home (/)

Scope: home page of the personal portfolio. Visitor mode: Experience; the work leads from the first viewport.
Audience and job: developer peers; they see the work as live demos, get a feel for the person, and get in touch.
Proof/content: mock projects and copy (labelled sample) in src/content/site.ts.
Constraints: Next.js App Router, Tailwind v4, shadcn tokens; light and dark; Lenis; Motion.
User-pinned reference: andreas.vision's design system, used for learning with the owner's approval as stated by the user. Carry its layout, type scale, spacing, radii and motion. Never its name, photos, copy, project images or its licensed display font. Its sky-blue brand colour is replaced by our own accent token.
Replaces: the Release Ledger direction (removed at the user's request).

## Direction contract

THESIS: A calm editorial portfolio where every project tile is a live, touchable demo, not a screenshot. It refuses static thumbnail grids.

OWN-WORLD: Off-white ground, black ink, one teal accent rendered as an ordered-dither pixel field. A huge italic display serif (Instrument Serif) for the hero and closing name; Geist for everything else, with very large Geist section headings. Floating pill nav, rounded tiles (16 to 40px), small grey tag pills.

STORY: Visitors read the one-line promise, play with each demo in the Work grid, meet the person in an accent-coloured About band with live widgets, skim Small talk answers, and email.

FIRST VIEWPORT: A floating pill nav top-left and a dark "Get in touch" pill top-right. A full-bleed animated dither field with a clear cloud in the middle holds a two-line italic serif headline at about 8rem and a centred 20px intro below.

FORM: User-pinned reference (andreas.vision system); the roll seed:637530632bf9825f was set aside by the user's pin. Signature interaction: the dither field drifts slowly and parts around the cursor; Work tiles respond to touch with springs.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
