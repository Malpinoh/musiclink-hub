import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Link2, 
  BarChart3, 
  Zap, 
  Globe, 
  QrCode, 
  Sparkles,
  Music2,
  Check
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import demoArtwork from "@/assets/demo-artwork.jpg";
import { 
  SpotifyIcon, 
  AppleMusicIcon, 
  YouTubeIcon, 
  AudiomackIcon, 
  BoomplayIcon 
} from "@/components/icons/PlatformIcons";

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "MDistro Link - One Link. All Platforms. Infinite Reach.",
  "description": "Create stunning fanlinks that connect your audience to your music on every streaming platform.",
  "url": "https://md.malpinohdistro.com.ng",
  "mainEntity": {
    "@type": "SoftwareApplication",
    "name": "MDistro Link",
    "applicationCategory": "MusicApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }
};

const Index = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Smart Detection",
      description: "Paste any DSP link, UPC, or ISRC and we automatically fetch all metadata and generate links."
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "All Platforms",
      description: "Spotify, Apple Music, YouTube, Audiomack, Boomplay, Deezer, Tidal, and more in one link."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Real-time Analytics",
      description: "Track clicks, devices, locations, and platform preferences for every fanlink."
    },
    {
      icon: <QrCode className="w-6 h-6" />,
      title: "QR Codes",
      description: "Generate shareable QR codes for your fanlinks. Perfect for flyers and social media."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Beautiful Pages",
      description: "Stunning, mobile-first landing pages that showcase your music professionally."
    },
    {
      icon: <Link2 className="w-6 h-6" />,
      title: "Custom URLs",
      description: "Clean, branded URLs like md.malpinohdistro.com.ng/artist/song"
    }
  ];

  const platforms = [
    { name: "Spotify", icon: <SpotifyIcon />, color: "#1DB954" },
    { name: "Apple Music", icon: <AppleMusicIcon />, color: "#FA243C" },
    { name: "YouTube", icon: <YouTubeIcon />, color: "#FF0000" },
    { name: "Audiomack", icon: <AudiomackIcon />, color: "#FFA500" },
    { name: "Boomplay", icon: <BoomplayIcon />, color: "#FFCC00" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="MDistro Link - One Link. All Platforms. Infinite Reach."
        description="Create stunning fanlinks that connect your audience to your music on Spotify, Apple Music, YouTube, Audiomack, Boomplay, and more. Auto-fetch metadata, track analytics, and grow your fanbase."
        canonicalPath=""
        keywords={["fanlink", "smart link", "music link", "spotify", "apple music", "audiomack", "boomplay", "music promotion"]}
        jsonLd={homeJsonLd}
      />
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
          <div className="absolute inset-0 bg-hero-glow" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 mb-6"
            >
              <Music2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">The Future of Music Links</span>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            >
              One Link.{" "}
              <span className="gradient-text">All Platforms.</span>
              <br />
              Infinite Reach.
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Create stunning fanlinks that connect your audience to your music on every streaming platform. 
              Auto-fetch metadata, track analytics, and grow your fanbase.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Button variant="hero" size="xl" asChild>
                <Link to="/dashboard">
                  Create Your Fanlink
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link to="/demo">See Demo</Link>
              </Button>
            </motion.div>

            {/* Platform Icons */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap justify-center gap-6"
            >
              {platforms.map((platform) => (
                <div 
                  key={platform.name}
                  className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  style={{ color: platform.color }}
                >
                  {platform.icon}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Promote Your Music</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed for artists, labels, and distributors.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="glass-card p-6 hover:border-primary/30 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Preview Section */}
      <section className="py-24 relative bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Beautiful Fanlink Pages That{" "}
                <span className="gradient-text">Convert</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Your music deserves a stunning landing page. Each fanlink is optimized for mobile, 
                loads instantly, and showcases your artwork prominently.
              </p>
              
              <ul className="space-y-4 mb-8">
                {[
                  "Automatic artwork and metadata fetching",
                  "Mobile-first responsive design",
                  "SEO optimized with Open Graph tags",
                  "Custom branding options",
                  "QR code generation included"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button variant="hero" size="lg" asChild>
                <Link to="/demo">
                  View Demo Link
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              {/* Phone Mockup */}
              <div className="relative mx-auto w-72 md:w-80">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl rounded-full" />
                <div className="relative bg-card rounded-[2.5rem] p-3 border border-border shadow-2xl">
                  <div className="bg-background rounded-[2rem] overflow-hidden">
                    {/* Phone Screen Content */}
                    <div className="p-6 text-center">
                      <img 
                        src={demoArtwork} 
                        alt="Demo Artwork" 
                        className="w-48 h-48 mx-auto rounded-2xl shadow-xl mb-6"
                      />
                      <h3 className="font-display text-xl font-bold mb-1">Demo Artist</h3>
                      <p className="text-muted-foreground mb-6">Amazing Track</p>
                      
                      <div className="space-y-3">
                        {platforms.slice(0, 4).map((platform) => (
                          <div 
                            key={platform.name}
                            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                            style={{ borderLeft: `3px solid ${platform.color}` }}
                          >
                            <span style={{ color: platform.color }}>{platform.icon}</span>
                            <span className="text-sm font-medium">{platform.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div 
            className="glass-card p-8 md:p-12 text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to Level Up Your Music Promotion?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of artists using MDistro Link to connect fans with their music.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1"
              />
              <Button variant="hero" size="lg">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
