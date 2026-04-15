/** Query param from landing: ?as=passenger | ?as=driver */

export type AuthRole = "passenger" | "driver" | "admin";

export function parseAuthRole(value: string | null): AuthRole | null {
  if (value === "passenger" || value === "driver" || value === "admin") return value;
  return null;
}

export function postLoginPath(role: AuthRole | null): string {
  if (role === "driver") return "/driver";
  if (role === "passenger") return "/passenger";
  return "/onboarding";
}

export function postSignupPath(role: AuthRole | null): string {
  if (role === "driver")    return "/driver";
  if (role === "passenger") return "/passenger";
  return "/passenger";
}

export function telegramPath(role: AuthRole | null): string {
  if (role === "driver") return "/driver";
  return "/passenger";
}

export function asQuery(role: AuthRole | null): string {
  return role ? `?as=${role}` : "";
}
