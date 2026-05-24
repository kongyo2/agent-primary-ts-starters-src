import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { SkillIndexSchema, type SkillIndex } from "../schemas/skill.ts";

export function readIndexFromFile(path: string): SkillIndex {
  if (!existsSync(path)) {
    throw new Error(
      `Skill index not found at ${path}. Run "npm run build:index" first (the published package ships this file pre-built).`,
    );
  }
  const compressed = readFileSync(path);
  const json = gunzipSync(compressed).toString("utf8");
  const raw: unknown = JSON.parse(json);
  return SkillIndexSchema.parse(raw);
}

export function writeIndexToFile(path: string, index: SkillIndex): void {
  SkillIndexSchema.parse(index);
  mkdirSync(dirname(path), { recursive: true });
  const compressed = gzipSync(JSON.stringify(index));
  writeFileSync(path, compressed);
}
