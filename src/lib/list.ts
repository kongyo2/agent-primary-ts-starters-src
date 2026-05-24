import { loadSkills } from "./skill-loader.ts";
import type { SkillListItem } from "../schemas/skill.ts";

export interface ListSkillsOptions {
  skillsDir: string;
  category?: string;
}

export function listSkills(opts: ListSkillsOptions): SkillListItem[] {
  const loaderOpts =
    opts.category !== undefined
      ? { skillsDir: opts.skillsDir, category: opts.category }
      : { skillsDir: opts.skillsDir };
  const skills = loadSkills(loaderOpts);
  return skills.map((s) => ({
    id: s.id,
    category: s.category,
    description: s.frontmatter.description,
    tokenCount: s.tokenCount,
  }));
}
