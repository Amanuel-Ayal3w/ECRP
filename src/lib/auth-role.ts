/** Query param from landing: ?as=passenger | ?as=driver */

export type AuthRole = "passenger" | "driver";

export function parseAuthRole(value: string | null): AuthRole | null {
  if (value === "passenger" || value === "driver") return value;
  return null;
}

export function postLoginPath(role: AuthRole | null): string {
  if (role === "driver") return "/driver";
  if (role === "passenger") return "/passenger";
  return "/onboarding";
}

export function postSignupPath(role: AuthRole | null): string {
  if (role === "driver") return "/onboarding/driver";
  if (role === "passenger") return "/onboarding";
  return "/onboarding";
}

export function telegramPath(role: AuthRole | null): string {
  if (role === "driver") return "/onboarding/driver";
  return "/onboarding";
}

export function asQuery(role: AuthRole | null): string {
  return role ? `?as=${role}` : "";
}
