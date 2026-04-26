"use client";

import PusherJs from "pusher-js";

// Lazily initialised so it is only created in the browser.
let client: PusherJs | null = null;

export function getPusherClient(): PusherJs {
  if (client) return client;

  const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER ?? "mt1";

  if (!key) throw new Error("Missing NEXT_PUBLIC_PUSHER_APP_KEY");

  client = new PusherJs(key, {
    cluster,
    authEndpoint: "/api/realtime/auth",
    authTransport: "ajax",
  });

  return client;
}
