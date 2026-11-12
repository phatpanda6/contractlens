import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { formatProduct, type Product } from "./format-product";

// Which saved response to test against. Defaults to v1 so `npm test` passes.
// Set PRODUCT_FIXTURE to another file path to run the same test against it.
const defaultFixture = fileURLToPath(
  new URL("./fixtures/product-v1.json", import.meta.url),
);
const fixturePath = process.env.PRODUCT_FIXTURE ?? defaultFixture;

it("formats the product price with two decimals", () => {
  // The cast mirrors real consumer code: it trusts the API to match the type.
  const product = JSON.parse(readFileSync(fixturePath, "utf8")) as Product;

  // Only the price is checked. The title is deliberately left untested.
  expect(formatProduct(product)).toContain("$89.99");
});
