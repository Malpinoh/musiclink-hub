import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, ArrowLeft, AlertTriangle } from "lucide-react";

interface ApiLog {
  id: string;
  created_at: string;
  category: string;
  step: string;
  level: string;
  message: string;
  pre_save_id: string | null;
  fan_id: string | null;
  origin: string | null;
  user_agent: string | null;
  ip: string | null;
  context: Record<string, unknown>;
}

const CATEGORIES = ["all", "spotify_oauth", "spotify_config", "presave_fan_upsert", "presave_load", "presave_other"];

const AdminApiLogs = () => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const checkRole = async () => {
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) { setAuthorized(false); return false; }
    const { data, error } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    const ok = !error && !!data;
    setAuthorized(ok);
    return ok;
  };

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("api_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (category !== "all") q = q.eq("category", category);
    if (search.trim()) q = q.ilike("message", `%${search.trim()}%`);
    const { data } = await q;
    setLogs((data as unknown as ApiLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const ok = await checkRole();
      if (ok) await load();
      else setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authorized) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
        <h1 className="font-display text-xl font-bold mb-1">Admins only</h1>
        <p className="text-sm text-muted-foreground mb-4">
          You need the <code>admin</code> role to view API logs.
        </p>
        <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-2">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <h1 className="font-display text-2xl font-bold">API Error Logs</h1>
            <p className="text-sm text-muted-foreground">
              Server-side failures from Spotify OAuth, client-id config, and fan-signup upserts.
            </p>
          </div>
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={c === category ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
          <Input
            placeholder="Search message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={load}>Search</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No logs yet 🎉</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <details key={log.id} className="rounded-lg border border-border bg-card/40 p-3 text-sm">
                <summary className="cursor-pointer flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                    {log.category}
                  </span>
                  <span className="font-mono text-[10px] uppercase bg-muted px-1.5 py-0.5 rounded">
                    {log.step}
                  </span>
                  <span className="flex-1 truncate">{log.message}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </summary>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {log.origin && <p><strong>Origin:</strong> {log.origin}</p>}
                  {log.ip && <p><strong>IP:</strong> {log.ip}</p>}
                  {log.pre_save_id && <p><strong>Pre-save:</strong> {log.pre_save_id}</p>}
                  {log.fan_id && <p><strong>Fan:</strong> {log.fan_id}</p>}
                  {log.user_agent && <p className="break-all"><strong>UA:</strong> {log.user_agent}</p>}
                  <pre className="bg-background/60 p-2 rounded overflow-auto max-h-64 text-[10px] whitespace-pre-wrap break-words">
{JSON.stringify(log.context, null, 2)}
                  </pre>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApiLogs;
