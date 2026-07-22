// tutorCache.js — Local knowledge cache for the Interactive Tutor
// Caches AI responses by topic+question hash to avoid redundant API calls.

const CACHE_KEY_PREFIX = 'tutor_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 50;

/**
 * Simple string hash for cache keys.
 */
function hashKey(topic, question) {
  const str = `${topic.toLowerCase().trim()}::${question.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return CACHE_KEY_PREFIX + Math.abs(hash).toString(36);
}

/**
 * Get a cached response if it exists and hasn't expired.
 * @param {string} topic - The focus area / topic
 * @param {string} question - The task text or question
 * @returns {string|null} Cached response or null
 */
export function getCachedResponse(topic, question) {
  try {
    const key = hashKey(topic, question);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.response;
  } catch {
    return null;
  }
}

/**
 * Cache a response for a given topic+question.
 * @param {string} topic - The focus area / topic
 * @param {string} question - The task text or question
 * @param {string} response - The AI response to cache
 */
export function setCachedResponse(topic, question, response) {
  try {
    const key = hashKey(topic, question);
    const entry = {
      topic,
      question,
      response,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
    pruneCache();
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Remove all tutor cache entries.
 */
export function clearCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

/**
 * Prune oldest entries if we exceed MAX_CACHE_ENTRIES.
 */
function pruneCache() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      try {
        const entry = JSON.parse(localStorage.getItem(key));
        entries.push({ key, timestamp: entry.timestamp });
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  if (entries.length > MAX_CACHE_ENTRIES) {
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
    toRemove.forEach(e => localStorage.removeItem(e.key));
  }
}
