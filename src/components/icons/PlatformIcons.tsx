// Official platform icons for streaming services

interface IconProps {
  className?: string;
}

// Spotify - Official brand icon
export const SpotifyIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#1DB954" className={className}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// Apple Music - Official brand icon
export const AppleMusicIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className}>
    <defs>
      <linearGradient id="apple-music-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FA233B"/>
        <stop offset="100%" stopColor="#FB5C74"/>
      </linearGradient>
    </defs>
    <rect width="24" height="24" rx="5.5" fill="url(#apple-music-gradient)"/>
    <path fill="#fff" d="M17.5 6.2v8.4c0 .6-.2 1.1-.6 1.5-.4.4-.9.6-1.5.7-.4.1-.8.1-1.2 0-.4-.1-.8-.3-1-.6-.3-.3-.5-.6-.6-1-.1-.4-.1-.8 0-1.2.1-.4.3-.7.6-1 .3-.3.7-.5 1.1-.6l2-.4V8.5l-6 1.3v7.3c0 .6-.2 1.1-.6 1.5-.4.4-.9.6-1.5.7-.4.1-.8.1-1.2 0-.4-.1-.7-.3-1-.6-.3-.3-.5-.6-.6-1-.1-.4-.1-.8 0-1.2.1-.4.3-.7.6-1 .3-.3.7-.5 1.1-.6l2-.5V7.5c0-.3.1-.5.2-.7.1-.2.3-.3.6-.4l6-1.3c.2 0 .4 0 .5.1.1.1.2.2.3.3.1.1.1.3.1.4v.3z"/>
  </svg>
);

// YouTube Music - Official brand icon
export const YouTubeIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#FF0000" className={className}>
    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm4.95 16.05c-.225.15-.525.225-.825.225H7.875c-.3 0-.6-.075-.825-.225-.225-.15-.375-.375-.375-.675V8.625c0-.3.15-.525.375-.675.225-.15.525-.225.825-.225h8.25c.3 0 .6.075.825.225.225.15.375.375.375.675v6.75c0 .3-.15.525-.375.675z"/>
    <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
    <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// YouTube Music specific icon
export const YouTubeMusicIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#FF0000" className={className}>
    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228 18.228 15.432 18.228 12 15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
  </svg>
);

// Deezer - Official brand icon
export const DeezerIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#FEAA2D" d="M18.81 4.16v3.03H24V4.16h-5.19z"/>
    <path fill="#FE6B48" d="M6.27 8.38v3.027h5.189V8.38h-5.19z"/>
    <path fill="#FF0092" d="M12.54 8.38v3.027h5.19V8.38h-5.19z"/>
    <path fill="#9000FF" d="M18.81 8.38v3.027H24V8.38h-5.19z"/>
    <path fill="#3FB911" d="M0 12.594v3.027h5.19v-3.027H0z"/>
    <path fill="#00C7F2" d="M6.27 12.594v3.027h5.189v-3.027h-5.19z"/>
    <path fill="#FF00E5" d="M12.54 12.594v3.027h5.19v-3.027h-5.19z"/>
    <path fill="#7C1CFF" d="M18.81 12.594v3.027H24v-3.027h-5.19z"/>
    <path fill="#3DFF3D" d="M0 16.81v3.029h5.19v-3.03H0z"/>
    <path fill="#00E5FF" d="M6.27 16.81v3.029h5.189v-3.03h-5.19z"/>
    <path fill="#FF1ABE" d="M12.54 16.81v3.029h5.19v-3.03h-5.19z"/>
    <path fill="#D600FF" d="M18.81 16.81v3.029H24v-3.03h-5.19z"/>
  </svg>
);

// Audiomack - Official brand icon
export const AudiomackIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#FFA200" className={className}>
    <path d="M.373 12.975c-.203.204-.373.636-.373 1.035v4.525c0 .4.162.806.373 1.015.204.204.648.391 1.069.391h3.45c.396 0 .81-.163 1.002-.391.207-.204.39-.636.39-1.015V14.01c0-.399-.175-.831-.39-1.035-.196-.205-.605-.39-1.001-.39h-3.45c-.422 0-.868.197-1.07.39zm7.322-5.88c-.203.204-.374.636-.374 1.035v10.405c0 .4.162.806.374 1.015.203.204.647.39 1.068.39h3.451c.396 0 .81-.161 1.002-.39.207-.204.39-.636.39-1.015V8.13c0-.399-.175-.83-.39-1.035-.196-.204-.605-.39-1.002-.39H8.763c-.421 0-.868.198-1.068.39zm7.322-3.014c-.203.204-.373.636-.373 1.035v13.419c0 .4.162.806.373 1.015.204.204.648.39 1.069.39h3.45c.397 0 .811-.161 1.003-.39.206-.204.39-.636.39-1.015V5.116c0-.399-.176-.83-.39-1.035-.196-.204-.606-.39-1.002-.39h-3.451c-.421 0-.867.198-1.069.39z"/>
  </svg>
);

