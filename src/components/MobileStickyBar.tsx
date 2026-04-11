import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Music2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MobileStickyBar = () => {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setVisible(currentY < lastScrollY.current || currentY < 50);
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex gap-2 p-3">
            <Button variant="hero" asChild className="flex-1 h-12">
              <Link to="/create">
                <Plus className="w-4 h-4 mr-2" />
                Fanlink
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1 h-12 border-primary/30 text-primary hover:bg-primary/10">
              <Link to="/presave/create">
                <Music2 className="w-4 h-4 mr-2" />
                Pre-save
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileStickyBar;
