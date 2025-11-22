// RSS Feed Parser
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

export async function fetchRSSFeed(feedUrl) {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'GameHub-News-Aggregator/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch RSS feed ${feedUrl}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    return parseRSSXML(xmlText);
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    return [];
  }
}

async function parseRSSXML(xmlText) {
  const items = [];

  // Match all <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    // Extract fields
    const title = extractTag(itemContent, 'title');
    const link = extractTag(itemContent, 'link');
    const description = extractTag(itemContent, 'description');
    const pubDate = extractTag(itemContent, 'pubDate');
    let content = extractTag(itemContent, 'content:encoded') || description;

    // Try multiple methods to extract image
    let imageUrl = extractImageFromContent(content);
    if (!imageUrl) {
      imageUrl = extractEnclosureUrl(itemContent);
    }
    if (!imageUrl) {
      imageUrl = extractMediaContent(itemContent);
    }
    if (!imageUrl) {
      imageUrl = extractMediaThumbnail(itemContent);
    }

    const cleanLink = cleanText(link);

    items.push({
      title: cleanText(title),
      link: cleanLink,
      description: cleanText(description),
      content: cleanText(content),
      pubDate: pubDate,
      imageUrl: imageUrl,
      timestamp: parseDateToTimestamp(pubDate)
    });
  }

  // Limit to 10 most recent items
  return items.slice(0, 10);
}

async function fetchArticleContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Parse HTML with linkedom
    const { document } = parseHTML(html);

    // Use Readability to extract article content
    const reader = new Readability(document);
    const article = reader.parse();

    if (article && article.content) {
      return article.content;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching article from ${url}:`, error);
    return null;
  }
}

function extractTag(content, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}

function extractImageFromContent(content) {
  // Try to extract first image from HTML content
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const match = content.match(imgRegex);
  return match ? match[1] : null;
}

function extractEnclosureUrl(content) {
  const enclosureRegex = /<enclosure[^>]+url=["']([^"']+)["']/i;
  const match = content.match(enclosureRegex);
  return match ? match[1] : null;
}

function extractMediaContent(content) {
  // Extract media:content url attribute
  const mediaRegex = /<media:content[^>]+url=["']([^"']+)["']/i;
  const match = content.match(mediaRegex);
  return match ? match[1] : null;
}

function extractMediaThumbnail(content) {
  // Extract media:thumbnail url attribute
  const thumbRegex = /<media:thumbnail[^>]+url=["']([^"']+)["']/i;
  const match = content.match(thumbRegex);
  return match ? match[1] : null;
}

function cleanText(text) {
  if (!text) return '';

  // Decode HTML entities
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  return text.trim();
}

function parseDateToTimestamp(dateString) {
  if (!dateString) return Date.now();

  try {
    const date = new Date(dateString);
    return date.getTime();
  } catch (error) {
    return Date.now();
  }
}