// Boomplay - Official brand icon
export const BoomplayIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="12" r="12" fill="#E72A3A"/>
    <path fill="#fff" d="M8 6.5v11l8-5.5-8-5.5z"/>
  </svg>
);

// Tidal - Official brand icon
export const TidalIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#000000" className={className}>
    <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996l4.004 4.004L8.008 16l4.004-4.004L16.016 16l4.004-4.004 4.004 4.004L28.028 12l-4.004-4.004-4.004 4.004-4.004-4.004-4.004-4.004z" transform="scale(0.857) translate(0, 2)"/>
  </svg>
);

// Amazon Music - Official brand icon
export const AmazonMusicIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className}>
    <defs>
      <linearGradient id="amazon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#25D1DA"/>
        <stop offset="100%" stopColor="#1C94F3"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="12" fill="url(#amazon-gradient)"/>
    <path fill="#fff" d="M8.7 9.3c0-.4.3-.6.6-.6h5.4c.3 0 .6.3.6.6v5.4c0 .3-.3.6-.6.6H9.3c-.3 0-.6-.3-.6-.6V9.3zm1.8 3.6l1.5-2.1 1.5 2.1v-2.7h-3v2.7z"/>
    <path fill="#fff" d="M15.9 16.5c-.3.3-.6.3-.9 0l-3-3-3 3c-.3.3-.6.3-.9 0-.3-.3-.3-.6 0-.9l3.5-3.5c.3-.3.6-.3.9 0l3.5 3.5c.2.3.2.6-.1.9z"/>
  </svg>
);

// SoundCloud - Official brand icon
export const SoundCloudIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#FF5500" className={className}>
    <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094.051 0 .089-.037.104-.094l.21-1.319-.21-1.334c-.022-.052-.053-.089-.09-.089l.007.008zm1.83-1.229c-.06 0-.12.037-.12.1l-.21 2.563.225 2.458c0 .06.045.105.12.105.074 0 .12-.045.12-.105l.24-2.458-.24-2.563c-.007-.06-.045-.1-.135-.1zm.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.135.149.135.075 0 .135-.06.15-.135l.225-2.544-.225-2.64c-.015-.075-.075-.135-.165-.135l-.001.001zm.96-.089c-.09 0-.15.06-.165.135l-.195 2.685.21 2.58c.015.09.075.15.165.15.09 0 .15-.06.165-.15l.24-2.58-.24-2.685c-.015-.075-.075-.135-.18-.135zm1.095-.18c-.105 0-.165.075-.18.165l-.21 2.79.225 2.61c.015.09.075.165.18.165.104 0 .164-.075.18-.165l.24-2.61-.24-2.79c-.015-.09-.075-.165-.18-.165l-.015-.001zm1.065-.21c-.105 0-.195.09-.195.195l-.225 2.79.24 2.565c0 .12.09.195.195.195.12 0 .195-.075.21-.195l.255-2.565-.27-2.79c-.015-.105-.09-.195-.21-.195zm1.17-.135c-.12 0-.21.09-.225.21l-.21 2.79.225 2.535c.015.12.105.21.225.21.12 0 .21-.09.225-.21l.254-2.535-.254-2.79c-.015-.12-.105-.21-.225-.21zm1.065.45c-.135 0-.24.105-.24.24l-.24 2.415.255 2.535c.015.135.105.24.24.24.135 0 .24-.105.255-.24l.27-2.535-.27-2.415c-.015-.135-.12-.24-.27-.24zm1.26-.45c-.135 0-.255.12-.255.255l-.24 2.565.255 2.535c0 .15.12.27.255.27.15 0 .255-.12.27-.27l.285-2.535-.285-2.565c-.015-.135-.12-.255-.285-.255zm1.29-.105c-.15 0-.27.12-.285.27l-.24 2.565.254 2.535c.015.15.135.27.285.27.15 0 .27-.12.285-.27l.27-2.535-.27-2.565c-.015-.15-.135-.27-.285-.27zm1.35-.165c-.165 0-.3.135-.3.3l-.24 2.565.255 2.535c0 .165.135.3.3.3.165 0 .3-.135.315-.3l.27-2.535-.27-2.565c-.015-.165-.15-.3-.33-.3zm1.35-.18c-.18 0-.315.135-.33.315l-.225 2.565.24 2.535c.015.18.15.315.33.315.18 0 .315-.135.33-.315l.27-2.535-.285-2.565c-.015-.18-.15-.315-.33-.315zm1.395-.165c-.18 0-.33.15-.345.33l-.225 2.565.24 2.535c.015.195.165.345.345.345.195 0 .345-.15.36-.345l.27-2.535-.285-2.565c-.015-.18-.165-.33-.36-.33zm2.145-.285c-.06 0-.135-.015-.195-.015-.555 0-1.08.105-1.56.315-.18.075-.285.24-.285.435l-.24 2.565.255 2.535c.015.21.18.375.39.375.21 0 .375-.165.405-.375l.285-2.535-.285-2.565c-.015-.21-.195-.375-.42-.375-.06.02-.12.025-.18.025h-.015c.48-.135.99-.21 1.515-.21.075 0 .15 0 .225.015.135 0 .255.03.375.06.135.03.27.06.39.105.15.045.285.09.42.15.135.06.255.12.375.195.12.075.24.15.345.24.12.09.225.18.315.285.105.105.195.21.285.33.09.12.165.24.24.375.075.135.135.27.18.42.06.15.09.3.12.465.03.165.045.33.045.51v5.19c0 .15-.045.285-.12.405-.075.12-.18.225-.3.3-.12.09-.255.15-.405.195-.15.045-.315.075-.48.075H15.99v-8.55c-.03-.555-.225-1.065-.555-1.5-.33-.435-.765-.765-1.275-.945z"/>
  </svg>
);

