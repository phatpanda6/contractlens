export function GET() {
  return new Response('{"id": "p_123"', {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
