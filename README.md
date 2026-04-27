# Giovanni Guerrieri — personal site

A small React site with a portfolio home page and a markdown-driven blog. Inspired by [darioamodei.com](https://www.darioamodei.com/).

## Local development

This project targets Node 22 (LTS) — a `.nvmrc` is provided. Newer node majors (e.g. 25) break `react-scripts 5.0.1` silently during install.

```bash
nvm use            # picks up .nvmrc → Node 22
yarn install
yarn start
```

The site is served on [http://localhost:3000](http://localhost:3000).

To build for production:

```bash
yarn build
```

## Adding an essay

1. Drop the markdown file in [`public/essays/`](public/essays), e.g. `public/essays/my-post.md`.
2. Register it in [`src/essays/manifest.js`](src/essays/manifest.js) with a `slug`, `title`, `date`, optional `summary`, and the `file` name.

The post is then reachable at `/essay/<slug>` and listed on `/essays`.

## Deployment

The site is deployed on Netlify; configuration lives in [`netlify.toml`](netlify.toml). The SPA fallback in [`public/_redirects`](public/_redirects) makes deep-links work.
