import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.ts";
import { estimateTokenCount } from "./tokens.ts";
import { SkillFrontmatterSchema, type SkillManifest } from "../schemas/skill.ts";

export const DEFAULT_CATEGORY = "ts-npm";

export interface LoadSkillsOptions {
  skillsDir: string;
  category?: string;
}

export function loadSkills(opts: LoadSkillsOptions): SkillManifest[] {
  const { skillsDir, category = DEFAULT_CATEGORY } = opts;
  if (!existsSync(skillsDir)) {
    return [];
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const skills: SkillManifest[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = join(skillsDir, entry.name);
    const skillFile = join(skillDir, "SKILL.md");
    if (!existsSync(skillFile)) continue;

    const content = readFileSync(skillFile, "utf8");
    const { data, body } = parseFrontmatter(content);
    const parsed = SkillFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Invalid frontmatter in ${skillFile}: ${parsed.error.message}`);
    }

    skills.push({
      id: parsed.data.name,
      category,
      frontmatter: parsed.data,
      body: body.trim(),
      content,
      filePath: skillFile,
      tokenCount: estimateTokenCount(content),
    });
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));
  return skills;
}
