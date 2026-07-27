import type { TransformersModule } from "./embedder-types.ts";

export async function loadDefaultTransformers(): Promise<TransformersModule> {
  const mod = await import("@huggingface/transformers");
  // This file is the single place the untyped-for-our-purposes transformers
  // surface is narrowed to the `TransformersModule` contract in
  // embedder-types.ts; every other module depends on that contract instead.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return mod as unknown as TransformersModule;
}
