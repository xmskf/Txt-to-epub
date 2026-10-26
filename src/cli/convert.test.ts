import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { convertTextToEpub } from "./convert";

describe("convertTextToEpub", () => {
  it("builds a valid EPUB archive from a txt fixture", async () => {
    const raw = await readFile(
      new URL("../../tests/fixtures/测试小说_001.txt", import.meta.url),
    );

    const result = await convertTextToEpub(new Uint8Array(raw), {
      title: "测试小说",
      author: "测试作者",
    });

    expect(result.chapters.length).toBeGreaterThan(0);
    expect(result.usedEncoding).toBeTruthy();

    const zip = await JSZip.loadAsync(result.bytes);
    expect(await zip.file("mimetype")?.async("string")).toBe("application/epub+zip");
    expect(zip.file("META-INF/container.xml")).not.toBeNull();
    expect(zip.file("OEBPS/content.opf")).not.toBeNull();
    expect(zip.file("OEBPS/nav.xhtml")).not.toBeNull();
  });
});
