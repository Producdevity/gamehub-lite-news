// Transform news items to GameHub format

import { DEFAULT_COVER_IMAGE } from './config.js';

// Generate stable hash-based ID from string
function generateStableId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) + 1000; // Ensure positive and start from 1000
}

export function transformToGameHubList(allNewsItems, page = 1, pageSize = 4) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = allNewsItems.slice(startIndex, endIndex);

  return {
    code: 200,
    msg: 'Success',
    time: '',
    data: {
      title: 'Gaming / Emulation News',
      aspect_ratio: '0.56',
      fixed_card_size: 2,
      is_play_video: 2,
      total: allNewsItems.length,
      page: page,
      page_size: pageSize,
      is_vertical: 1,
      is_text_outside: 1,
      card_list: paginatedItems.map(item => ({
        id: item.id,
        sys_language_id: 1,
        platform: 1,
        card_type: 2,
        jump_type: 7,  // 7 = detail view (for all items)
        card_param: String(item.id),  // ID for all items
        title: truncateText(item.title, 80),
        subtitle: item.subtitle,
        content_img: item.imageUrl || DEFAULT_COVER_IMAGE,
        release_text: '',
        game_price: '',
        discount_price: '',
        discount: '',
        is_pay: 2,
        end_time: '',
        is_display_title: 1,
        card_tag: null,
        game_tag: null,
        game_video_url: '',
        game_cover_image: '',
        game_back_image: '',
        game_startup_params: null,
        is_banner_data: 2,
        is_display_price: 2,
        is_display_start: 1,
        source: 'self',
        btn_text: '',
        is_display_btn: 2,
        game_channel_params: null,
        ad: 0
      }))
    }
  };
}

export function transformToGameHubDetail(newsItem) {
  if (!newsItem) {
    return {
      code: 404,
      msg: 'News not found',
      time: '',
      data: null
    };
  }

  return {
    code: 200,
    msg: 'Success',
    time: '',
    data: {
      cover_image: newsItem.imageUrl || DEFAULT_COVER_IMAGE,
      title: newsItem.title,
      content: formatContentHTML(newsItem),
      time: formatDate(newsItem.timestamp)
    }
  };
}

export function aggregateAllNews(rssSources, githubSources, youtubeSources, rssItems, githubItems, youtubeItems) {
  const allNews = [];

  // Process RSS items (limit to 2 per source)
  rssSources.forEach((source, sourceIndex) => {
    const items = rssItems[sourceIndex] || [];
    const limitedItems = items.slice(0, 2); // Only take first 2 items per source
    limitedItems.forEach((item, itemIndex) => {
      allNews.push({
        id: generateStableId(item.link), // Use link hash for stable ID
        title: item.title,
        subtitle: source.subtitle,
        description: item.description,
        content: item.content,
        link: item.link,
        imageUrl: item.imageUrl || DEFAULT_COVER_IMAGE,
        timestamp: item.timestamp,
        source: 'rss',
        sourceId: source.id
      });
    });
  });

  // Process GitHub items (limit to 1 per source)
  githubSources.forEach((source, sourceIndex) => {
    const items = githubItems[sourceIndex] || [];
    const limitedItems = items.slice(0, 1); // Only take first item per source
    limitedItems.forEach((item, itemIndex) => {
      allNews.push({
        id: generateStableId(item.link), // Use link hash for stable ID
        title: item.title,
        subtitle: source.subtitle,
        description: item.description,
        content: item.content,
        link: item.link,
        imageUrl: item.imageUrl,
        timestamp: item.timestamp,
        source: 'github',
        sourceId: source.id,
        tagName: item.tagName
      });
    });
  });

  // Process YouTube items (limit to 3 per channel)
  youtubeSources.forEach((source, sourceIndex) => {
    const items = youtubeItems[sourceIndex] || [];
    const limitedItems = items.slice(0, 3); // Only take first 3 videos per channel
    limitedItems.forEach((item, itemIndex) => {
      allNews.push({
        id: generateStableId(item.link), // Use link hash for stable ID
        title: item.title,
        subtitle: source.subtitle,
        description: item.description,
        content: item.content,
        link: item.link,
        imageUrl: item.imageUrl,
        timestamp: item.timestamp,
        source: 'youtube',
        sourceId: source.id,
        videoId: item.videoId,
        isYouTube: true
      });
    });
  });

  // Sort by timestamp (newest first)
  allNews.sort((a, b) => b.timestamp - a.timestamp);

  return allNews;
}

