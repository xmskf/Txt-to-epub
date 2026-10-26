export const STORAGE_KEY = "txt2epub:customChapterRules";

export type ChapterRuleMode = "regex" | "keyword";
export type KeywordTemplate = "prefix" | "anywhere";

export interface ChapterRule {
  id: string;
  name: string;
  mode: ChapterRuleMode;
  pattern: string;
  flags?: string;
  capture?: number;
  keywordTemplate?: KeywordTemplate;
  enabled: boolean;
}

export interface CompiledRule {
  regex: RegExp;
  capture?: number;
}

export function createRuleId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function keywordToRegexSource(
  keywords: string,
  template: KeywordTemplate = "prefix",
): string {
  const tokens = keywords
    .split(/[|\n]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    throw new Error("关键词不能为空");
  }

  const escaped = tokens.map(escapeRegex);
  const unique = Array.from(new Set(escaped));
  const alt = unique.join("|");
  return template === "anywhere" ? `^.*(${alt}).*$` : `^(${alt}).*$`;
}

export function compileRule(rule: ChapterRule): CompiledRule {
  if (rule.mode === "keyword") {
    const source = keywordToRegexSource(
      rule.pattern,
      rule.keywordTemplate ?? "prefix",
    );
    return { regex: new RegExp(source), capture: rule.capture };
  }
  const regex = new RegExp(rule.pattern, rule.flags ?? "");
  return { regex, capture: rule.capture };
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateRule(rule: ChapterRule): ValidationResult {
  if (!rule.name || !rule.name.trim()) {
    return { ok: false, error: "名称不能为空" };
  }
  if (!rule.pattern || !rule.pattern.trim()) {
    return {
      ok: false,
      error: rule.mode === "keyword" ? "关键词不能为空" : "正则不能为空",
    };
  }
  try {
    compileRule(rule);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function normalizeRule(raw: unknown): ChapterRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mode = r.mode === "regex" || r.mode === "keyword" ? r.mode : null;
  if (!mode) return null;
  if (typeof r.pattern !== "string" || typeof r.name !== "string") return null;
  return {
    id: typeof r.id === "string" && r.id ? r.id : createRuleId(),
    name: r.name,
    mode,
    pattern: r.pattern,
    flags: typeof r.flags === "string" ? r.flags : undefined,
    capture: typeof r.capture === "number" ? r.capture : undefined,
    keywordTemplate:
      r.keywordTemplate === "prefix" || r.keywordTemplate === "anywhere"
        ? r.keywordTemplate
        : undefined,
    enabled: typeof r.enabled === "boolean" ? r.enabled : true,
  };
}

export function serializeRules(rules: ChapterRule[]): string {
  return JSON.stringify(rules, null, 2);
}

export function parseImportedRules(json: string): ChapterRule[] {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) {
    throw new Error("JSON 根节点必须为数组");
  }
  const out: ChapterRule[] = [];
  for (const raw of data) {
    const rule = normalizeRule(raw);
    if (rule) out.push({ ...rule, id: createRuleId() });
  }
  return out;
}

export function loadRules(): ChapterRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((r) => normalizeRule(r))
      .filter((r): r is ChapterRule => r !== null);
  } catch {
    return [];
  }
}

export function saveRules(rules: ChapterRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeRules(rules));
  } catch {
    // quota exceeded or localStorage disabled
  }
}
