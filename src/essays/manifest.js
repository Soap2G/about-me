// Registry of essays. Each entry maps a URL slug to metadata + the markdown file
// served from `public/essays/<file>`.
//
// To add a new post:
//   1. Drop `<slug>.md` into `public/essays/`.
//   2. Add an entry below.
export const essays = [
    {
        slug: 'welcome',
        title: 'A note on starting this site',
        date: '2026-04-26',
        summary:
            'Why I finally built a personal site, what I plan to write here, and how the blog is wired up.',
        file: 'welcome.md',
    },
    {
        slug: 'open-data-at-atlas',
        title: 'Open Data at ATLAS: bringing TeV collisions to the world',
        date: '2025-02-28',
        summary:
            'A short tour of the ATLAS Open Data programme — what it is, who it is for, and the infrastructure behind it.',
        file: 'open-data-at-atlas.md',
    },
];

export const getEssayBySlug = (slug) => essays.find((e) => e.slug === slug);
