// GitHub Release Parser (using RSS feeds)
import { marked } from 'marked';

export async function fetchGitHubReleases(owner, repo) {
  try {
    const url = `https://github.com/${owner}/${repo}/releases.atom`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GameHub-News-Aggregator/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch GitHub releases for ${owner}/${repo}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    return parseGitHubRSSFeed(xmlText, owner, repo);
  } catch (error) {
    console.error(`Error fetching GitHub releases for ${owner}/${repo}:`, error);
    return [];
  }
}

function parseGitHubRSSFeed(xmlText, owner, repo) {
  const items = [];

  // Match all <entry> blocks (Atom format)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryContent = match[1];

    // Extract fields
    const title = extractTag(entryContent, 'title');
    const link = extractTag(entryContent, 'link', 'href');
    const updated = extractTag(entryContent, 'updated');
    const content = extractTag(entryContent, 'content');

    // Skip if this is a tag (not a release)
    if (!link.includes('/releases/tag/')) continue;

    const release = parseGitHubRelease(title, link, content, updated, owner, repo);
    items.push(release);
  }

  return items.slice(0, 1); // Limit to 1 most recent release per repo
}

function extractTag(content, tagName, attribute = null) {
  if (attribute) {
    const regex = new RegExp(`<${tagName}[^>]*${attribute}=["']([^"']+)["']`, 'i');
    const match = content.match(regex);
    return match ? match[1] : '';
  }

  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}

function parseGitHubRelease(title, link, content, updated, owner, repo) {
  // Always use GitHub repository's Open Graph image for consistency
  const imageUrl = `https://opengraph.githubassets.com/1/${owner}/${repo}`;

  // Configure marked for better rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Clean HTML entities and CDATA from content
  let cleanContent = content
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // Convert markdown to HTML using marked
  let htmlContent = marked.parse(cleanContent || 'Release information available on GitHub.');

  // Extract tag name from title (usually format: "Release v1.2.3" or just "v1.2.3")
  const tagMatch = title.match(/v?[\d.]+/);
  const tagName = tagMatch ? tagMatch[0] : title;

  return {
    title: title,
    link: link,
    description: extractFirstParagraph(cleanContent),
    content: htmlContent,
    pubDate: updated,
    imageUrl: imageUrl,
    timestamp: new Date(updated).getTime(),
    tagName: tagName,
    isPrerelease: title.toLowerCase().includes('pre') || title.toLowerCase().includes('beta') || title.toLowerCase().includes('alpha')
  };
}

function extractFirstParagraph(markdown) {
  if (!markdown) return '';

  // Remove markdown headers
  let text = markdown.replace(/^#+\s+/gm, '');

  // Get first non-empty paragraph
  const paragraphs = text.split('\n\n');
  for (const para of paragraphs) {
    const cleaned = para.trim();
    if (cleaned && !cleaned.startsWith('!') && !cleaned.startsWith('[')) {
      return cleaned.substring(0, 200);
    }
  }

  return text.substring(0, 200);
}
