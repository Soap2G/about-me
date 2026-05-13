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
        date: '2026-03-01',
        summary:
            'Well, I built a personal site. Here\'s what I plan to write here, and how the blog is wired up.',
        file: 'welcome.md',
    },
    {
        slug: 'collaboration-across-sciences',
        title: 'From quarks to quasars',
        date: '2026-05-03',
        summary:
            'Is it easy to collaborate across different scientific disciplines sharing the same computing infrastructure? No. Is it necessary? Yes.',
        file: 'collaboration-across-sciences.md',
    },
    {
        slug: 'computing-sharing-economies-of-scale',
        title: "Don't generate the same events twice",
        date: '2026-04-02',
        summary: 'How boring must it be for a CPU core to redo the same simulation.',
        file: 'computing-sharing-economies-of-scale.md',
    },
];

export const getEssayBySlug = (slug) => essays.find((e) => e.slug === slug);
