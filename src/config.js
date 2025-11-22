// Configuration for news sources

export const NEWS_SOURCES = {
  rss: [
    {
      id: 'rps',
      url: 'https://www.rockpapershotgun.com/feed/news',
      title: 'Gaming News',
      subtitle: 'Rock Paper Shotgun',
    },
    {
      id: 'retrogamecorps',
      url: 'https://retrogamecorps.com/feed/',
      title: 'Retro Gaming & Emulation',
      subtitle: 'Retro Game Corps',
    },
    {
      id: 'pcgamer',
      url: 'https://www.pcgamer.com/rss/',
      title: 'PC Gaming News',
      subtitle: 'PC Gamer',
    },
    {
      id: 'polygon',
      url: 'https://www.polygon.com/rss/index.xml',
      title: 'Gaming & Entertainment',
      subtitle: 'Polygon',
    },
    {
      id: 'eurogamer',
      url: 'https://www.eurogamer.net/?format=rss',
      title: 'Gaming News & Reviews',
      subtitle: 'Eurogamer',
    },
  ],
  youtube: [
    // Add YouTube channels here - RSS format: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
    {
      id: 'etaprime',
      channelId: 'UC_0CVCfC_3iuHqmyClu59Uw', // ETA PRIME
      title: 'Gaming & Emulation',
      subtitle: 'ETA PRIME',
    },
    {
      id: 'ryanretro',
      channelId: 'UCh9GxjM-FNuSWv7xqn3UKVw', // Ryan Retro
      title: 'Retro Gaming',
      subtitle: 'Ryan Retro',
    },
    {
      id: 'mrsujano',
      channelId: 'UCu-NRUdNtfcjdGA5Abt3JUw',
      title: 'Emulation News',
      subtitle: 'Mr. Sujano',
    },
    {
      id: 'the412banner',
      channelId: 'UCxWZ2GteikwcJZhefRtxaXg',
      title: 'Handheld Gaming',
      subtitle: 'The412Banner',
    },
  ],
  github: [
    // Emulation
    {
      id: 'fex-emu',
      owner: 'FEX-Emu',
      repo: 'FEX',
      subtitle: 'FEX-Emu',
    },
    {
      id: 'emureadylite',
      owner: 'Producdevity',
      repo: 'EmuReadyLite',
      subtitle: 'EmuReady Lite',
    },

    // GPU Drivers
    {
      id: 'adreno-tools-drivers',
      owner: 'K11MCH1',
      repo: 'AdrenoToolsDrivers',
      subtitle: 'Adreno Tools Drivers',
    },
  ],
}

// Cache settings
export const CACHE_TTL = 3600 // 1 hour in seconds
export const MAX_NEWS_ITEMS = 50 // Increased to accommodate more sources
export const DEFAULT_COVER_IMAGE =
  'https://via.placeholder.com/800x450/1a1a1a/ffffff?text=GameHub+News'
