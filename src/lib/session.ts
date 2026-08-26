import "server-only";
import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE = "sb-access-token";
const REFRESH_TOKEN_COOKIE = "sb-refresh-token";
const USER_ROLE_COOKIE = "sb-user-role";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type UserRole = "administrador" | "revendedor";

export async function createSession(
  accessToken: string,
  refreshToken: string,
  role: UserRole = "revendedor"
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });

  cookieStore.set(USER_ROLE_COOKIE, role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(USER_ROLE_COOKIE);
}

export async function getSession(): Promise<{
  accessToken: string | undefined;
  refreshToken: string | undefined;
}> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
  };
}

export async function getSessionUser(): Promise<{
  accessToken: string | undefined;
  role: UserRole | undefined;
}> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const rawRole = cookieStore.get(USER_ROLE_COOKIE)?.value;
  const role =
    rawRole === "administrador" || rawRole === "revendedor"
      ? rawRole
      : undefined;

  return { accessToken, role };
}
