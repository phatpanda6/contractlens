// ContractLens uses a simplified schema format focused on response shape drift,
// not the full JSON Schema specification.
export type PrimitiveSchema =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined";

// A response shape can be a primitive type, an object with nested shapes,
// or an array whose item shape is represented by another JsonSchemaShape.
export type JsonSchemaShape =
  | PrimitiveSchema
  | { [key: string]: JsonSchemaShape }
  | JsonSchemaShape[]
export type DiffSeverity = "breaking" | "info";

export type DiffType = "MISSING_FIELD" | "NEW_FIELD" | "TYPE_CHANGED";

// Represents one detected difference between a baseline schema and a later schema.
export type SchemaDiff = {
  type: DiffType;
  path: string;
  severity: DiffSeverity;
  from?: string;
  to?: string;
};
