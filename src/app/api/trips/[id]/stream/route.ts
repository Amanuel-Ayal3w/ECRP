// Real-time events are now delivered via Pusher private channels.
// Subscribe on the client using pusher-js to `private-trip.<tripId>`.
export async function GET() {
  return new Response(
    JSON.stringify({ error: "SSE stream removed. Use Pusher channel private-trip.<tripId>." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );
}
