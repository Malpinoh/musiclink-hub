import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Music2, Bell, Heart, UserPlus, Loader2, ExternalLink, Calendar, Share2, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import demoArtwork from "@/assets/demo-artwork.jpg";
import SEOHead from "@/components/SEOHead";
import { SpotifyIcon, AppleMusicIcon } from "@/components/icons/PlatformIcons";
import { getShareablePresaveUrl } from "@/lib/shareUrl";
import logo from "@/assets/logo.png";

interface PreSave {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  release_date: string | null;
  spotify_uri: string | null;
  spotify_album_id: string | null;
  spotify_artist_id: string | null;
  album_title: string | null;
  is_released: boolean;
  apple_music_url: string | null;
}

// Generate Spotify OAuth URL
const getSpotifyAuthUrl = (preSaveId: string, action: string, returnUrl: string): string => {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "your-client-id";
  const redirectUri = `${window.location.origin}/callback/spotify`;
  const scopes = "user-library-modify user-follow-modify user-read-email";
  const state = btoa(JSON.stringify({ preSaveId, action, returnUrl }));
  
  return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
};

// Generate Apple Music pre-add URL (placeholder that resolves on release)
const getAppleMusicPreAddUrl = (artist: string, title: string): string => {
  const query = encodeURIComponent(`${artist} ${title}`);
  return `https://music.apple.com/search?term=${query}`;
};

