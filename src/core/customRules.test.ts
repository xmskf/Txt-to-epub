import { describe, it, expect } from "vitest";
import {
  keywordToRegexSource,
  compileRule,
  validateRule,
  serializeRules,
  parseImportedRules,
  type ChapterRule,
} from "./customRules";

describe("keywordToRegexSource", () => {
  it("splits on | separator", () => {
    expect(keywordToRegexSource("序|楔子|后记")).toBe("^(序|楔子|后记).*$");
  });

  it("splits on newline", () => {
    expect(keywordToRegexSource("序\n楔子\n后记")).toBe("^(序|楔子|后记).*$");
  });

  it("handles mixed | and newline", () => {
    expect(keywordToRegexSource("序|楔子\n后记")).toBe("^(序|楔子|后记).*$");
  });

  it("trims tokens and drops empty ones", () => {
    expect(keywordToRegexSource("  序 | \n 楔子 |")).toBe("^(序|楔子).*$");
  });

  it("escapes regex-special characters", () => {
    expect(keywordToRegexSource("(序)|.txt|\\路径")).toBe(
      "^(\\(序\\)|\\.txt|\\\\路径).*$",
    );
  });

  it("deduplicates identical tokens", () => {
    expect(keywordToRegexSource("序|序|楔子")).toBe("^(序|楔子).*$");
  });

  it("supports anywhere template", () => {
    expect(keywordToRegexSource("序", "anywhere")).toBe("^.*(序).*$");
  });

  it("throws when no tokens", () => {
    expect(() => keywordToRegexSource("")).toThrow();
    expect(() => keywordToRegexSource("|||")).toThrow();
    expect(() => keywordToRegexSource("  \n  ")).toThrow();
  });
});

describe("compileRule", () => {
  it("compiles regex mode with flags", () => {
    const r: ChapterRule = {
      id: "1",
      name: "n",
      mode: "regex",
      pattern: "^chapter\\s+\\d+",
      flags: "i",
      enabled: true,
    };
    const compiled = compileRule(r);
    expect(compiled.regex.flags).toContain("i");
    expect("Chapter 5 Test".match(compiled.regex)).toBeTruthy();
  });

  it("compiles keyword mode and matches prefix", () => {
    const r: ChapterRule = {
      id: "2",
      name: "n",
      mode: "keyword",
      pattern: "序|楔子",
      enabled: true,
    };
    const compiled = compileRule(r);
    expect("序章开始".match(compiled.regex)).toBeTruthy();
    expect("楔子章节".match(compiled.regex)).toBeTruthy();
    expect("第一章".match(compiled.regex)).toBeNull();
  });

  it("anywhere template matches mid-line", () => {
    const r: ChapterRule = {
      id: "3",
      name: "n",
      mode: "keyword",
      pattern: "后记",
      keywordTemplate: "anywhere",
      enabled: true,
    };
    const compiled = compileRule(r);
    expect("这是后记内容".match(compiled.regex)).toBeTruthy();
  });

  it("preserves capture group index", () => {
    const r: ChapterRule = {
      id: "4",
      name: "n",
      mode: "regex",
      pattern: "^(Chapter \\d+)",
      capture: 1,
      enabled: true,
    };
    const compiled = compileRule(r);
    expect(compiled.capture).toBe(1);
  });
});

describe("validateRule", () => {
  const base: ChapterRule = {
    id: "1",
    name: "x",
    mode: "regex",
    pattern: "^a",
    enabled: true,
  };

  it("rejects empty name", () => {
    expect(validateRule({ ...base, name: "" }).ok).toBe(false);
    expect(validateRule({ ...base, name: "   " }).ok).toBe(false);
  });

  it("rejects empty pattern", () => {
    expect(validateRule({ ...base, pattern: "" }).ok).toBe(false);
  });

  it("rejects invalid regex", () => {
    expect(validateRule({ ...base, pattern: "(" }).ok).toBe(false);
    expect(validateRule({ ...base, pattern: "[" }).ok).toBe(false);
  });

  it("rejects invalid flags", () => {
    expect(validateRule({ ...base, flags: "z" }).ok).toBe(false);
  });

  it("accepts valid regex", () => {
    expect(validateRule({ ...base, pattern: "^第\\d+章" }).ok).toBe(true);
  });

  it("accepts valid keyword", () => {
    expect(
      validateRule({ ...base, mode: "keyword", pattern: "序|楔子" }).ok,
    ).toBe(true);
  });

  it("rejects keyword with only empty tokens", () => {
    expect(validateRule({ ...base, mode: "keyword", pattern: "|||" }).ok).toBe(
      false,
    );
  });
});

describe("serializeRules / parseImportedRules", () => {
  it("roundtrips data but regenerates ids on import", () => {
    const rules: ChapterRule[] = [
      {
        id: "a",
        name: "正则",
        mode: "regex",
        pattern: "^X",
        flags: "i",
        enabled: true,
      },
      {
        id: "b",
        name: "关键词",
        mode: "keyword",
        pattern: "序|楔子",
        keywordTemplate: "prefix",
        enabled: false,
      },
    ];
    const json = serializeRules(rules);
    const parsed = parseImportedRules(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("正则");
    expect(parsed[0].pattern).toBe("^X");
    expect(parsed[0].flags).toBe("i");
    expect(parsed[1].enabled).toBe(false);
    expect(parsed[1].keywordTemplate).toBe("prefix");
    expect(parsed[0].id).not.toBe("a");
    expect(parsed[1].id).not.toBe("b");
  });

  it("throws when root is not an array", () => {
    expect(() => parseImportedRules('{"x": 1}')).toThrow();
    expect(() => parseImportedRules("null")).toThrow();
  });

  it("skips malformed entries but keeps valid ones", () => {
    const json = JSON.stringify([
      { id: "a", name: "ok", mode: "regex", pattern: "^a", enabled: true },
      { id: "b", mode: "unknown", pattern: "x", name: "bad-mode" },
      null,
      "not-an-object",
      { id: "c", name: "ok2", mode: "keyword", pattern: "序", enabled: true },
    ]);
    const parsed = parseImportedRules(json);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((r) => r.name)).toEqual(["ok", "ok2"]);
  });

  it("defaults enabled=true when absent", () => {
    const json = JSON.stringify([
      { id: "a", name: "n", mode: "regex", pattern: "^a" },
    ]);
    const parsed = parseImportedRules(json);
    expect(parsed[0].enabled).toBe(true);
  });
});
