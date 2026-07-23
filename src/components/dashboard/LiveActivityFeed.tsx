import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MousePointerClick, UserPlus, Music2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Event = {
  id: string;
  kind: "click" | "fan" | "presave";
  label: string;
  meta?: string;
  at: number;
};

const iconFor = (k: Event["kind"]) =>
  k === "click" ? MousePointerClick : k === "fan" ? UserPlus : Music2;

const toneFor = (k: Event["kind"]) =>
  k === "click" ? "text-primary bg-primary/15" :
  k === "fan" ? "text-accent bg-accent/15" :
  "text-success bg-success/15";

const timeAgo = (ms: number) => {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

interface Props {
  userId: string;
  fanlinkIds: string[];
  presaveIds: string[];
  linkNames: Record<string, string>;
  presaveNames: Record<string, string>;
}

const LiveActivityFeed = ({ userId, fanlinkIds, presaveIds, linkNames, presaveNames }: Props) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [, tick] = useState(0);

  // ticking clock for "Xs ago"
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // Seed with recent activity
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const seed: Event[] = [];
      if (fanlinkIds.length) {
        const { data: clicks } = await supabase
          .from("clicks")
          .select("id, fanlink_id, platform_name, clicked_at")
          .in("fanlink_id", fanlinkIds)
          .order("clicked_at", { ascending: false })
          .limit(6);
        clicks?.forEach((c) => seed.push({
          id: `c-${c.id}`, kind: "click",
          label: `Click on ${linkNames[c.fanlink_id] || "a fanlink"}`,
          meta: c.platform_name || undefined,
          at: new Date(c.clicked_at).getTime(),
        }));

        const { data: fans } = await supabase
          .from("fan_contacts")
          .select("id, link_id, email, collected_at")
          .in("link_id", fanlinkIds)
          .order("collected_at", { ascending: false })
          .limit(4);
        fans?.forEach((f) => seed.push({
          id: `f-${f.id}`, kind: "fan",
          label: `New fan on ${linkNames[f.link_id] || "a fanlink"}`,
          meta: f.email ? f.email.replace(/(.{2}).*(@.*)/, "$1•••$2") : undefined,
          at: new Date(f.collected_at).getTime(),
        }));
      }
      if (presaveIds.length) {
        const { data: acts } = await supabase
          .from("pre_save_actions")
          .select("id, pre_save_id, created_at")
          .in("pre_save_id", presaveIds)
          .order("created_at", { ascending: false })
          .limit(4);
        acts?.forEach((a) => seed.push({
          id: `p-${a.id}`, kind: "presave",
          label: `Pre-save on ${presaveNames[a.pre_save_id] || "a release"}`,
          at: new Date(a.created_at).getTime(),
        }));
      }
      seed.sort((a, b) => b.at - a.at);
      setEvents(seed.slice(0, 10));
    })();
  }, [userId, fanlinkIds.join(","), presaveIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime inserts
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`activity-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clicks" }, (p) => {
        const r = p.new as { id: string; fanlink_id: string; platform_name: string | null; clicked_at: string };
        if (!fanlinkIds.includes(r.fanlink_id)) return;
        setEvents((prev) => [{
          id: `c-${r.id}`, kind: "click",
          label: `Click on ${linkNames[r.fanlink_id] || "a fanlink"}`,
          meta: r.platform_name || undefined,
          at: new Date(r.clicked_at).getTime(),
        }, ...prev].slice(0, 10));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fan_contacts" }, (p) => {
        const r = p.new as { id: string; link_id: string; email: string | null; collected_at: string };
        if (!fanlinkIds.includes(r.link_id)) return;
        setEvents((prev) => [{
          id: `f-${r.id}`, kind: "fan",
          label: `New fan on ${linkNames[r.link_id] || "a fanlink"}`,
          meta: r.email ? r.email.replace(/(.{2}).*(@.*)/, "$1•••$2") : undefined,
          at: new Date(r.collected_at).getTime(),
        }, ...prev].slice(0, 10));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pre_save_actions" }, (p) => {
        const r = p.new as { id: string; pre_save_id: string; created_at: string };
        if (!presaveIds.includes(r.pre_save_id)) return;
        setEvents((prev) => [{
          id: `p-${r.id}`, kind: "presave",
          label: `Pre-save on ${presaveNames[r.pre_save_id] || "a release"}`,
          at: new Date(r.created_at).getTime(),
        }, ...prev].slice(0, 10));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fanlinkIds.join(","), presaveIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-[var(--shadow-md)] h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-4 h-4 text-primary animate-pulse" />
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Live Activity
        </h3>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-6">
          <p className="text-sm text-muted-foreground">No activity yet. Share your first link ✨</p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-hidden">
          <AnimatePresence initial={false}>
            {events.map((e) => {
              const Icon = iconFor(e.kind);
              return (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/40 p-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneFor(e.kind)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{e.label}</p>
                    {e.meta && <p className="text-xs text-muted-foreground truncate">{e.meta}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider flex-shrink-0">
                    {timeAgo(e.at)}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

export default LiveActivityFeed;
