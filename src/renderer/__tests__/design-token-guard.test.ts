import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

const walkFiles = (directory: string): string[] => {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = join(directory, entry);
    const stats = statSync(absolute);

    if (stats.isDirectory()) {
      files.push(...walkFiles(absolute));
      continue;
    }

    if (absolute.endsWith(".tsx")) {
      files.push(absolute);
    }
  }

  return files;
};

describe("design token guard", () => {
  it("prevents hardcoded hex colors in renderer component files", () => {
    const componentsDir = join(process.cwd(), "src/renderer/components");
    const componentFiles = walkFiles(componentsDir);

    const violations: string[] = [];

    for (const filePath of componentFiles) {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const matches = line.match(HEX_COLOR_RE);
        if (!matches) {
          return;
        }

        const normalizedPath = relative(process.cwd(), filePath);
        violations.push(`${normalizedPath}:${index + 1} -> ${line.trim()}`);
      });
    }

    expect(violations).toEqual([]);
  });
});
