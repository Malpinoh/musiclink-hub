import { motion } from "framer-motion";

interface PlatformButtonProps {
  name: string;
  icon: React.ReactNode;
  color: string;
  url: string;
}

const PlatformButton = ({ name, icon, color, url }: PlatformButtonProps) => {
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="platform-btn bg-secondary hover:bg-secondary/80 w-full"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{ 
        borderLeft: `4px solid ${color}`,
      }}
    >
      <span className="w-8 h-8 flex items-center justify-center" style={{ color }}>
        {icon}
      </span>
      <span className="font-medium">Listen on {name}</span>
    </motion.a>
  );
};

export default PlatformButton;
