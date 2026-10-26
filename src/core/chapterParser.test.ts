import { describe, it, expect } from "vitest";
import { parseChapters } from "./chapterParser";
import type { ChapterRule } from "./customRules";
import type { Chapter, Language } from "../types";

function titles(chapters: Chapter[]): string[] {
  return chapters.map((c) => c.title);
}

describe("parseChapters", () => {
  const lang: Language = "zh-CN";

  it("falls back to single chapter when no titles detected", () => {
    const lines = ["这是第一行", "这是第二行"]; 
    const chapters = parseChapters(lines, lang);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("正文");
    expect(chapters[0].lines).toEqual(lines);
  });

  it("detects numeric chinese chapter titles and splits correctly", () => {
    const lines = [
      "第1章 开始",
      "这一章的内容一",
      "这一章的内容二",
      "第2章 继续",
      "下一章内容",
    ];
    const chapters = parseChapters(lines, lang);
    expect(titles(chapters)).toEqual(["第1章 开始", "第2章 继续"]);
    expect(chapters[0].lines).toEqual(["这一章的内容一", "这一章的内容二"]);
    expect(chapters[1].lines).toEqual(["下一章内容"]);
  });

  it("creates intro chapter when there is content before first title", () => {
    const lines = [
      "书名：测试小说",
      "作者：某人",
      "",
      "第十章 正文开始",
      "正文内容……",
    ];
    const chapters = parseChapters(lines, lang);
    expect(chapters[0].isIntro).toBe(true);
    expect(chapters[0].title).toBe("简介");
    expect(chapters[0].lines).toEqual(["书名：测试小说", "作者：某人", ""]);
    expect(chapters[1].title).toBe("第十章 正文开始");
  });

  it("records originalTitle alongside title on each chapter", () => {
    const lines = ["第1章 开始", "内容", "第2章 继续", "内容"];
    const chapters = parseChapters(lines, lang);
    expect(chapters[0].originalTitle).toBe("第1章 开始");
    expect(chapters[1].originalTitle).toBe("第2章 继续");
  });

  it("applies user regex rules for lines preset misses", () => {
    const lines = ["序章", "这里是开头", "第1章 开始", "正文"];
    const userRules: ChapterRule[] = [
      {
        id: "u1",
        name: "序章",
        mode: "keyword",
        pattern: "序章",
        enabled: true,
      },
    ];
    const chapters = parseChapters(lines, lang, userRules);
    expect(titles(chapters)).toEqual(["序章", "第1章 开始"]);
    expect(chapters[0].lines).toEqual(["这里是开头"]);
  });

  it("presets take precedence when both match", () => {
    const lines = ["第1章 开始", "内容"];
    const userRules: ChapterRule[] = [
      {
        id: "u1",
        name: "覆盖",
        mode: "regex",
        pattern: "^第",
        capture: 0,
        enabled: true,
      },
    ];
    const chapters = parseChapters(lines, lang, userRules);
    expect(titles(chapters)).toEqual(["第1章 开始"]);
  });

  it("disabled rules are ignored", () => {
    const lines = ["序章", "内容"];
    const userRules: ChapterRule[] = [
      {
        id: "u1",
        name: "序章",
        mode: "keyword",
        pattern: "序章",
        enabled: false,
      },
    ];
    const chapters = parseChapters(lines, lang, userRules);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("正文");
  });

  it("malformed rules are skipped without breaking parsing", () => {
    const lines = ["楔子", "内容", "第1章 开始", "正文"];
    const userRules: ChapterRule[] = [
      {
        id: "bad",
        name: "bad",
        mode: "regex",
        pattern: "(",
        enabled: true,
      },
      {
        id: "ok",
        name: "楔子",
        mode: "keyword",
        pattern: "楔子",
        enabled: true,
      },
    ];
    const chapters = parseChapters(lines, lang, userRules);
    expect(titles(chapters)).toEqual(["楔子", "第1章 开始"]);
  });

  it("uses custom capture group from user regex", () => {
    const lines = ["TAG: 第一卷", "内容"];
    const userRules: ChapterRule[] = [
      {
        id: "u1",
        name: "cap",
        mode: "regex",
        pattern: "^TAG:\\s*(.+)$",
        capture: 1,
        enabled: true,
      },
    ];
    const chapters = parseChapters(lines, lang, userRules);
    expect(chapters[0].title).toBe("第一卷");
  });
});
