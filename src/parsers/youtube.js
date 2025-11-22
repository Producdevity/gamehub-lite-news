// YouTube RSS Feed Parser
// Fetches videos from YouTube channel RSS feeds

export async function fetchYouTubeFeed(channelId) {
  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GameHub-News-Aggregator/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch YouTube feed for ${channelId}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    return parseYouTubeRSS(xmlText);
  } catch (error) {
    console.error(`Error fetching YouTube feed for ${channelId}:`, error);
    return [];
  }
}

function parseYouTubeRSS(xmlText) {
  const items = [];

  // Match all <entry> blocks (Atom format used by YouTube)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryContent = match[1];

    // Extract fields
    const videoId = extractTag(entryContent, 'yt:videoId');
    const title = extractTag(entryContent, 'title');
    const published = extractTag(entryContent, 'published');
    const channelName = extractTag(entryContent, 'name'); // Author name
    const description = extractTag(entryContent, 'media:description');

    // YouTube thumbnail URL
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    // Video URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Format the description with proper line breaks and clickable links
    const formattedDescription = formatYouTubeDescription(description || '');

    items.push({
      title: title,
      link: videoUrl,
      description: description || `Watch ${title} on YouTube`,
      content: `<div style="text-align: center; margin: 20px 0;">
        <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" style="text-decoration: none; color: inherit;">
          <img src="${thumbnailUrl}" alt="${title}" style="width: 100%; max-width: 100%; height: auto; display: block; border-radius: 8px; margin-bottom: 16px;">
          <div style="display: inline-flex; align-items: center; background-color: #FF0000; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 20px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin-right: 8px;">
              <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
            Watch on YouTube
          </div>
        </a>
      </div>
      <div style="color: #e0e0e0; line-height: 1.8; padding: 0 20px; white-space: pre-wrap;">${formattedDescription}</div>`,
      pubDate: published,
      imageUrl: thumbnailUrl,
      timestamp: new Date(published).getTime(),
      channelName: channelName,
      videoId: videoId,
      isYouTube: true
    });
  }

  return items.slice(0, 3); // Limit to 3 most recent videos per channel
}

function formatYouTubeDescription(text) {
  if (!text) return '';

  // Escape HTML first to prevent XSS
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Convert URLs to clickable links
  // Match http(s):// URLs
  formatted = formatted.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?'")\]}])/gi,
    '<a href="$1" target="_blank" style="color: #64a4ff; text-decoration: none;">$1</a>'
  );

  // Match www. URLs (without protocol)
  formatted = formatted.replace(
    /(?<!https?:\/\/)(?<!@)(www\.[^\s<]+[^\s<.,;:!?'")\]}])/gi,
    '<a href="https://$1" target="_blank" style="color: #64a4ff; text-decoration: none;">$1</a>'
  );

  // Convert timestamps (e.g., "00:00" or "1:23:45") to styled text
  formatted = formatted.replace(
    /(\d{1,2}:\d{2}(?::\d{2})?)/g,
    '<span style="color: #64a4ff; font-weight: 500;">$1</span>'
  );

  return formatted;
}

function extractTag(content, tagName) {
  // Handle both self-closing and regular tags
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}
