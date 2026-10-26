# TXT 转 EPUB 工具（前端 SPA）

[English](README-en.md)

一个纯前端的 TXT 小说转 EPUB 小工具。支持简体中文与英文文本，自动识别章节并生成含目录的 EPUB 文件，全部处理在浏览器本地完成，不上传文件，保护用户隐私。

在线体验地址：https://txt2epub.bluice.xyz/

## 功能特性

- 前端单页应用（SPA），静态部署即可使用
- 通过浏览器 File API 读取本地 TXT 文件
- 自动检测文本编码（使用 `jschardet`），支持 UTF-8 / GB18030 / Big5 等常见编码
- 章节识别规则：
  - 删除每行前导空格（半角/全角）
  - 行首匹配“第 x 章”作为章节标题，其中 x 可为阿拉伯数字或中文数字
  - 两个“第 x 章”之间的内容视为该章节正文
  - 文件开头到第一章之间的非空内容会作为“简介”章节
- 简单的章节预览与编辑：
  - 预览章节标题、字数、行数
  - 修改章节标题
  - 将某一章节与上一章节合并

## 技术栈

- 框架：Vue 3（Composition API）
- 语言：TypeScript
- 构建工具：Vite

## 开发与运行

1. 安装依赖：

```bash
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

然后在浏览器中访问终端输出提示的本地地址（通常是 `http://localhost:5173`）。

3. 构建生产版本：

```bash
npm run build
```

构建输出位于 `dist/` 目录，可部署到任意静态托管服务（如 GitHub Pages、Vercel、Cloudflare Pages 等）。

## 测试

- 测试框架： [Vitest](https://vitest.dev/)
- 运行全部测试（单元 + 集成，一次性执行）：

```bash
npm test -- --run
```

集成测试使用的 TXT 测试文件存放在 `tests/fixtures/` 目录下。

## 命令行用法（CLI）

除网页版外，仓库还提供命令行入口，复用同一套编码检测、章节解析和 EPUB 生成逻辑，适合批量转换。

1. 构建 CLI（产物为 `dist-cli/txt-to-epub.js`）：

```bash
npm run build:cli
```

2. 转换文件：

```bash
node dist-cli/txt-to-epub.js 小说.txt -o 小说.epub
```

也可以执行 `npm link`，之后直接使用 `txt-to-epub` 命令。

参数说明：

| 参数 | 说明 |
| --- | --- |
| `-o, --output <file>` | 输出路径，默认与输入同名、扩展名为 `.epub` |
| `-t, --title <title>` | 书名，默认取输入文件名 |
| `-a, --author <author>` | 作者，默认为空 |
| `-l, --language <lang>` | 语言：`zh-CN`（默认）或 `en` |
| `-e, --encoding <enc>` | 编码：`auto`（默认）、`utf-8`、`gb18030`、`big5` 等 |
| `-c, --cover <image>` | 封面图片，支持 jpg/jpeg/png/gif/webp |
| `-r, --rules <file>` | 自定义章节规则 JSON（`ChapterRule[]`，与网页版规则格式一致） |
| `-h, --help` | 显示帮助 |

示例：

```bash
node dist-cli/txt-to-epub.js ./novels/小说.txt \
  -o ./out/小说.epub -t "小说名" -a "作者" -c ./cover.jpg
```

网页版、Docker 镜像和 GitHub Pages 部署不受影响。

## Docker 与 CI/CD

仓库内置 GitHub Actions 流水线（[.github/workflows/pipeline.yml](.github/workflows/pipeline.yml)）：

1. **测试与构建**：安装依赖 → 运行单元/集成测试 → 执行生产构建，并把 `dist/` 上传为构建产物（artifact）。
2. **构建并推送镜像**：测试通过后，用多阶段 Dockerfile 构建 `linux/amd64`、`linux/arm64` 双架构镜像，推送到 GitHub Container Registry（GHCR）。
3. **部署 GitHub Pages**：`main` 分支测试通过后，按项目页路径重新构建并发布。

触发条件：推送到 `main`、推送 `v*` 标签、提交 PR，或在 Actions 页面手动触发。PR 只验证镜像能否构建，不推送；GitHub Pages 只在 `main` 和手动触发时部署。

### 拉取并运行镜像

```bash
docker pull ghcr.io/xmskf/txt-to-epub:latest
docker run -d --name txt-to-epub -p 8080:80 ghcr.io/xmskf/txt-to-epub:latest
```

然后在浏览器访问 http://localhost:8080 。

镜像标签规则：

| 标签 | 说明 |
| --- | --- |
| `latest` | `main` 分支最新构建 |
| `main` | `main` 分支 |
| `v1.2.3`、`1.2` | 推送 `v*` 标签时生成 |
| `sha-xxxxxxx` | 每次构建对应的提交短 SHA |
| `pr-123` | PR 构建（仅验证，不推送） |

> 首次推送后，包默认是私有的。若希望无需登录即可拉取，可在仓库的 **Packages** 页面将该包可见性改为 **Public**。

### 本地构建镜像

```bash
docker build -t txt-to-epub .
docker run --rm -p 8080:80 txt-to-epub
```

Dockerfile 采用两阶段构建：`node:22-alpine` 负责构建，最终镜像基于 `nginx:1.27-alpine`，只包含静态文件和自定义 Nginx 配置（SPA 回退、静态资源长缓存、gzip）。

### GitHub Pages 部署

`main` 分支测试通过后，流水线会用 `--base=/txt-to-epub/` 重新构建并发布到 GitHub Pages：

https://xmskf.github.io/txt-to-epub/

使用前需要在仓库的 **Settings → Pages → Build and deployment** 中把 **Source** 设为 **GitHub Actions**（私有仓库使用 Pages 需要 GitHub Pro/Team/Enterprise）。

> 项目页的访问路径包含仓库名，因此构建时要设置 Vite 的 `base`。部署到自有域名或根路径（如 Cloudflare）时仍使用默认构建。

## 章节识别规则说明

1. **删除行首空格**：对每一行，删除行首的所有空白字符（空格、制表符、全角空格等）。
2. **章节标题识别**：
   - 行首匹配：`第 + 数字/中文数字 + 章`；
   - 数字可以是：
     - 阿拉伯数字：`0-9`；
     - 中文数字：`零一二三四五六七八九十百千万两〇○` 等；
   - 标题后面可以跟任意文字，例如：`第一章 重逢`、`第12章 序幕`。
3. **正文划分**：
   - 检测到的相邻两条“第 x 章”之间的内容视为前一章节的正文；
   - 最后一章的正文一直到文本结尾；
   - 文件开头到第一章之前的非空内容自动作为“简介”章节。
4. **兜底策略**：
   - 如果完全没有识别到“第 x 章”行，则默认将全文视作一个章节（标题为“正文”/“Content”）。
