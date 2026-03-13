import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Music2, Loader2, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformIcon, getPlatformDisplayName } from "@/components/icons/PlatformIcons";
import SEOHead from "@/components/SEOHead";
import logo from "@/assets/logo.png";
import demoArtwork from "@/assets/demo-artwork.jpg";

interface StreamingLink {
  platform_name: string;
  platform_url: string;
  display_order: number;
}

const ListenPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [preSave, setPreSave] = useState<any>(null);
  const [links, setLinks] = useState<StreamingLink[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    (async () => {
      // Resolve slug to pre-save
      const { data: allPre } = await supabase
        .from("pre_saves")
        .select("*")
        .eq("is_active", true);

      if (!allPre) { setLoading(false); return; }

      let match = allPre.find((ps) => `${ps.artist_slug}-${ps.slug}` === slug);
      if (!match) match = allPre.find((ps) => ps.slug === slug);
      if (!match) {
        match = allPre.find((ps) => {
          const prefix = ps.artist_slug + "-";
          return slug.startsWith(prefix) && slug.slice(prefix.length) === ps.slug;
        });
      }

      if (!match) { setLoading(false); return; }

      setPreSave(match);

      // Fetch streaming links
      const { data: streamLinks } = await supabase
        .from("presave_streaming_links")
        .select("platform_name, platform_url, display_order")
        .eq("pre_save_id", match.id)
        .order("display_order");

      setLinks(streamLinks || []);
      setLoading(false);
    })();
  }, [slug]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share && preSave) {
      try {
        await navigator.share({ title: `${preSave.title} by ${preSave.artist}`, url: window.location.href });
      } catch { handleCopy(); }
    } else { handleCopy(); }
  };

  const platformColors: Record<string, string> = {
    "Spotify": "#1DB954",
    "Apple Music": "#FA243C",
    "YouTube Music": "#FF0000",
    "Audiomack": "#FFA500",
    "Boomplay": "#E8490E",
    "Deezer": "#A238FF",
    "Tidal": "#000000",
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!preSave) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Not Found</h1>
        <p className="text-muted-foreground mb-6">This streaming link doesn't exist.</p>
        <Button variant="hero" asChild><Link to="/">Go Home</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead title={preSave.title} artist={preSave.artist} imageUrl={preSave.artwork_url || undefined} pageUrl={window.location.href} type="presave" />

      <div className="absolute inset-0 z-0">
        <img src={preSave.artwork_url || demoArtwork} alt="" className="w-full h-full object-cover opacity-20 blur-3xl scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <img src={logo} alt="MDistro Link" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-semibold text-sm">MDistro Link</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}><Share2 className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={handleCopy}>{copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}</Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <motion.div className="w-full max-w-md mx-auto text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div className="relative mb-8" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-accent/30 blur-2xl rounded-full opacity-50" />
              <img src={preSave.artwork_url || demoArtwork} alt={preSave.title} className="relative w-56 h-56 md:w-64 md:h-64 mx-auto rounded-2xl shadow-2xl object-cover" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent px-4 py-1 rounded-full">
                <span className="text-xs font-semibold text-primary-foreground">OUT NOW</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{preSave.title}</h1>
              <p className="text-lg text-muted-foreground">{preSave.artist}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
              {links.length > 0 ? links.map((link, i) => {
                const Icon = getPlatformIcon(link.platform_name);
                const color = platformColors[link.platform_name] || "#8b5cf6";
                return (
                  <motion.a
                    key={link.platform_name}
                    href={link.platform_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="platform-btn bg-secondary hover:bg-secondary/80 w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ borderLeft: `4px solid ${color}` }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <span className="w-8 h-8 flex items-center justify-center" style={{ color }}>
                      <Icon className="w-6 h-6" />
                    </span>
                    <span className="font-medium">Listen on {link.platform_name}</span>
                  </motion.a>
                );
              }) : (
                <div className="glass-card p-6 text-center">
                  <p className="text-muted-foreground">Streaming links are being generated. Check back shortly!</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </main>

        <footer className="p-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <img src={logo} alt="MDistro Link" className="w-4 h-4 rounded" />
            <span>Powered by MDistro Link</span>
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default ListenPage;
