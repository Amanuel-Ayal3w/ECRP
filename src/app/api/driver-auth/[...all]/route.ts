import { authDriver } from "@/lib/auth-driver";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(authDriver);
