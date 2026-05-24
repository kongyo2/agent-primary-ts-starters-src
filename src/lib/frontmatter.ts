export interface ParsedFrontmatter {
  data: Record<string, string>;
  body: string;
}

const DELIMITER = "---";

export function parseFrontmatter(input: string): ParsedFrontmatter {
  const lines = input.split(/\r?\n/);

  if (lines[0] !== DELIMITER) {
    return { data: {}, body: input };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === DELIMITER) {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    return { data: {}, body: input };
  }

  const yamlLines = lines.slice(1, endIdx);
  const data: Record<string, string> = {};
  for (const rawLine of yamlLines) {
    const line = rawLine.trimEnd();
    if (line === "" || line.startsWith("#")) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;

    const key = line.slice(0, colonIdx).trim();
    if (!/^[A-Za-z_][\w-]*$/.test(key)) continue;

    let value = line.slice(colonIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }

  const body = lines.slice(endIdx + 1).join("\n");
  return { data, body };
}
