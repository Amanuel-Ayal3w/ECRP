import Pusher from "pusher";

const globalForPusher = global as typeof global & { _pusherServer?: Pusher };

function createPusherServer(): Pusher {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_APP_KEY;
  const secret = process.env.PUSHER_APP_SECRET;
  const cluster = process.env.PUSHER_APP_CLUSTER ?? "mt1";

  if (!appId || !key || !secret) {
    throw new Error(
      "Missing Pusher env vars: PUSHER_APP_ID, PUSHER_APP_KEY, PUSHER_APP_SECRET",
    );
  }

  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

export const pusherServer: Pusher =
  globalForPusher._pusherServer ??
  (globalForPusher._pusherServer = createPusherServer());
