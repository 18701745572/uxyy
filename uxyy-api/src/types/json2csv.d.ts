declare module 'json2csv' {
  export interface ParserOptions {
    fields?: string[];
    header?: boolean;
  }

  export class Parser {
    constructor(options?: ParserOptions);
    parse(data: Record<string, unknown>[]): string;
  }
}
