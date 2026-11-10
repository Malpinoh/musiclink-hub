import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The gateway verifies JWT signatures (verify_jwt=true). Service-role
// requests are reserved for trusted cron/server-to-server execution. Signed-in
// owners may invoke campaign-scoped actions after ownership is verified.
export function isServiceRoleRequest(req: Request): boolean {
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\\s+(.+)$/i);
  return Boolean(expected && match && match[1] === expected);
}

export async function isAuthorizedPreSaveRequest(
  req: Request,
  preSaveId: string | null,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<boolean> {
  if (isServiceRoleRequest(req)) return true;
  if (!preSaveId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(preSaveId)) return false;

  const authorization = req.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\\s+(.+)$/i);
  const token = match?.[1];
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !anonKey) return false;

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return false;

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await admin
    .from("pre_saves")
    .select("id")
    .eq("id", preSaveId)
    .eq("user_id", user.id)
    .maybeSingle();
  return !error && Boolean(data);
}
