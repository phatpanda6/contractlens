// Example consumer: code that depends on the shape of the products API
// response. It only lists the fields it actually uses.
export type Product = {
  title: string;
  price: number;
};

// Builds the text a product card would show, e.g. "Nike Hoodie: $89.99".
export function formatProduct(product: Product): string {
  // toFixed only exists on numbers. If the API starts sending price as a
  // string, this line throws.
  return `${product.title}: $${product.price.toFixed(2)}`;
}
