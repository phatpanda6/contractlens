export function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "http://127.0.0.1:3000/api/demo/products/v1",
    },
  });
}
