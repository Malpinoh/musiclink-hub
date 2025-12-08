import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, AlertCircle, Sparkles } from "lucide-react";

interface AccuracyScoreProps {
  score: number;
  breakdown: {
    isrc_match: boolean;
    upc_match: boolean;
    artist_similarity: number;
    title_similarity: number;
    album_match: boolean;
  };
}

const AccuracyScore = ({ score, breakdown }: AccuracyScoreProps) => {
  const getScoreColor = () => {
    if (score >= 90) return "hsl(var(--primary))";
    if (score >= 70) return "hsl(141 73% 42%)"; // Green
    if (score >= 40) return "hsl(45 100% 50%)"; // Yellow/Orange
    return "hsl(0 84% 60%)"; // Red
  };

  const getScoreLabel = () => {
    if (score >= 90) return "Verified Match";
    if (score >= 70) return "Strong Match";
    if (score >= 40) return "Partial Match";
    return "Weak Match";
  };

  const getScoreIcon = () => {
    if (score >= 90) return <CheckCircle className="w-5 h-5" />;
    if (score >= 70) return <Sparkles className="w-5 h-5" />;
    if (score >= 40) return <AlertTriangle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const scoreColor = getScoreColor();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold">Link Accuracy Score</h3>
        <div 
          className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
        >
          {getScoreIcon()}
          {getScoreLabel()}
        </div>
      </div>

      {/* Score Meter */}
      <div className="relative h-4 bg-secondary rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: scoreColor }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-foreground drop-shadow-lg">{score}%</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div className={`p-2 rounded-lg text-center ${breakdown.isrc_match ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
          <div className="font-medium">ISRC</div>
          <div className="text-xs">{breakdown.isrc_match ? "✓ Match" : "—"}</div>
        </div>
        <div className={`p-2 rounded-lg text-center ${breakdown.upc_match ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
          <div className="font-medium">UPC</div>
          <div className="text-xs">{breakdown.upc_match ? "✓ Match" : "—"}</div>
        </div>
        <div className={`p-2 rounded-lg text-center ${breakdown.artist_similarity >= 70 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
          <div className="font-medium">Artist</div>
          <div className="text-xs">{breakdown.artist_similarity}%</div>
        </div>
        <div className={`p-2 rounded-lg text-center ${breakdown.title_similarity >= 70 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
          <div className="font-medium">Title</div>
          <div className="text-xs">{breakdown.title_similarity}%</div>
        </div>
        <div className={`p-2 rounded-lg text-center ${breakdown.album_match ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
          <div className="font-medium">Album</div>
          <div className="text-xs">{breakdown.album_match ? "✓ Found" : "—"}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default AccuracyScore;
