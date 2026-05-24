import { z } from "zod";

export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export const SkillManifestSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  frontmatter: SkillFrontmatterSchema,
  body: z.string(),
  content: z.string(),
  filePath: z.string().min(1),
  tokenCount: z.number().int().nonnegative(),
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;

export const SearchResultSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.string(),
  tokenCount: z.number().int().nonnegative(),
  similarity: z.number(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const IndexedSkillSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.string(),
  tokenCount: z.number().int().nonnegative(),
  vector: z.array(z.number()),
});
export type IndexedSkill = z.infer<typeof IndexedSkillSchema>;

export const SkillIndexSchema = z.object({
  modelId: z.string(),
  vectorDimension: z.number().int().positive(),
  skills: z.array(IndexedSkillSchema),
});
export type SkillIndex = z.infer<typeof SkillIndexSchema>;

export const SkillListItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  tokenCount: z.number().int().nonnegative(),
});
export type SkillListItem = z.infer<typeof SkillListItemSchema>;
