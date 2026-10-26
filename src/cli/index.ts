import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { parseArgs } from "node:util";
import type { ChapterRule } from "../core/customRules";
import type { Cover, Language } from "../types";
import { convertTextToEpub } from "./convert";

const HELP = `用法: txt-to-epub <input.txt> [选项]

将 TXT 小说转换为 EPUB，与网页版使用同一套章节识别规则。

选项:
  -o, --output <file>    输出路径（默认: 与输入同名、扩展名为 .epub）
  -t, --title <title>    书名（默认: 输入文件名）
  -a, --author <author>  作者（默认: 空）
  -l, --language <lang>  语言: zh-CN | en（默认: zh-CN）
  -e, --encoding <enc>   编码: auto | utf-8 | gb18030 | big5 等（默认: auto）
  -c, --cover <image>    封面图片（jpg/jpeg/png/gif/webp）
  -r, --rules <file>     自定义章节规则 JSON（ChapterRule[]）
  -h, --help             显示帮助

示例:
  txt-to-epub 小说.txt -o 小说.epub -t "书名" -a "作者"
  txt-to-epub 小说.txt -e gb18030 -c cover.jpg
`;

const COVER_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function parseLanguage(value?: string): Language {
  if (!value) return "zh-CN";
  switch (value.toLowerCase()) {
    case "zh":
    case "zh-cn":
    case "cn":
      return "zh-CN";
    case "en":
    case "en-us":
    case "en-gb":
      return "en";
    default:
      throw new Error(`不支持的语言“${value}”，可选 zh-CN 或 en`);
  }
}

async function loadCover(path: string): Promise<Cover> {
  const extension = extname(path).toLowerCase();
  const mimeType = COVER_MIME[extension];
  if (!mimeType) {
    throw new Error(
      `不支持的封面格式“${extension || "未知"}”，支持 .jpg/.jpeg/.png/.gif/.webp`,
    );
  }
  return {
    data: await readFile(path),
    mimeType,
    fileName: basename(path),
  };
}

function isChapterRule(value: unknown): value is ChapterRule {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { pattern?: unknown }).pattern === "string",
  );
}

async function loadRules(path: string): Promise<ChapterRule[]> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed as { rules?: unknown } | null)?.rules;

  if (!Array.isArray(list)) {
    throw new Error('规则文件格式应为 ChapterRule[] 或 { "rules": ChapterRule[] }');
  }
  return list.filter(isChapterRule);
}

function defaultOutputPath(inputPath: string): string {
  const name = basename(inputPath, extname(inputPath));
  return join(dirname(inputPath), `${name}.epub`);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      output: { type: "string", short: "o" },
      title: { type: "string", short: "t" },
      author: { type: "string", short: "a" },
      language: { type: "string", short: "l" },
      encoding: { type: "string", short: "e" },
      cover: { type: "string", short: "c" },
      rules: { type: "string", short: "r" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  if (positionals.length !== 1) {
    console.error(
      positionals.length === 0 ? "缺少输入文件" : "一次只能转换一个文件",
    );
    console.error("用法: txt-to-epub <input.txt> [选项]，使用 -h 查看帮助");
    process.exitCode = 2;
    return;
  }

  const inputPath = positionals[0];
  const outputPath = values.output ?? defaultOutputPath(inputPath);

  const [data, cover, rules] = await Promise.all([
    readFile(inputPath),
    values.cover ? loadCover(values.cover) : Promise.resolve(undefined),
    values.rules ? loadRules(values.rules) : Promise.resolve([]),
  ]);

  const result = await convertTextToEpub(new Uint8Array(data), {
    title: values.title ?? basename(inputPath, extname(inputPath)),
    author: values.author,
    language: parseLanguage(values.language),
    encoding: values.encoding ?? "auto",
    cover,
    rules,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.bytes);

  console.log(`已生成: ${outputPath}`);
  console.log(
    `编码: 检测为 ${result.detectedEncoding || "未知"}，使用 ${result.usedEncoding}`,
  );
  console.log(`章节: ${result.chapters.length}`);
}

main().catch((error: unknown) => {
  console.error(
    `转换失败: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
