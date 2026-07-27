import { z } from "zod";

// Every exported schema carries an explicit `z.ZodObject<...>` annotation so the
// module satisfies `isolatedDeclarations` (see tsconfig.declarations.json). The
// annotation is checked against the initializer, so a drifting shape is a
// compile error rather than a stale comment.

export const SkillFrontmatterSchema: z.ZodObject<{
  name: z.ZodString;
  description: z.ZodString;
}> = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export const SkillManifestSchema: z.ZodObject<{
  id: z.ZodString;
  category: z.ZodString;
  frontmatter: typeof SkillFrontmatterSchema;
  body: z.ZodString;
  content: z.ZodString;
  filePath: z.ZodString;
  tokenCount: z.ZodNumber;
}> = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  frontmatter: SkillFrontmatterSchema,
  body: z.string(),
  content: z.string(),
  filePath: z.string().min(1),
  tokenCount: z.number().int().nonnegative(),
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;

export const SearchResultSchema: z.ZodObject<{
  id: z.ZodString;
  description: z.ZodString;
  category: z.ZodString;
  tokenCount: z.ZodNumber;
  similarity: z.ZodNumber;
}> = z.object({
  id: z.string(),
  description: z.string(),
  category: z.string(),
  tokenCount: z.number().int().nonnegative(),
  similarity: z.number(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const IndexedSkillSchema: z.ZodObject<{
  id: z.ZodString;
  description: z.ZodString;
  category: z.ZodString;
  tokenCount: z.ZodNumber;
  vector: z.ZodArray<z.ZodNumber>;
}> = z.object({
  id: z.string(),
  description: z.string(),
  category: z.string(),
  tokenCount: z.number().int().nonnegative(),
  vector: z.array(z.number()),
});
export type IndexedSkill = z.infer<typeof IndexedSkillSchema>;

export const SkillIndexSchema: z.ZodObject<{
  modelId: z.ZodString;
  vectorDimension: z.ZodNumber;
  skills: z.ZodArray<typeof IndexedSkillSchema>;
}> = z.object({
  modelId: z.string(),
  vectorDimension: z.number().int().positive(),
  skills: z.array(IndexedSkillSchema),
});
export type SkillIndex = z.infer<typeof SkillIndexSchema>;

export const SkillListItemSchema: z.ZodObject<{
  id: z.ZodString;
  category: z.ZodString;
  description: z.ZodString;
  tokenCount: z.ZodNumber;
}> = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  tokenCount: z.number().int().nonnegative(),
});
export type SkillListItem = z.infer<typeof SkillListItemSchema>;
