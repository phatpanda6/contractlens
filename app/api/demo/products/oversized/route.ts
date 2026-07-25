export function GET() {
  const largeText = "x".repeat(1_100_000);

  return Response.json({
    data: largeText,
  });
}
