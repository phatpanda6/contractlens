export type PrimitiveSchema =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined";

export type JsonSchemaShape =
  | PrimitiveSchema
  | { [key: string]: JsonSchemaShape }
  | JsonSchemaShape[];

export type DiffSeverity = "breaking" | "info";

export type DiffType = "MISSING_FIELD" | "NEW_FIELD" | "TYPE_CHANGED";

export type SchemaDiff = {
  type: DiffType;
  path: string;
  severity: DiffSeverity;
  from?: string;
  to?: string;
};
