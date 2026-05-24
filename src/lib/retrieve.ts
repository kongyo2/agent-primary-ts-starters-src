import { loadSkills } from "./skill-loader.ts";
import type { SkillManifest } from "../schemas/skill.ts";

export interface RetrieveOptions {
  skillsDir: string;
  id: string;
  category?: string;
}

export function retrieveSkill(opts: RetrieveOptions): SkillManifest {
  const loaderOpts =
    opts.category !== undefined
      ? { skillsDir: opts.skillsDir, category: opts.category }
      : { skillsDir: opts.skillsDir };
  const skills = loadSkills(loaderOpts);
  const skill = skills.find((s) => s.id === opts.id);
  if (!skill) {
    throw new Error(`No skill found with id: ${opts.id}`);
  }
  return skill;
}
