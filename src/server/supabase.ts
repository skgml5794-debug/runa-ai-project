import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * 서버에서만 쓰는 Supabase 클라이언트. 공개(Publishable/anon) 키만 사용하며 RLS가 접근을 제한한다.
 * 환경변수가 없으면 null을 반환해, 피드백 외의 기능에는 영향을 주지 않는다.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  client = url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  return client;
}

/** 테스트에서 환경변수를 바꿔 가며 쓸 때 캐시를 비운다. */
export function resetSupabase(): void {
  client = undefined;
}
