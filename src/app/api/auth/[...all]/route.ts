import { authPassenger } from "@/lib/auth-passenger";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(authPassenger);
