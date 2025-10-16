declare module "papaparse" {
  interface UnparseConfig {
    delimiter?: string;
    quotes?: boolean | boolean[];
    newline?: string;
    header?: boolean;
    skipEmptyLines?: boolean | "greedy";
  }

  interface PapaParse {
    unparse: <T>(data: T, config?: UnparseConfig) => string;
  }

  const Papa: PapaParse;
  export type { UnparseConfig };
  export default Papa;
}
