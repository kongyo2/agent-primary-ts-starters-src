export interface ExtractorOutput {
  data: Float32Array | number[];
}

export type Extractor = (text: string, opts: { pooling: "mean"; normalize: true }) => Promise<ExtractorOutput>;

export type PipelineFn = (task: string, modelId: string) => Promise<Extractor>;

export interface TransformersModule {
  pipeline: PipelineFn;
}

export interface Embedder {
  readonly modelId: string;
  readonly vectorDimension: number;
  embed(text: string): Promise<number[]>;
}
