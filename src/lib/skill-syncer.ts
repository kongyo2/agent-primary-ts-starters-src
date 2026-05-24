import { existsSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_SKILL_DIRS = [
  "ts-tsconfig-modern-strict-starter",
  "ts-npm-oxlint-starter",
  "ts-npm-prettier-starter",
  "ts-npm-zod-starter",
] as const;

export interface SyncSkillsOptions {
  sourceDir: string;
  destDir: string;
  skillDirs?: readonly string[];
}

export interface SyncResult {
  copied: string[];
}

export function syncSkills(opts: SyncSkillsOptions): SyncResult {
  const { sourceDir, destDir, skillDirs = DEFAULT_SKILL_DIRS } = opts;
  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });

  const copied: string[] = [];
  for (const skillName of skillDirs) {
    const sourceFile = join(sourceDir, skillName, "SKILL.md");
    if (!existsSync(sourceFile)) {
      throw new Error(`SKILL.md not found in source: ${sourceFile}`);
    }
    const targetDir = join(destDir, skillName);
    mkdirSync(targetDir, { recursive: true });
    copyFileSync(sourceFile, join(targetDir, "SKILL.md"));
    copied.push(skillName);
  }

  return { copied };
}
