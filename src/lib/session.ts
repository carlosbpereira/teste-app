import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const ACCESS_TOKEN_COOKIE = "sb-access-token";
const REFRESH_TOKEN_COOKIE = "sb-refresh-token";
const USER_ROLE_COOKIE = "sb-user-role";
const USER_ID_COOKIE = "sb-user-id";
const USER_NAME_COOKIE = "sb-user-name";
const USER_PHONE_COOKIE = "sb-user-phone";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type UserRole = "administrador" | "revendedor";

export async function createSession(
  accessToken: string,
  refreshToken: string,
  role: UserRole = "revendedor",
  userId: string = "",
  name: string = "",
  phone: string = ""
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const cookieStore = await cookies();

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOpts);
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOpts);
  cookieStore.set(USER_ROLE_COOKIE, role, cookieOpts);
  cookieStore.set(USER_ID_COOKIE, userId, cookieOpts);
  cookieStore.set(USER_NAME_COOKIE, name, cookieOpts);
  cookieStore.set(USER_PHONE_COOKIE, phone, cookieOpts);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const allCookies = [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    USER_ROLE_COOKIE,
    USER_ID_COOKIE,
    USER_NAME_COOKIE,
    USER_PHONE_COOKIE,
  ];

  for (const c of allCookies) {
    cookieStore.delete(c);
    cookieStore.set(c, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });
  }
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
  userId: string | undefined;
  name: string | undefined;
  phone: string | undefined;
}> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const rawRole = cookieStore.get(USER_ROLE_COOKIE)?.value;
  const userId = cookieStore.get(USER_ID_COOKIE)?.value;
  const name = cookieStore.get(USER_NAME_COOKIE)?.value;
  const phone = cookieStore.get(USER_PHONE_COOKIE)?.value;
  const role =
    rawRole === "administrador" || rawRole === "revendedor"
      ? rawRole
      : undefined;

  return { accessToken, role, userId, name, phone };
}

/**
 * Obtém o userId via Supabase getUser() para validação server-side confiável.
 */
export async function getVerifiedUserId(): Promise<string | null> {
  const { accessToken } = await getSession();
  if (!accessToken) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}
