import type { TransformersModule } from "./embedder-types.ts";

export async function loadDefaultTransformers(): Promise<TransformersModule> {
  const mod = await import("@huggingface/transformers");
  return mod as unknown as TransformersModule;
}
