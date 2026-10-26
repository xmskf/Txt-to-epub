# TXT to EPUB Converter (Frontend SPA)

# fork  源仓库在这里，https://github.com/bluicezhen/txt-to-epub，欢迎大家给源作者 stars。 这个只是转载➕修改一些
[简体中文](README.md)

A pure frontend TXT-to-EPUB converter built with Vue 3, TypeScript, and Vite. It supports both Simplified Chinese and English text, automatically detects chapters and generates an EPUB with a table of contents. Everything runs in your browser and no file is uploaded, which helps protect user privacy.

Live demo: https://txt2epub.bluice.xyz/

## Features

- Single Page Application (SPA), can be deployed as static files
- Read local TXT files via the browser File API
- Auto-detect text encoding using `jschardet` (supports common encodings such as UTF-8 / GB18030 / Big5)
- Chapter splitting:
  - Remove leading whitespace (including full-width spaces) from each line
  - Treat lines starting with `第 x 章` as chapter titles, where `x` can be Arabic digits or Chinese numerals
  - Content between two `第 x 章` lines becomes the body of the previous chapter
  - Non-empty content before the first chapter becomes an “Introduction” chapter
- Simple chapter preview and editing:
  - Preview chapter titles, character counts and line counts
  - Rename chapter titles
  - Merge a chapter into its previous one

## Tech Stack

- Framework: Vue 3 (Composition API)
- Language: TypeScript
- Bundler: Vite

## Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

Then open the URL printed by the terminal (usually `http://localhost:5173`) in your browser.

3. Build for production:

```bash
npm run build
```

The compiled files are in the `dist/` directory. You can deploy them to any static hosting service (GitHub Pages, Vercel, Cloudflare Pages, etc.).

## Testing

- Test runner: [Vitest](https://vitest.dev/)
- Run all tests once (unit + integration):

```bash
npm test -- --run
```

Fixture TXT files for integration tests are placed under `tests/fixtures/`.

## Command Line (CLI)

Besides the web app, the repository provides a CLI that reuses the same encoding detection, chapter parsing, and EPUB generation logic, which is handy for batch conversion.

1. Build the CLI (output: `dist-cli/txt-to-epub.js`):

```bash
npm run build:cli
```

2. Convert a file:

```bash
node dist-cli/txt-to-epub.js novel.txt -o novel.epub
```

You can also run `npm link` and then use the `txt-to-epub` command directly.

Options:

| Option | Description |
| --- | --- |
| `-o, --output <file>` | Output path; defaults to the input name with an `.epub` extension |
| `-t, --title <title>` | Book title; defaults to the input file name |
| `-a, --author <author>` | Author; empty by default |
| `-l, --language <lang>` | Language: `zh-CN` (default) or `en` |
| `-e, --encoding <enc>` | Encoding: `auto` (default), `utf-8`, `gb18030`, `big5`, … |
| `-c, --cover <image>` | Cover image: jpg/jpeg/png/gif/webp |
| `-r, --rules <file>` | Custom chapter rules JSON (`ChapterRule[]`, same format as the web UI) |
| `-h, --help` | Show help |

Example:

```bash
node dist-cli/txt-to-epub.js ./novels/novel.txt \
  -o ./out/novel.epub -t "Novel" -a "Author" -c ./cover.jpg
```

The web app, Docker image, and GitHub Pages deployment are unaffected.

## Docker & CI/CD

The repository ships with a GitHub Actions pipeline ([.github/workflows/pipeline.yml](.github/workflows/pipeline.yml)):

1. **Test & build**: install dependencies → run unit/integration tests → build for production, and upload `dist/` as a build artifact.
2. **Build & push image**: once tests pass, a multi-stage Dockerfile builds `linux/amd64` and `linux/arm64` images and pushes them to the GitHub Container Registry (GHCR).
3. **Deploy to GitHub Pages**: after tests pass on `main`, rebuild for the project-page path and publish.

It runs on pushes to `main`, `v*` tags, pull requests, and manual dispatch. Pull requests only verify that the image builds; nothing is pushed. GitHub Pages deploys only on `main` and manual dispatch.

### Pull and run the image

```bash
docker pull ghcr.io/xmskf/txt-to-epub:latest
docker run -d --name txt-to-epub -p 8080:80 ghcr.io/xmskf/txt-to-epub:latest
```

Then open http://localhost:8080 .

Image tags:

| Tag | Description |
| --- | --- |
| `latest` | Latest build from `main` |
| `main` | `main` branch |
| `v1.2.3`, `1.2` | Generated when pushing a `v*` tag |
| `sha-xxxxxxx` | Short commit SHA of each build |
| `pr-123` | Pull request build (verify only, not pushed) |

> After the first push, the package is private by default. To allow anonymous pulls, change the package visibility to **Public** on the repository's **Packages** page.

### Build the image locally

```bash
docker build -t txt-to-epub .
docker run --rm -p 8080:80 txt-to-epub
```

The Dockerfile uses a two-stage build: `node:22-alpine` builds the app, and the final image is based on `nginx:1.27-alpine` and only contains the static files plus a custom Nginx config (SPA fallback, long-lived asset caching, gzip).

### GitHub Pages deployment

After tests pass on `main`, the pipeline rebuilds with `--base=/txt-to-epub/` and publishes to GitHub Pages:

https://xmskf.github.io/txt-to-epub/

Before the first run, set **Source** to **GitHub Actions** under **Settings → Pages → Build and deployment** (Pages on private repositories requires GitHub Pro/Team/Enterprise).

> A project page is served under the repository name, so the build sets Vite's `base`. Deployments to a custom domain or root path (e.g. Cloudflare) keep using the default build.

## Chapter Detection Rules

1. **Strip leading whitespace**  
   For each line, remove all leading whitespace characters (spaces, tabs, full-width spaces, etc.).

2. **Chapter title recognition**  
   - A line is considered a chapter title if it starts with:
     - `第` + number/Chinese numerals + `章`
   - The numeric part can be:
     - Arabic digits: `0-9`
     - Chinese numerals: `零一二三四五六七八九十百千万两〇○` etc.
   - Any text following `第 x 章` is treated as part of the chapter title, e.g. `第一章 重逢`, `第12章 序幕`.

3. **Body splitting**  
   - Text between two chapter-title lines belongs to the previous chapter’s body.
   - The last chapter’s body extends to the end of the file.
   - Non-empty text before the first chapter is turned into a dedicated “Introduction” chapter.

4. **Fallback**  
   - If no `第 x 章` line is found in the entire file, the whole document is treated as a single chapter (with a default title “正文” / “Content”).
