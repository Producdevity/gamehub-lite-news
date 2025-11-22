# GameHub Lite News Aggregator Worker

A Cloudflare Worker that aggregates gaming news from RSS feeds and GitHub releases, transforming them into GameHub's API format with custom HTML styling.

## Features

- 🎮 **RSS Feed Support**: Fetches and parses gaming news from RSS feeds
- 📦 **GitHub Releases**: Tracks 14 emulation/gaming projects
- 🎨 **Custom HTML Styling**: Mobile-optimized articles with GameHub theming
- 💾 **Smart Caching**: 1-hour cache with KV storage (auto-refresh)
- 📄 **Pagination**: Lazy loading support (4 items per page)
- 🖼️ **Image Control**: Hides inline images while keeping header images
- 🔄 **Auto-Refresh**: Cache expires and rebuilds automatically

## Current News Sources

### RSS Feeds (1)

- **Rock Paper Shotgun** - PC gaming news
  - URL: `https://www.rockpapershotgun.com/feed/news`

### GitHub Releases (14 Projects)

- **FEX-Emu/FEX** - x86/x86-64 emulator
- **ptitSeb/box64** - x86-64 Linux emulator for ARM64
- **ptitSeb/box86** - x86 Linux emulator for ARM
- **GloriousEggroll/wine-ge-custom** - Wine with gaming patches
- **doitsujin/dxvk** - DirectX to Vulkan translation
- **HansKristian-Work/vkd3d-proton** - Direct3D 12 to Vulkan
- **ValveSoftware/Proton** - Steam Play compatibility tool
- **bottlesdevs/Bottles** - Wine prefix manager
- **lutris/lutris** - Open gaming platform
- **Heroic-Games-Launcher/HeroicGamesLauncher** - Epic/GOG launcher
- **flathub/flathub** - Linux app distribution
- **Kron4ek/Wine-Builds** - Wine packages
- **fastfetch-cli/fastfetch** - System info tool
- **FeralInteractive/gamemode** - Game performance optimizer

## Setup

### 1. Install Dependencies

```bash
cd gamehub-lite-news
npm install
```

### 2. Create KV Namespace

```bash
npx wrangler kv:namespace create NEWS_CACHE
```

Copy the namespace ID and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "NEWS_CACHE"
id = "your_namespace_id_here"
```

### 3. Deploy

```bash
npm run deploy
```

## API Endpoints

### GET /api/news/list

Get paginated news list in GameHub format

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 30)

**Example:**

```bash
curl "https://gamehub-lite-news.emuready.workers.dev/api/news/list?page=1&page_size=4"
```

**Response:**

```json
{
  "code": 200,
  "msg": "",
  "time": "1760032301",
  "data": {
    "title": "Gaming News & Updates",
    "total": 28,
    "page": 1,
    "page_size": 4,
    "card_list": [
      {
        "id": 1,
        "cover_image": "https://...",
        "title": "New game release...",
        "time": "2025-10-09",
        "source": "rps"
      }
    ]
  }
}
```

### GET /api/news/detail/:id

Get full article with custom HTML styling

**Example:**

```bash
curl "https://gamehub-lite-news.emuready.workers.dev/api/news/detail/1"
```

**Response:**

```json
{
  "code": 200,
  "msg": "",
  "time": "1760032301",
  "data": {
    "cover_image": "https://...",
    "title": "Article Title",
    "content": "<html>...</html>",
    "time": "2025-10-09"
  }
}
```

### GET /api/news/refresh

Force cache refresh (fetches fresh data from all sources)

**Example:**

```bash
curl -X GET "https://gamehub-lite-news.emuready.workers.dev/api/news/refresh"
```

### GET /api/config

View current news sources configuration

## Article Styling

Articles are rendered with custom CSS for mobile reading:

```css
- White text on dark background (#FFFFFF)
- Clean typography (16px base, 1.6 line height)
- Header image at top (full width, auto height)
- Hidden inline images (only header visible)
- Responsive layout (20px padding)
- Links styled in light blue (#4A9EFF)
```

## Cache Management

**Storage**: Cloudflare KV
**TTL**: 1 hour (3600 seconds)
**Keys**:

- `news:list` - Main aggregated news list
- `news:detail:{id}` - Individual article HTML content

**Auto-Refresh**: Cache expires after 1 hour, next request triggers rebuild

## Configuration

Edit `src/config.js` to modify news sources:

### Add RSS Feed

```javascript
export const NEWS_SOURCES = {
  rss: [
    {
      id: 'unique-id',
      url: 'https://example.com/feed',
      title: 'News Source',
      subtitle: 'Gaming News',
    },
  ],
}
```

### Add GitHub Repo

```javascript
export const NEWS_SOURCES = {
  github: [
    {
      id: 'unique-id',
      owner: 'username',
      repo: 'repository',
      subtitle: 'Project Name',
    },
  ],
}
```

## Integration with GameHub API Worker

The main GameHub API worker forwards news requests:

```javascript
// Forward news list requests
if (url.pathname === '/card/getNewsList' && request.method === 'POST') {
  const body = await request.json()
  const page = body.page || 1
  const pageSize = body.page_size || 4

  const newsResponse = await fetch(
    `${NEWS_AGGREGATOR_URL}/api/news/list?page=${page}&page_size=${pageSize}`,
  )

  return new Response(await newsResponse.text(), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Forward news detail requests
if (url.pathname === '/card/getNewsGuideDetail' && request.method === 'POST') {
  const body = await request.json()
  const newsId = body.id

  const newsDetailResponse = await fetch(
    `${NEWS_AGGREGATOR_URL}/api/news/detail/${newsId}`,
  )

  return new Response(await newsDetailResponse.text(), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## Development

Run locally:

```bash
npm run dev
```

Visit: `http://localhost:8787/api/news/list`

View logs:

```bash
npm run tail
```

## Performance

- **Cold Start**: ~200ms
- **Cached Response**: <50ms
- **Cache Rebuild**: ~2-3 seconds (fetches all sources)
- **Memory**: <10MB
- **Cost**: Free tier (< 100k requests/day)

## Troubleshooting

### RSS Feed Blocked (403)

Some sites block Cloudflare Workers. Try:

- Use alternative RSS feeds
- Check if site has a `/feed/rss` or `/feed.xml` endpoint

### GitHub Rate Limits

- Unauthenticated: 60 requests/hour
- Solution: Using `.atom` feeds instead of API (no rate limits)

### Cache Not Refreshing

```bash
# Manual refresh
curl -X GET "https://your-worker.workers.dev/api/news/refresh"

# Check KV storage
npx wrangler kv:key list --binding=NEWS_CACHE
```

## Notes

- Articles automatically styled for mobile (GameHub WebView)
- Images are lazily loaded (header image visible, inline images hidden)
- GitHub releases use RSS feeds to avoid API rate limits
- All timestamps converted to Unix epoch for GameHub compatibility
- News is sorted by date (newest first)
