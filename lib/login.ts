export type LoginMethod = "magic" | "password";

export function parseLoginMethod(value: string | undefined): LoginMethod {
  return value === "password" ? "password" : "magic";
}

export function loginHref(method: LoginMethod): string {
  return method === "password" ? "/login?method=password" : "/login";
}
