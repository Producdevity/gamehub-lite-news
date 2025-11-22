// Cache management using KV storage

import { CACHE_TTL } from './config.js';

const CACHE_KEYS = {
  NEWS_LIST: 'news:list',
  NEWS_DETAIL_PREFIX: 'news:detail:'
};

export async function getCachedNewsList(env) {
  try {
    const cached = await env.NEWS_CACHE.get(CACHE_KEYS.NEWS_LIST, 'json');
    return cached;
  } catch (error) {
    console.error('Error getting cached news list:', error);
    return null;
  }
}

export async function setCachedNewsList(env, newsList) {
  try {
    await env.NEWS_CACHE.put(
      CACHE_KEYS.NEWS_LIST,
      JSON.stringify(newsList),
      { expirationTtl: CACHE_TTL }
    );
  } catch (error) {
    console.error('Error setting cached news list:', error);
  }
}

export async function getCachedNewsDetail(env, id) {
  try {
    const cached = await env.NEWS_CACHE.get(
      `${CACHE_KEYS.NEWS_DETAIL_PREFIX}${id}`,
      'json'
    );
    return cached;
  } catch (error) {
    console.error('Error getting cached news detail:', error);
    return null;
  }
}

export async function setCachedNewsDetail(env, id, newsDetail) {
  try {
    await env.NEWS_CACHE.put(
      `${CACHE_KEYS.NEWS_DETAIL_PREFIX}${id}`,
      JSON.stringify(newsDetail),
      { expirationTtl: CACHE_TTL }
    );
  } catch (error) {
    console.error('Error setting cached news detail:', error);
  }
}

export async function invalidateCache(env) {
  try {
    // Delete the main list cache
    await env.NEWS_CACHE.delete(CACHE_KEYS.NEWS_LIST);

    // List all detail keys and delete them
    const list = await env.NEWS_CACHE.list({ prefix: CACHE_KEYS.NEWS_DETAIL_PREFIX });
    const deletePromises = list.keys.map(key => env.NEWS_CACHE.delete(key.name));
    await Promise.all(deletePromises);

    return { success: true, message: 'Cache invalidated' };
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return { success: false, message: error.message };
  }
}
