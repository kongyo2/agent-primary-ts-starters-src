import { loadSkills } from "./skill-loader.ts";
import { writeIndexToFile } from "./index-store.ts";
import type { Embedder } from "./embedder.ts";
import type { IndexedSkill, SkillIndex } from "../schemas/skill.ts";

export interface BuildIndexOptions {
  skillsDir: string;
  outputFile: string;
  embedder: Embedder;
  logger?: (line: string) => void;
}

export async function buildIndex(opts: BuildIndexOptions): Promise<SkillIndex> {
  const { skillsDir, outputFile, embedder, logger = () => {} } = opts;
  const skills = loadSkills({ skillsDir });
  if (skills.length === 0) {
    throw new Error(`No skills found in ${skillsDir}`);
  }

  const indexed: IndexedSkill[] = [];
  for (const skill of skills) {
    const text = [skill.frontmatter.name, skill.frontmatter.description, skill.body].join("\n");
    const vector = await embedder.embed(text);
    indexed.push({
      id: skill.id,
      description: skill.frontmatter.description,
      category: skill.category,
      tokenCount: skill.tokenCount,
      vector,
    });
    logger(`  ✓ ${skill.id} (${vector.length}D)`);
  }

  const index: SkillIndex = {
    modelId: embedder.modelId,
    vectorDimension: embedder.vectorDimension,
    skills: indexed,
  };

  writeIndexToFile(outputFile, index);
  return index;
}
