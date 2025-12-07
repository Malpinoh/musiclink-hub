import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Link2, 
  BarChart3, 
  ExternalLink, 
  Copy, 
  Trash2,
  MoreVertical,
  Music2
} from "lucide-react";
import demoArtwork from "@/assets/demo-artwork.jpg";

// Mock data for demonstration
const mockFanlinks = [
  {
    id: "1",
    title: "Afro Love",
    artist: "Demo Artist",
    artwork: demoArtwork,
    url: "/demo-artist/afro-love",
    clicks: 1234,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    title: "Summer Vibes",
    artist: "Demo Artist",
    artwork: demoArtwork,
    url: "/demo-artist/summer-vibes",
    clicks: 567,
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    title: "Midnight Flow",
    artist: "Demo Artist",
    artwork: demoArtwork,
    url: "/demo-artist/midnight-flow",
    clicks: 890,
    createdAt: "2024-01-05",
  },
];

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLinks = mockFanlinks.filter(
    (link) =>
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClicks = mockFanlinks.reduce((sum, link) => sum + link.clicks, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Dashboard Header */}
          <motion.div
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-muted-foreground">Manage your fanlinks and view analytics</p>
            </div>
            <Button variant="hero" size="lg" asChild>
              <Link to="/create">
                <Plus className="w-5 h-5" />
                Create Fanlink
              </Link>
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fanlinks</p>
                  <p className="font-display text-2xl font-bold">{mockFanlinks.length}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="font-display text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-spotify/20 flex items-center justify-center">
                  <Music2 className="w-6 h-6 text-spotify" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="font-display text-2xl font-bold">+24%</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            className="flex flex-col md:flex-row gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search fanlinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>
          </motion.div>

          {/* Fanlinks List */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {filteredLinks.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">No fanlinks found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? "Try a different search term" : "Create your first fanlink to get started"}
                </p>
                {!searchQuery && (
                  <Button variant="hero" asChild>
                    <Link to="/create">
                      <Plus className="w-5 h-5" />
                      Create Fanlink
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              filteredLinks.map((link, index) => (
                <motion.div
                  key={link.id}
                  className="glass-card p-4 hover:border-primary/30 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={link.artwork}
                      alt={link.title}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{link.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{link.artist}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        md.malpinohdistro.com.ng{link.url}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-display font-semibold">{link.clicks.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">clicks</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={link.url}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