// Shazam - Official brand icon  
export const ShazamIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#0088FF" className={className}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.02 16.907c-.497.314-1.066.48-1.652.48-.962 0-1.87-.418-2.498-1.144l-3.263-3.76a2.177 2.177 0 01-.514-1.403c0-.53.183-1.037.514-1.403a1.91 1.91 0 011.403-.622c.53 0 1.037.218 1.403.622l1.852 2.134c.183.218.453.34.749.34.296 0 .566-.122.749-.34l1.852-2.134c.366-.404.873-.622 1.403-.622.53 0 1.037.218 1.403.622.33.366.514.873.514 1.403s-.183 1.037-.514 1.403l-3.401 3.924z"/>
    <path d="M8.98 7.093c.497-.314 1.066-.48 1.652-.48.962 0 1.87.418 2.498 1.144l3.263 3.76c.33.366.514.873.514 1.403s-.183 1.037-.514 1.403a1.91 1.91 0 01-1.403.622c-.53 0-1.037-.218-1.403-.622l-1.852-2.134a.983.983 0 00-.749-.34c-.296 0-.566.122-.749.34l-1.852 2.134c-.366.404-.873.622-1.403.622-.53 0-1.037-.218-1.403-.622a2.177 2.177 0 01-.514-1.403c0-.53.183-1.037.514-1.403l3.401-3.924z"/>
  </svg>
);

// Pandora - Official brand icon
export const PandoraIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#224099" className={className}>
    <path d="M6.545 0v24h3.273V0H6.545zM14.182 0c-3.623 0-6.546 2.918-6.546 6.545 0 3.623 2.923 6.546 6.546 6.546 1.8 0 3.273-.15 3.273-.15V9.818s-1.473.15-3.273.15c-1.8 0-3.273-1.473-3.273-3.273s1.473-3.273 3.273-3.273c1.8 0 3.273.15 3.273.15V0s-1.473-.15-3.273-.15V0z"/>
  </svg>
);

// Generic Music icon for fallback
export const MusicIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

// Platform icon mapping utility
export const getPlatformIcon = (platformName: string) => {
  const icons: Record<string, React.FC<IconProps>> = {
    spotify: SpotifyIcon,
    apple_music: AppleMusicIcon,
    applemusic: AppleMusicIcon,
    youtube: YouTubeIcon,
    youtube_music: YouTubeMusicIcon,
    youtubemusic: YouTubeMusicIcon,
    deezer: DeezerIcon,
    audiomack: AudiomackIcon,
    boomplay: BoomplayIcon,
    tidal: TidalIcon,
    amazon: AmazonMusicIcon,
    amazon_music: AmazonMusicIcon,
    amazonmusic: AmazonMusicIcon,
    soundcloud: SoundCloudIcon,
    shazam: ShazamIcon,
    pandora: PandoraIcon,
  };
  
  const normalizedName = platformName.toLowerCase().replace(/[\s-]/g, '_');
  return icons[normalizedName] || MusicIcon;
};

// Platform display names
export const getPlatformDisplayName = (platformName: string): string => {
  const names: Record<string, string> = {
    spotify: "Spotify",
    apple_music: "Apple Music",
    applemusic: "Apple Music",
    youtube: "YouTube",
    youtube_music: "YouTube Music",
    youtubemusic: "YouTube Music",
    deezer: "Deezer",
    audiomack: "Audiomack",
    boomplay: "Boomplay",
    tidal: "Tidal",
    amazon: "Amazon Music",
    amazon_music: "Amazon Music",
    amazonmusic: "Amazon Music",
    soundcloud: "SoundCloud",
    shazam: "Shazam",
    pandora: "Pandora",
  };
  
  const normalizedName = platformName.toLowerCase().replace(/[\s-]/g, '_');
  return names[normalizedName] || platformName;
};
