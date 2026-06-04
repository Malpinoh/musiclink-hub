import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshSpotifyToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { accessToken: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() };
  } catch (e) { console.error("refresh error", e); return null; }
}

async function saveAlbumToLibrary(token: string, albumId: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.spotify.com/v1/me/albums?ids=${albumId}`, {
      method: "PUT", headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch { return false; }
}

async function followArtist(token: string, artistId: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.spotify.com/v1/me/following?type=artist&ids=${artistId}`, {
      method: "PUT", headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch { return false; }
}

async function addToPlaylist(token: string, playlistId: string, albumId: string): Promise<boolean> {
  try {
    // Fetch album tracks first
    const ar = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!ar.ok) return false;
    const albumData = await ar.json();
    const uris = (albumData.items ?? []).map((t: { uri: string }) => t.uri).filter(Boolean);
    if (uris.length === 0) return false;
    const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris }),
    });
    return r.ok;
  } catch { return false; }
}

async function sendReleaseEmail(email: string, name: string, preSave: { title: string; artist: string; artwork_url: string | null; artist_slug: string; slug: string }): Promise<{ ok: boolean; error?: string }> {
  const brevoKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoKey) return { ok: false, error: "BREVO_API_KEY missing" };
  try {
    const listenUrl = `https://track-nexus-io.lovable.app/listen/${preSave.artist_slug}-${preSave.slug}`;
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "MDistro Link", email: "no-reply@malpinohdistro.com.ng" },
        to: [{ email, name }],
        subject: `🎵 ${preSave.title} by ${preSave.artist} is out!`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:24px;">
            ${preSave.artwork_url ? `<img src="${preSave.artwork_url}" alt="${preSave.title}" style="width:100%;border-radius:12px;margin-bottom:24px;" />` : ""}
            <h1 style="font-size:28px;margin:0 0 8px;">${preSave.title} is out now!</h1>
            <p style="font-size:16px;color:#a0a0a0;margin:0 0 24px;">${preSave.artist}</p>
            <p style="font-size:14px;line-height:1.6;">Hi ${name}, you pre-saved this release — it's now in your Spotify library and ready to stream.</p>
            <a href="${listenUrl}" style="display:inline-block;background:#1DB954;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Listen now</a>
            <p style="font-size:12px;color:#666;margin-top:32px;">Powered by MDistro Link</p>
          </div>`,
      }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  console.log("Starting execute-presave-library-saves...");

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: releases } = await supabase
      .from("pre_saves")
      .select("id, spotify_album_id, spotify_artist_id, title, artist, artwork_url, artist_slug, slug, auto_follow_artist, auto_add_to_playlist, playlist_id, send_release_email")
      .eq("is_released", true)
      .not("spotify_album_id", "is", null);

    if (!releases?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let saved = 0, followed = 0, playlisted = 0, emailed = 0, errors = 0;

    for (const ps of releases) {
      const { data: actions } = await supabase
        .from("pre_save_actions")
        .select("*")
        .eq("pre_save_id", ps.id)
        .or("library_saved.eq.false,email_sent.eq.false")
        .not("spotify_refresh_token", "is", null);
      if (!actions) continue;

      for (const action of actions) {
        try {
          let token: string = action.spotify_access_token;
          const expired = !action.token_expires_at || new Date(action.token_expires_at) < new Date();
          if (expired) {
            const refreshed = await refreshSpotifyToken(action.spotify_refresh_token);
            if (!refreshed) { errors++; await supabase.from("pre_save_actions").update({ last_error: "token refresh failed" }).eq("id", action.id); continue; }
            token = refreshed.accessToken;
            await supabase.from("pre_save_actions").update({
              spotify_access_token: refreshed.accessToken,
              token_expires_at: refreshed.expiresAt,
            }).eq("id", action.id);
          }

          const updates: Record<string, unknown> = {};

          if (!action.library_saved && ps.spotify_album_id) {
            const ok = await saveAlbumToLibrary(token, ps.spotify_album_id);
            if (ok) { updates.library_saved = true; updates.library_saved_at = new Date().toISOString(); saved++; }
          }

          if (ps.auto_follow_artist && !action.artist_followed && ps.spotify_artist_id) {
            const ok = await followArtist(token, ps.spotify_artist_id);
            if (ok) { updates.artist_followed = true; updates.artist_followed_at = new Date().toISOString(); followed++; }
          }

          if (ps.auto_add_to_playlist && ps.playlist_id && !action.playlist_added && ps.spotify_album_id) {
            const ok = await addToPlaylist(token, ps.playlist_id, ps.spotify_album_id);
            if (ok) { updates.playlist_added = true; updates.playlist_added_at = new Date().toISOString(); playlisted++; }
          }

          if (ps.send_release_email && !action.email_sent) {
            const to = action.fan_email || action.email;
            const name = action.fan_name || "there";
            if (to) {
              const r = await sendReleaseEmail(to, name, ps);
              if (r.ok) { updates.email_sent = true; updates.email_sent_at = new Date().toISOString(); emailed++; }
              else { updates.last_error = r.error?.slice(0, 500); }
            }
          }

          if (Object.keys(updates).length > 0) {
            await supabase.from("pre_save_actions").update(updates).eq("id", action.id);
          }
          await new Promise((r) => setTimeout(r, 100));
        } catch (e) {
          console.error("action error", action.id, e);
          errors++;
        }
      }
    }

    console.log(`Done: saved=${saved} followed=${followed} playlisted=${playlisted} emailed=${emailed} errors=${errors}`);
    return new Response(
      JSON.stringify({ success: true, saved, followed, playlisted, emailed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error(e);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