function formatContentHTML(newsItem) {
  let bodyContent = '';

  // For YouTube videos, skip the header image and show video directly
  // For other content, add cover image at the very top if available
  if (!newsItem.isYouTube && newsItem.imageUrl) {
    bodyContent += `<img class="header-image" src="${newsItem.imageUrl}" alt="${escapeHtml(newsItem.title)}" style="width: 100%; margin: 0 0 20px 0; display: block; border-radius: 0;">`;
  }

  // Add content wrapper div to scope image hiding
  bodyContent += '<div class="content-body">';

  // Add content
  if (newsItem.content) {
    // If content is already HTML (from RSS/GitHub/YouTube), use it directly
    if (newsItem.content.includes('<p') || newsItem.content.includes('<h') || newsItem.content.includes('<article') || newsItem.content.includes('<iframe')) {
      bodyContent += newsItem.content;
    } else {
      // Plain text content only - add basic formatting
      const paragraphs = newsItem.content.split('\n\n');
      paragraphs.forEach(para => {
        if (para.trim()) {
          bodyContent += `<p style="color: rgb(255, 255, 255); line-height: 1.6;">${escapeHtml(para.trim())}</p>`;
        }
      });
    }
  } else {
    // Fallback if no content
    bodyContent += `<p style="color: rgb(255, 255, 255); line-height: 1.6;">${escapeHtml(newsItem.description || 'No content available')}</p>`;
  }

  bodyContent += '</div>';

  // Wrap in full HTML document with dark background and comprehensive styling
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Base styles */
    * {
      box-sizing: border-box;
    }

    html, body {
      background-color: #111827;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 0;
      margin: 0;
      line-height: 1.7;
      font-size: 16px;
      min-height: 100%;
      height: auto;
      overflow-x: hidden;
    }

    /* Images - hide all images in content body, only show header */
    .header-image {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 0 20px 0;
      border-radius: 0;
    }

    /* Hide all images inside content body */
    .content-body img {
      display: none !important;
    }

    /* Hide figures with images */
    .content-body figure {
      display: none !important;
    }

    /* Links */
    a {
      color: #64a4ff;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    a:hover {
      color: #8cb4ff;
      text-decoration: underline;
    }

    /* Paragraphs */
    p {
      margin: 0 0 12px 0;
      padding: 0 20px;
      color: #e0e0e0;
      line-height: 1.6;
      text-align: left;
    }

    /* Article container */
    article {
      padding: 20px;
    }

    article p {
      padding: 0;
      margin: 0 0 12px 0;
    }

    /* Reduce spacing for paragraphs with images */
    p:has(img) {
      margin: 8px 0;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      color: #ffffff;
      font-weight: 600;
      margin: 24px 0 12px 0;
      padding: 0 20px;
      line-height: 1.3;
    }

    article h1, article h2, article h3,
    article h4, article h5, article h6 {
      padding: 0;
    }

    h1 { font-size: 28px; margin-top: 32px; }
    h2 { font-size: 24px; margin-top: 28px; }
    h3 { font-size: 20px; margin-top: 24px; }
    h4 { font-size: 18px; }
    h5 { font-size: 16px; }
    h6 { font-size: 14px; }

    /* Lists */
    ul, ol {
      margin: 8px 0;
      padding: 0 20px 0 44px;
      color: #e0e0e0;
    }

    article ul, article ol {
      padding-left: 24px;
      margin: 8px 0;
    }

    li {
      margin: 4px 0;
      line-height: 1.6;
    }

    li p {
      padding: 0;
      margin: 4px 0;
    }

    ul li {
      list-style-type: disc;
    }

    ul ul li {
      list-style-type: circle;
    }

    ol li {
      list-style-type: decimal;
    }

    /* Blockquotes */
    blockquote {
      margin: 20px 0;
      padding: 16px 20px;
      background-color: transparent;
      border-left: 4px solid #64a4ff;
      color: #b0b0b0;
      font-style: italic;
    }

    article blockquote {
      margin: 20px 0;
    }

    /* Code blocks */
    code {
      background-color: transparent;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "SF Mono", Monaco, Consolas, monospace;
      font-size: 14px;
      color: #ff6b6b;
    }

    pre {
      background-color: transparent;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 20px;
    }

    article pre {
      margin: 16px 0;
    }

    pre code {
      background: none;
      padding: 0;
      color: #e0e0e0;
    }

    /* Tables */
    table {
      width: calc(100% - 40px);
      margin: 20px 20px;
      border-collapse: collapse;
      background-color: transparent;
    }

    article table {
      width: 100%;
      margin: 20px 0;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #333;
    }

    th {
      background-color: transparent;
      font-weight: 600;
      color: #ffffff;
    }

    /* Figures and images */
    figure {
      margin: 24px 0;
      padding: 0;
    }

    figure img {
      margin-bottom: 8px;
    }

    figcaption {
      color: #999;
      font-size: 14px;
      padding: 8px 20px;
      font-style: italic;
      line-height: 1.5;
    }

    article figcaption {
      padding: 8px 0;
    }

    /* Horizontal rules */
    hr {
      border: none;
      border-top: 1px solid #333;
      margin: 24px 20px;
    }

    article hr {
      margin: 24px 0;
    }

    /* Strong and emphasis */
    strong, b {
      font-weight: 600;
      color: #ffffff;
    }

    em, i {
      font-style: italic;
      color: #d0d0d0;
    }

    /* YouTube Video Embeds */
    .video-container {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      height: 0;
      overflow: hidden;
      margin: 20px 0;
    }

    .video-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Special divs and sections */
    .van-image-figure, .image-full-width-wrapper {
      margin: 20px 0;
    }

    .caption-text, .credit {
      display: block;
      color: #999;
      font-size: 13px;
      margin-top: 4px;
    }

    /* Product/info boxes */
    .product, .info-box {
      background-color: transparent;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px;
    }

    article .product, article .info-box {
      margin: 20px 0;
    }

    /* Ensure nested content inherits proper styling */
    article * {
      max-width: 100%;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

  return html;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return null;
  }
}
