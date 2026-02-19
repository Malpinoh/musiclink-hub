import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Music2, 
  Search, 
  Loader2, 
  Calendar,
  User,
  Disc3,
  CheckCircle,
  ArrowRight,
  Clock,
  Edit3,
  Image as ImageIcon,
  AlertCircle,
  Upload,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/malpinohdistro/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";

interface PreSaveMetadata {
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  releaseDate: string;
  spotifyUri: string;
  spotifyAlbumId: string;
  spotifyArtistId: string;
  isrc: string;
  upc: string;
}

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const CreatePreSave = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Mode: "search" for Spotify lookup, "manual" for distributor metadata entry
  const [mode, setMode] = useState<"search" | "manual">("manual");
  
  // Search mode state
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Manual entry state
  const [manualData, setManualData] = useState({
    title: "",
    artist: "",
    upc: "",
    isrc: "",
    releaseDate: "",
    artworkUrl: ""
  });
  
  // Artwork upload state
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [creating, setCreating] = useState(false);
  const [metadata, setMetadata] = useState<PreSaveMetadata | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const detectInputType = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^\d{12,14}$/.test(trimmed)) return "UPC";
    if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(trimmed.toUpperCase())) return "ISRC";
    if (trimmed.includes("spotify.com") || trimmed.includes("open.spotify")) return "Spotify Link";
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setInputType(detectInputType(value));
  };

  const handleManualChange = (field: keyof typeof manualData, value: string) => {
    setManualData(prev => ({ ...prev, [field]: value }));
  };

  // Handle artwork file selection
  const handleArtworkSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setArtworkFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setArtworkPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearArtwork = () => {
    setArtworkFile(null);
    setArtworkPreview(null);
    setManualData(prev => ({ ...prev, artworkUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload artwork to storage
  const uploadArtwork = async (): Promise<string | null> => {
    if (!artworkFile || !user) return null;

    setUploading(true);
    try {
      const fileExt = artworkFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('artwork')
        .upload(fileName, artworkFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('artwork')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading artwork:", error);
      toast.error("Failed to upload artwork");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Build metadata from manual entry
  const handleManualSubmit = async () => {
    const { title, artist, upc, releaseDate } = manualData;
    
    if (!title.trim() || !artist.trim()) {
      toast.error("Please enter at least title and artist");
      return;
    }

    if (!upc.trim() || !/^\d{12,14}$/.test(upc.trim())) {
      toast.error("Please enter a valid UPC (12-14 digits)");
      return;
    }

    if (!releaseDate) {
      toast.error("Please enter the release date");
      return;
    }

    // Upload artwork if file selected
    let artworkUrl = manualData.artworkUrl.trim();
    if (artworkFile) {
      const uploadedUrl = await uploadArtwork();
      if (uploadedUrl) {
        artworkUrl = uploadedUrl;
      }
    }

    setMetadata({
      title: title.trim(),
      artist: artist.trim(),
      album: title.trim(),
      artworkUrl: artworkUrl,
      releaseDate: releaseDate,
      spotifyUri: "",
      spotifyAlbumId: "",
      spotifyArtistId: "",
      isrc: manualData.isrc.trim().toUpperCase(),
      upc: upc.trim()
    });

    toast.success("Release details ready! Pre-save available, streaming links activate on release day.");
  };

  const handleFetch = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a Spotify URL, UPC, or ISRC");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-link', {
        body: { input: inputValue.trim() }
      });

      if (error) throw error;

      // If not found, suggest manual mode for unreleased tracks
      if (data?.not_found || data?.error) {
        toast.info("Track not indexed yet. Use Manual Entry for unreleased music.", {
          description: "Enter your distributor-provided metadata (UPC, release date, artwork).",
          duration: 5000
        });
        setMode("manual");
        return;
      }
      
      if (!data) {
        toast.error("Could not find release information");
        return;
      }

      const md = data.metadata || data;
      
      setMetadata({
        title: md.title || '',
        artist: md.artist || '',
        album: md.album || md.title || '',
        artworkUrl: md.artwork?.large || md.artwork?.medium || '',
        releaseDate: md.release_date || '',
        spotifyUri: md.spotify_track_url ? `spotify:track:${md.spotify_track_url.split('/').pop()}` : '',
        spotifyAlbumId: md.album_id || '',
        spotifyArtistId: md.artist_id || '',
        isrc: md.isrc || '',
        upc: md.upc || ''
      });

      toast.success("Release metadata fetched!");
    } catch (error: any) {
      console.error("Error fetching metadata:", error);
      toast.info("Track not found. Switch to Manual Entry for unreleased music.");
      setMode("manual");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!metadata || !user) return;

    setCreating(true);
    try {
      const artistSlug = slugify(metadata.artist);
      const titleSlug = slugify(metadata.title);

      const { data, error } = await supabase
        .from("pre_saves")
        .insert({
          user_id: user.id,
          title: metadata.title,
          artist: metadata.artist,
          slug: titleSlug,
          artist_slug: artistSlug,
          artwork_url: metadata.artworkUrl || null,
          release_date: metadata.releaseDate,
          spotify_uri: metadata.spotifyUri || null,
          spotify_album_id: metadata.spotifyAlbumId || null,
          spotify_artist_id: metadata.spotifyArtistId || null,
          isrc: metadata.isrc || null,
          upc: metadata.upc || null,
          album_title: metadata.album,
          is_released: false
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Pre-save link created! Streaming links will activate on release day.");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating pre-save:", error);
      if (error.code === "23505") {
        toast.error("A pre-save for this release already exists");
      } else {
        toast.error("Failed to create pre-save link");
      }
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isReleaseUpcoming = metadata?.releaseDate && new Date(metadata.releaseDate) > new Date();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold mb-2">
            Create <span className="gradient-text">Pre-Save Link</span>
          </h1>
          <p className="text-muted-foreground">
            Build hype before your release drops. Enter your distributor-provided metadata.
          </p>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2 mb-6"
        >
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => { setMode("manual"); setMetadata(null); }}
            className="flex-1"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Manual Entry (Recommended)
          </Button>
          <Button
            variant={mode === "search" ? "default" : "outline"}
            onClick={() => { setMode("search"); setMetadata(null); }}
            className="flex-1"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Released Track
          </Button>
        </motion.div>

        {/* Manual Entry Mode */}
        {mode === "manual" && !metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Edit3 className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold">Distributor Metadata</h2>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary mb-1">For Unreleased Music</p>
                <p className="text-muted-foreground">
                  Enter the metadata from your distributor (ONErpm, DistroKid, etc.). 
                  Streaming links will automatically activate once the release goes live.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Track/Album Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter release title"
                  value={manualData.title}
                  onChange={(e) => handleManualChange("title", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="artist">Artist Name *</Label>
                <Input
                  id="artist"
                  placeholder="Enter artist name"
                  value={manualData.artist}
                  onChange={(e) => handleManualChange("artist", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="upc">UPC Code *</Label>
                <Input
                  id="upc"
                  placeholder="12-14 digit UPC from distributor"
                  value={manualData.upc}
                  onChange={(e) => handleManualChange("upc", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="isrc">ISRC (Optional)</Label>
                <Input
                  id="isrc"
                  placeholder="e.g., USRC12345678"
                  value={manualData.isrc}
                  onChange={(e) => handleManualChange("isrc", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="releaseDate">Release Date *</Label>
                <Input
                  id="releaseDate"
                  type="date"
                  value={manualData.releaseDate}
                  onChange={(e) => handleManualChange("releaseDate", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              {/* Artwork Upload */}
              <div className="md:col-span-2">
                <Label>Cover Artwork</Label>
                <div className="mt-1 flex gap-4 items-start">
                  {/* Upload area */}
                  <div 
                    className={`relative flex-1 border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer hover:border-primary/50 ${
                      artworkPreview ? 'border-primary' : 'border-muted-foreground/25'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleArtworkSelect}
                      className="hidden"
                    />
                    
                    {artworkPreview ? (
                      <div className="flex items-center gap-4">
                        <img 
                          src={artworkPreview} 
                          alt="Artwork preview" 
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{artworkFile?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {artworkFile && (artworkFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearArtwork();
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload artwork
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Or URL input */}
                {!artworkFile && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or paste URL</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <Input
                      placeholder="https://..."
                      value={manualData.artworkUrl}
                      onChange={(e) => handleManualChange("artworkUrl", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleManualSubmit}
              disabled={uploading}
              className="mt-6 w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Continue with Release Details
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Search Mode */}
        {mode === "search" && !metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold">Search Released Track</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Only works for tracks already live on Spotify. For unreleased music, use Manual Entry.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="input">Spotify URL, UPC, or ISRC</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      id="input"
                      placeholder="Paste Spotify album/track URL, UPC, or ISRC..."
                      value={inputValue}
                      onChange={handleInputChange}
                      className="pr-24"
                    />
                    {inputType && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {inputType}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleFetch}
                    disabled={loading || !inputValue.trim()}
                    className="min-w-[100px]"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Fetch
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Metadata Preview */}
        {metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Disc3 className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold">Release Preview</h2>
              {isReleaseUpcoming && (
                <span className="ml-auto text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                  Upcoming Release
                </span>
              )}
            </div>

            <div className="flex gap-6">
              {/* Artwork */}
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl rounded-xl" />
                {metadata.artworkUrl ? (
                  <img
                    src={metadata.artworkUrl}
                    alt={metadata.title}
                    className="relative w-40 h-40 rounded-xl object-cover shadow-xl"
                  />
                ) : (
                  <div className="relative w-40 h-40 rounded-xl bg-secondary flex items-center justify-center shadow-xl">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-display font-semibold text-lg">{metadata.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Artist</p>
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    {metadata.artist}
                  </p>
                </div>
                {metadata.releaseDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Release Date</p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {metadata.releaseDate}
                    </p>
                  </div>
                )}
                {metadata.upc && (
                  <div>
                    <p className="text-sm text-muted-foreground">UPC</p>
                    <p className="font-mono text-sm">{metadata.upc}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Message */}
            {isReleaseUpcoming && (
              <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <p className="text-sm text-accent font-medium">
                  ✨ Pre-save available, streaming links activate on release day.
                </p>
              </div>
            )}

            {/* Pre-save Link Preview */}
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Smart Link Preview</p>
              <code className="text-sm text-primary">
                https://md.malpinohdistro.com.ng/presave/{slugify(metadata.artist)}/{slugify(metadata.title)}
              </code>
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Pre-save to Library
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Auto-resolve on Release
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Multi-Platform Support
              </div>
            </div>

            {/* Edit / Clear */}
            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setMetadata(null)}
                className="flex-1"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            </div>
          </motion.div>
        )}

        {/* Create Button */}
        {metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <Button
              onClick={handleCreate}
              disabled={creating}
              size="lg"
              variant="hero"
            >
              {creating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-5 h-5 mr-2" />
              )}
              Create Smart Link
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default CreatePreSave;
