# Halfords Knowledge Wiki

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

A modern, fast documentation portal and internal suite of interactive image generation tools built with **Astro 5**, **Starlight**, and **Vue 3**.

**Production:** [knowledgewiki.vercel.app](https://knowledgewiki.vercel.app/)

---

## 🌟 Key Features

### 🎨 Image Generators (Vue 3)
- **Product Review Images**: Generate branded 5-star review graphics with customizable typography and speech bubble layout.
- **Bulk Product Review Images**: Import CSV data (`SKU`, `Review Title`, `Review Text`) to generate stacked review cards in bulk, with single-click ZIP archive batch export.
- **Product Information Images**: Create product info graphics with customizable titles, dynamic bullet point lists, typography controls, and adjustable corner radii.

### 🛠️ Internal Tools & Guides
- **Quick Link Tool**: Documentation, feature breakdown, and release notes for internal navigation tools.
- **PWA Section**: Overview and implementation guides for Progressive Web Apps.
- **Web Trends**: Insights into modern web standards and design practices.

### 🔒 Privacy & Search Engine Control
- Integrated `noindex, nofollow, noarchive, nosnippet` robots meta tags on all pages.
- Configured `robots.txt` to block search engine indexing across the entire site.

---

## 📁 Project Structure

```text
.
├── public/                     # Static assets (fonts, asset SVGs, robots.txt)
├── src/
│   ├── components/
│   │   ├── image-generators/   # Vue 3 SFC image generator components (.vue)
│   │   ├── SiteTitle.astro
│   │   └── ThemeProvider.astro
│   ├── content/
│   │   └── docs/               # Markdown/MDX documentation pages
│   └── content.config.ts       # Starlight content collection configuration
├── astro.config.mjs            # Astro & Starlight integration config
├── package.json
└── tsconfig.json
```

---

## 🧞 Commands

All commands are run from the root directory:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local dev server at `localhost:4321` |
| `npm run build` | Compiles the production site to `./dist/` |
| `npm run preview` | Previews the production build locally |
| `npx astro sync` | Syncs Astro Content Layer schemas and types |

---

## 🛠️ Built With

- [Astro](https://astro.build/) - Web framework for content-driven websites
- [Starlight](https://starlight.astro.build/) - Documentation framework for Astro
- [Vue 3](https://vuejs.org/) - Progressive JavaScript Framework for interactive components
- [JSZip](https://stuk.github.io/jszip/) - Client-side ZIP archive generation
