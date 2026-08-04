import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReleaseTrack {
  isrc?: string | null;
  title?: string;
  track_number?: number | null;
  duration_ms?: number | null;
  spotify_track_url?: string | null;
  apple_track_url?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const limit = Math.min(Number(body?.limit) || 25, 50);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Candidates: this user's links that carry a UPC but are still track-level
    const { data: candidates, error: cErr } = await admin
      .from("fanlinks")
      .select("id, title, artist, upc, content_type, total_tracks")
      .eq("user_id", user.id)
      .not("upc", "is", null)
      .neq("upc", "")
      .or("content_type.is.null,content_type.eq.track")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cErr) throw cErr;

    const results: Array<Record<string, unknown>> = [];

    if (dryRun || !candidates?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: dryRun,
          candidates: candidates?.length ?? 0,
          items: (candidates ?? []).map((c) => ({ id: c.id, title: c.title, upc: c.upc })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const link of candidates) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
          body: JSON.stringify({ input: link.upc }),
        });
        const payload = await res.json();

        if (!res.ok || payload?.not_found || payload?.content_type !== "release") {
          results.push({ id: link.id, title: link.title, status: "skipped", reason: payload?.error || "no release match" });
          continue;
        }

        const metadata = payload.metadata ?? {};
        const tracklist: ReleaseTrack[] = Array.isArray(payload.tracklist) ? payload.tracklist : [];
        const streaming: Record<string, string> = payload.streaming_links ?? {};

        // 1. Promote the fanlink to release level
        const { error: uErr } = await admin
          .from("fanlinks")
          .update({
            content_type: "release",
            release_type: metadata.release_type || "Album",
            tracklist: tracklist as unknown as never,
            total_tracks: metadata.total_tracks ?? tracklist.length ?? 1,
            release_date: metadata.release_date ?? null,
            artwork_url: metadata.artwork?.large ?? metadata.artwork?.medium ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", link.id);
        if (uErr) throw uErr;

        // 2. Repoint platform links at the release URLs
        let repointed = 0;
        const { data: existing } = await admin
          .from("platform_links")
          .select("id, platform_name")
          .eq("fanlink_id", link.id);

        for (const [name, url] of Object.entries(streaming)) {
          if (!url) continue;
          const match = existing?.find((p) => p.platform_name === name);
          if (match) {
            await admin.from("platform_links").update({ platform_url: url }).eq("id", match.id);
          } else {
            await admin.from("platform_links").insert({
              fanlink_id: link.id,
              platform_name: name,
              platform_url: url,
              display_order: (existing?.length ?? 0) + repointed,
            });
          }
          repointed++;
        }

        // 3. Normalized release row (one per fanlink)
        const releasePayload = {
          user_id: user.id,
          fanlink_id: link.id,
          upc: metadata.upc ?? link.upc,
          artist_name: metadata.artist ?? link.artist,
          release_title: metadata.title ?? link.title,
          release_type: metadata.release_type || "Album",
          artwork: metadata.artwork?.large ?? null,
          release_date: metadata.release_date ?? null,
          spotify_release_url: streaming.spotify ?? null,
          apple_release_url: streaming.apple_music?.startsWith("http") ? streaming.apple_music : null,
          youtube_release_url: streaming.youtube ?? null,
          deezer_release_url: streaming.deezer ?? null,
          tidal_release_url: streaming.tidal ?? null,
          amazon_release_url: streaming.amazon ?? null,
          boomplay_release_url: streaming.boomplay ?? null,
          audiomack_release_url: streaming.audiomack ?? null,
          updated_at: new Date().toISOString(),
        };

        const { data: existingRelease } = await admin
          .from("releases")
          .select("id")
          .eq("fanlink_id", link.id)
          .maybeSingle();

        let releaseId = existingRelease?.id as string | undefined;
        if (releaseId) {
          await admin.from("releases").update(releasePayload).eq("id", releaseId);
        } else {
          const { data: inserted, error: rErr } = await admin
            .from("releases")
            .insert(releasePayload)
            .select("id")
            .single();
          if (rErr) throw rErr;
          releaseId = inserted.id;
        }

        // 4. Replace tracks for the release
        if (releaseId && tracklist.length) {
          await admin.from("tracks").delete().eq("release_id", releaseId);
          await admin.from("tracks").insert(
            tracklist.map((t, i) => ({
              release_id: releaseId,
              isrc: t.isrc ?? null,
              track_number: t.track_number ?? i + 1,
              track_title: t.title ?? `Track ${i + 1}`,
              duration_ms: t.duration_ms ?? null,
              spotify_track_url: t.spotify_track_url ?? null,
              apple_track_url: t.apple_track_url ?? null,
            }))
          );
        }

        results.push({
          id: link.id,
          title: link.title,
          status: "upgraded",
          tracks: tracklist.length,
          platforms: repointed,
        });
      } catch (e) {
        results.push({
          id: link.id,
          title: link.title,
          status: "failed",
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const upgraded = results.filter((r) => r.status === "upgraded").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return new Response(
      JSON.stringify({ success: true, scanned: candidates.length, upgraded, skipped, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("backfill-release-links error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
