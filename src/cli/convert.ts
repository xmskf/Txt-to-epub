import { parseChapters } from "../core/chapterParser";
import { buildEpubBytes } from "../core/epubBuilder";
import { hasMeaningfulContent, preprocessLines } from "../core/preprocess";
import { readTextBuffer } from "../core/textReader";
import type { ChapterRule } from "../core/customRules";
import type { BookMeta, Chapter, Cover, Language } from "../types";

export interface CliConvertOptions {
  title?: string;
  author?: string;
  language?: Language;
  encoding?: string | "auto";
  cover?: Cover | null;
  rules?: ChapterRule[];
}

export interface CliConvertResult {
  bytes: Uint8Array;
  chapters: Chapter[];
  detectedEncoding: string;
  usedEncoding: string;
}

/** 与网页版共用同一套编码检测、章节解析和 EPUB 生成逻辑 */
export async function convertTextToEpub(
  data: Uint8Array,
  options: CliConvertOptions = {},
): Promise<CliConvertResult> {
  const read = readTextBuffer(data, options.encoding ?? "auto");
  const lines = preprocessLines(read.text);

  if (!hasMeaningfulContent(lines)) {
    throw new Error("文件内容为空或无法识别");
  }

  const language = options.language ?? "zh-CN";
  const chapters = parseChapters(lines, language, options.rules ?? []);
  const meta: BookMeta = {
    title: options.title?.trim() || "未命名",
    author: options.author?.trim() || "",
    language,
  };

  const bytes = await buildEpubBytes(meta, chapters, {
    cover: options.cover ?? undefined,
  });

  return {
    bytes,
    chapters,
    detectedEncoding: read.detectedEncoding,
    usedEncoding: read.usedEncoding,
  };
}
