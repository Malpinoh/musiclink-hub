import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Music2, ExternalLink, Instagram, Youtube } from "lucide-react";
import { getPlatformIcon } from "@/components/icons/PlatformIcons";

// Social icons
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface ArtistProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  profile_picture_url: string | null;
  is_verified: boolean;
  instagram_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
}

interface CustomButton {
  id: string;
  title: string;
  url: string;
  display_order: number;
}

interface Release {
  id: string;
  title: string;
  artwork_url: string | null;
  slug: string;
  artist_slug: string;
  release_type: string | null;
  release_date: string | null;
  platform_links: { platform_name: string; platform_url: string }[];
}

const SOCIAL_PLATFORMS = [
  { key: "instagram_url", label: "Instagram", icon: Instagram, color: "#E1306C" },
  { key: "tiktok_url", label: "TikTok", icon: TikTokIcon, color: "#ffffff" },
  { key: "twitter_url", label: "X (Twitter)", icon: XIcon, color: "#ffffff" },
  { key: "facebook_url", label: "Facebook", icon: FacebookIcon, color: "#1877F2" },
  { key: "youtube_url", label: "YouTube", icon: Youtube, color: "#FF0000" },
] as const;

const STREAMING_PLATFORMS = ["spotify", "apple music", "boomplay", "audiomack", "youtube music", "youtube"];

const ArtistBioPage = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const hasCounted = useRef(false);

  useEffect(() => {
    if (username) fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from("artist_profiles")
        .select("*")
        .eq("username", username)
        .eq("is_active", true)
        .single();

      if (error || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch custom buttons, releases and platform links in parallel
      const [buttonsResult, releasesResult] = await Promise.all([
        supabase
          .from("artist_custom_buttons")
          .select("*")
          .eq("artist_profile_id", profileData.id)
          .order("display_order"),
        supabase
          .from("fanlinks")
          .select("id, title, artwork_url, slug, artist_slug, release_type, release_date")
          .eq("user_id", profileData.user_id)
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
      ]);

      setCustomButtons(buttonsResult.data || []);

      // Fetch platform links for each release
      const releasesWithLinks: Release[] = [];
      for (const rel of releasesResult.data || []) {
        const { data: links } = await supabase
          .from("platform_links")
          .select("platform_name, platform_url")
          .eq("fanlink_id", rel.id)
          .eq("is_active", true);

        const streamingLinks = (links || []).filter(l =>
          STREAMING_PLATFORMS.includes(l.platform_name.toLowerCase())
        );
        releasesWithLinks.push({ ...rel, platform_links: streamingLinks });
      }
      setReleases(releasesWithLinks);

      // Count profile view (once per mount)
      if (!hasCounted.current) {
        hasCounted.current = true;
        await supabase.from("artist_profile_views").insert({
          artist_profile_id: profileData.id,
          user_agent: navigator.userAgent,
        });
        setViewCounted(true);
      }
    } catch (err) {
      console.error(err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const trackLinkClick = async (linkType: string, label: string, url: string) => {
    if (!profile) return;
    await supabase.from("artist_link_clicks").insert({
      artist_profile_id: profile.id,
      link_type: linkType,
      link_label: label,
      link_url: url,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Music2 className="w-16 h-16 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Artist not found</h1>
        <p className="text-muted-foreground">The artist page you're looking for doesn't exist.</p>
        <Link to="/" className="text-primary hover:underline">Go home</Link>
      </div>
    );
  }

  const socialLinks = SOCIAL_PLATFORMS.filter(s => profile[s.key as keyof ArtistProfile]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, hsl(187 100% 50% / 0.4) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-12 pb-20">
        {/* Profile Header */}
        <motion.div
          className="flex flex-col items-center text-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Avatar */}
          <div className="relative mb-5">
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary/40 shadow-lg"
              style={{ boxShadow: "0 0 40px hsl(187 100% 50% / 0.3)" }}>
              {profile.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <span className="font-display text-3xl font-bold text-primary">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {profile.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <BadgeCheck className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Name */}
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-display text-2xl md:text-3xl font-bold">{profile.display_name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-3">@{profile.username}</p>

          {/* Bio */}
          {profile.bio && (
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">{profile.bio}</p>
          )}
        </motion.div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <motion.div
            className="flex justify-center gap-3 mb-8 flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {socialLinks.map((s) => {
              const url = profile[s.key as keyof ArtistProfile] as string;
              const IconComp = s.icon;
              return (
                <a
                  key={s.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackLinkClick("social", s.label, url)}
                  className="w-11 h-11 rounded-full bg-secondary border border-border hover:border-primary/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ color: s.color }}
                  title={s.label}
                >
                  <IconComp />
                </a>
              );
            })}
          </motion.div>
        )}

        {/* Custom Buttons */}
        {customButtons.length > 0 && (
          <motion.div
            className="space-y-3 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {customButtons.map((btn) => (
              <a
                key={btn.id}
                href={btn.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackLinkClick("custom", btn.title, btn.url)}
                className="flex items-center justify-between w-full px-5 py-4 rounded-xl bg-secondary border border-border hover:border-primary/50 hover:bg-secondary/80 transition-all duration-200 group"
              >
                <span className="font-medium">{btn.title}</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            ))}
          </motion.div>
        )}

        {/* Music Releases */}
        {releases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="font-display text-lg font-semibold mb-4 text-center text-muted-foreground uppercase tracking-widest text-xs">
              Music
            </h2>
            <div className="space-y-4">
              {releases.map((release, i) => (
                <motion.div
                  key={release.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                >
                  {/* Release header */}
                  <Link
                    to={`/${release.artist_slug}/${release.slug}`}
                    target="_blank"
                    className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors group"
                    onClick={() => trackLinkClick("release", release.title, `/${release.artist_slug}/${release.slug}`)}
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                      {release.artwork_url ? (
                        <img src={release.artwork_url} alt={release.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="w-7 h-7 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate group-hover:text-primary transition-colors">
                        {release.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {release.release_type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                            {release.release_type}
                          </span>
                        )}
                        {release.release_date && (
                          <span className="text-xs text-muted-foreground">{release.release_date}</span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </Link>

                  {/* Streaming links */}
                  {release.platform_links.length > 0 && (
                    <div className="px-4 pb-4 flex flex-wrap gap-2">
                      {release.platform_links.map((pl) => {
                        const IconComp = getPlatformIcon(pl.platform_name);
                        return (
                          <a
                            key={pl.platform_name}
                            href={pl.platform_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackLinkClick("streaming", pl.platform_name, pl.platform_url)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-secondary border border-border hover:border-primary/50 hover:bg-secondary/80 transition-all duration-200 font-medium"
                          >
                            <IconComp className="w-3.5 h-3.5" />
                            {pl.platform_name}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer branding */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Powered by MDistro Link
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default ArtistBioPage;
