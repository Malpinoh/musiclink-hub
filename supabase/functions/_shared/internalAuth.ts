// Internal-only Edge Function guard. The Supabase gateway verifies the JWT
// signature (verify_jwt=true); this additionally restricts callers to the
// project's service-role token, not ordinary signed-in users.
export function isServiceRoleRequest(req: Request): boolean {
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return Boolean(expected && match && match[1] === expected);
}