const PreSavePage = () => {
  const { artist, slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [preSave, setPreSave] = useState<PreSave | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  // Generate shareable URL that works with social media crawlers
  const shareableUrl = artist && slug 
    ? getShareablePresaveUrl(artist, slug) 
    : currentUrl;

  useEffect(() => {
    fetchPreSave();
  }, [artist, slug]);

  const fetchPreSave = async () => {
    try {
      const { data, error } = await supabase
        .from("pre_saves")
        .select("*")
        .eq("artist_slug", artist)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPreSave(data);
    } catch (error) {
      console.error("Error fetching pre-save:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePreSave = async () => {
    if (!preSave) return;

    setSaving(true);
    try {
      // If released with a resolved Spotify album, redirect directly
      if (preSave.is_released && preSave.spotify_album_id) {
        window.open(`https://open.spotify.com/album/${preSave.spotify_album_id}`, '_blank');
      } else if (preSave.is_released && preSave.spotify_uri) {
        const spotifyId = preSave.spotify_uri.split(':').pop();
        window.open(`https://open.spotify.com/album/${spotifyId}`, '_blank');
      } else {
        // For unreleased content, initiate Spotify OAuth to get library-modify permission
        const returnUrl = window.location.pathname;
        const authUrl = getSpotifyAuthUrl(preSave.id, "presave", returnUrl);
        window.location.href = authUrl;
        return; // Don't set saved state, OAuth flow will handle it
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAppleMusicPreAdd = () => {
    if (!preSave) return;
    
    // If released and we have Apple Music URL, use it
    if (preSave.is_released && preSave.apple_music_url) {
      window.open(preSave.apple_music_url, '_blank');
    } else {
      // For unreleased, open Apple Music search
      const searchUrl = getAppleMusicPreAddUrl(preSave.artist, preSave.title);
      window.open(searchUrl, '_blank');
      toast.info("Apple Music link opens on release day. Search for the track when it's live!");
    }
  };

  const handleFollowArtist = async () => {
    if (!preSave?.spotify_artist_id) return;

    try {
      // Track with geo data via edge function
      await supabase.functions.invoke("track-geo", {
        body: {
          type: "presave_action",
          id: preSave.id,
          action_type: "follow_artist",
        },
      });

      window.open(`https://open.spotify.com/artist/${preSave.spotify_artist_id}`, '_blank');
    } catch (error) {
      console.error("Error following artist:", error);
      // Fallback to direct insert
      await supabase.from("pre_save_actions").insert({
        pre_save_id: preSave.id,
        action_type: 'follow_artist'
      });
      window.open(`https://open.spotify.com/artist/${preSave.spotify_artist_id}`, '_blank');
    }
  };

  const formatReleaseDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    toast.success("Link copied! This link works with social media previews.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share && preSave) {
      try {
        await navigator.share({
          title: `${preSave.title} by ${preSave.artist}`,
          text: `Pre-save ${preSave.title} on Spotify`,
          url: shareableUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !preSave) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Pre-Save Not Found</h1>
        <p className="text-muted-foreground mb-6">This pre-save link doesn't exist or has been removed.</p>
        <Button variant="hero" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* SEO Head */}
      <SEOHead
        title={preSave.title}
        artist={preSave.artist}
        imageUrl={preSave.artwork_url || undefined}
        pageUrl={currentUrl}
        albumTitle={preSave.album_title || undefined}
        type="presave"
      />

      {/* Background with artwork blur */}
      <div className="absolute inset-0 z-0">
        <img
          src={preSave.artwork_url || demoArtwork}
          alt=""
          className="w-full h-full object-cover opacity-20 blur-3xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <img src={logo} alt="MDistro Link" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-semibold text-sm">MDistro Link</span>
          </Link>

          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopyLink}>
              {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <motion.div
            className="w-full max-w-md mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Artwork */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-accent/30 blur-2xl rounded-full opacity-50 animate-pulse-glow" />
              <img
                src={preSave.artwork_url || demoArtwork}
                alt={`${preSave.title} artwork`}
                className="relative w-56 h-56 md:w-64 md:h-64 mx-auto rounded-2xl shadow-2xl object-cover"
              />
              
              {/* Pre-save Badge */}
              {!preSave.is_released && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent px-4 py-1 rounded-full">
                  <span className="text-xs font-semibold text-primary-foreground">PRE-SAVE</span>
                </div>
              )}
            </motion.div>

            {/* Track Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
                {preSave.title}
              </h1>
              <p className="text-lg text-muted-foreground">{preSave.artist}</p>
              
              {preSave.release_date && !preSave.is_released && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Dropping {formatReleaseDate(preSave.release_date)}</span>
                </div>
              )}
            </motion.div>

            {/* Pre-save Actions */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Main Pre-save Button */}
              <motion.button
                onClick={handlePreSave}
                disabled={saving || saved}
                className={`w-full flex items-center justify-center gap-4 p-4 rounded-xl font-medium transition-all duration-300 ${
                  saved 
                    ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                    : 'bg-[#1DB954]/20 hover:bg-[#1DB954]/30 border-[#1DB954]/50'
                } border`}
                whileHover={{ scale: saved ? 1 : 1.02 }}
                whileTap={{ scale: saved ? 1 : 0.98 }}
              >
                {saving ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : saved ? (
                  <>
                    <Heart className="w-6 h-6 fill-current" />
                    <span>You're on the list!</span>
                  </>
                ) : (
                  <>
                    <SpotifyIcon />
                    <span className="flex-1 text-left">
                      {preSave.is_released ? 'Listen on Spotify' : 'Pre-Save to Spotify'}
                    </span>
                    <ExternalLink className="w-4 h-4 opacity-50" />
                  </>
                )}
              </motion.button>

              {/* Apple Music Pre-Add Button */}
              <motion.button
                onClick={handleAppleMusicPreAdd}
                className="w-full flex items-center gap-4 p-4 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-[#FA233B]/20 to-[#FB5C74]/20 hover:from-[#FA233B]/30 hover:to-[#FB5C74]/30 border border-[#FA233B]/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <AppleMusicIcon />
                <span className="flex-1 text-left">
                  {preSave.is_released ? 'Listen on Apple Music' : 'Pre-Add on Apple Music'}
                </span>
                <ExternalLink className="w-4 h-4 opacity-50" />
              </motion.button>

              {/* Follow Artist Button */}
              {preSave.spotify_artist_id && (
                <motion.button
                  onClick={handleFollowArtist}
                  className="w-full flex items-center gap-4 p-4 rounded-xl font-medium transition-all duration-300 bg-secondary/50 hover:bg-secondary/70 border border-border/30 hover:border-primary/30"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserPlus className="w-6 h-6 text-primary" />
                  <span className="flex-1 text-left">Follow {preSave.artist}</span>
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </motion.button>
              )}

              {/* Pre-save Info Banner */}
              {!preSave.is_released && !saved && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col items-center gap-2 text-sm text-muted-foreground mt-6"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span>Pre-save available. Streaming links activate on release day.</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <img src={logo} alt="MDistro Link" className="w-4 h-4 rounded" />
            <span>Powered by MDistro Link</span>
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default PreSavePage;
