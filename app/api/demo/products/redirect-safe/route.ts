export function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/api/demo/products/v1",
    },
  });
}
