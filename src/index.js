// GameHub News Aggregator Worker
// Fetches news from RSS feeds and GitHub releases, transforms to GameHub format

import { NEWS_SOURCES, MAX_NEWS_ITEMS } from './config.js';
import { fetchRSSFeed } from './parsers/rss.js';
import { fetchGitHubReleases } from './parsers/github.js';
import { fetchYouTubeFeed } from './parsers/youtube.js';
import { aggregateAllNews, transformToGameHubList, transformToGameHubDetail } from './transformer.js';
import {
  getCachedNewsList,
  setCachedNewsList,
  getCachedNewsDetail,
  setCachedNewsDetail,
  invalidateCache
} from './cache.js';

export default {
  // Scheduled cron handler for automatic cache refresh
  async scheduled(event, env, ctx) {
    console.log('Cron triggered: refreshing news cache...');
    try {
      // Fetch fresh news
      const freshNews = await fetchAllNews();

      // Update cache
      await setCachedNewsList(env, freshNews);

      console.log(`Cron success: cached ${freshNews.length} news items`);
    } catch (error) {
      console.error('Cron error:', error);
    }
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API Routes
      if (path === '/' || path === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'GameHub News Aggregator',
          version: '1.0.0',
          endpoints: [
            '/api/news/list - Get news list',
            '/api/news/detail/:id - Get news detail',
            '/api/news/refresh - Force refresh cache',
            '/api/config - View current sources'
          ]
        }), { headers: corsHeaders });
      }

      if (path === '/api/news/list') {
        return await handleNewsList(request, env, corsHeaders);
      }

      if (path.startsWith('/api/news/detail/')) {
        const id = path.split('/').pop();
        return await handleNewsDetail(id, env, corsHeaders);
      }

      if (path === '/api/news/refresh') {
        return await handleRefreshCache(env, corsHeaders);
      }

      if (path === '/api/config') {
        return new Response(JSON.stringify({
          sources: NEWS_SOURCES,
          cache_ttl: '1 hour',
          max_items: MAX_NEWS_ITEMS
        }, null, 2), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        error: 'Not found',
        path: path
      }), {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

async function handleNewsList(request, env, corsHeaders) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('page_size') || '4'); // Default to 4 for lazy loading

  // Try to get from cache first
  let cachedNews = await getCachedNewsList(env);

  if (!cachedNews) {
    // Fetch fresh data
    console.log('Cache miss, fetching fresh news...');
    cachedNews = await fetchAllNews();

    // Cache the result
    await setCachedNewsList(env, cachedNews);
  } else {
    console.log('Cache hit, returning cached news');
  }

  // Transform to GameHub format with pagination
  const response = transformToGameHubList(cachedNews, page, pageSize);

  return new Response(JSON.stringify(response), { headers: corsHeaders });
}

async function handleNewsDetail(id, env, corsHeaders) {
  // Try to get from cache first
  let cachedDetail = await getCachedNewsDetail(env, id);

  if (!cachedDetail) {
    // Need to fetch all news to find the specific item
    let allNews = await getCachedNewsList(env);

    if (!allNews) {
      allNews = await fetchAllNews();
      await setCachedNewsList(env, allNews);
    }

    // Find the specific news item
    const newsItem = allNews.find(item => item.id === parseInt(id));

    if (!newsItem) {
      return new Response(JSON.stringify({
        code: 404,
        msg: 'News not found',
        time: '',
        data: null
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Transform to GameHub detail format
    cachedDetail = transformToGameHubDetail(newsItem);

    // Cache the detail
    await setCachedNewsDetail(env, id, cachedDetail);
  } else {
    console.log('Cache hit for detail:', id);
  }

  return new Response(JSON.stringify(cachedDetail), { headers: corsHeaders });
}

async function handleRefreshCache(env, corsHeaders) {
  try {
    // Invalidate existing cache
    await invalidateCache(env);

    // Fetch fresh data
    const freshNews = await fetchAllNews();

    // Cache the new data
    await setCachedNewsList(env, freshNews);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cache refreshed successfully',
      items: freshNews.length
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

async function fetchAllNews() {
  console.log('Fetching news from all sources...');

  // Fetch RSS feeds in parallel
  const rssPromises = NEWS_SOURCES.rss.map(source => fetchRSSFeed(source.url));
  const rssResults = await Promise.all(rssPromises);
  console.log(`RSS Results: ${rssResults.map(r => r.length).join(', ')}`);

  // Fetch GitHub releases in parallel (using RSS feeds, no rate limiting)
  const githubPromises = NEWS_SOURCES.github.map(source =>
    fetchGitHubReleases(source.owner, source.repo)
  );
  const githubResults = await Promise.all(githubPromises);
  console.log(`GitHub Results: ${githubResults.map(r => r.length).join(', ')}`);

  // Fetch YouTube videos in parallel
  const youtubePromises = NEWS_SOURCES.youtube.map(source =>
    fetchYouTubeFeed(source.channelId)
  );
  const youtubeResults = await Promise.all(youtubePromises);
  console.log(`YouTube Results: ${youtubeResults.map(r => r.length).join(', ')}`);

  // Aggregate and sort all news
  const allNews = aggregateAllNews(
    NEWS_SOURCES.rss,
    NEWS_SOURCES.github,
    NEWS_SOURCES.youtube,
    rssResults,
    githubResults,
    youtubeResults
  );

  // Limit to max items
  const limitedNews = allNews.slice(0, MAX_NEWS_ITEMS);

  console.log(`Fetched ${limitedNews.length} news items`);

  return limitedNews;
}
