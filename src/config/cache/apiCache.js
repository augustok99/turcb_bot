/** @module apiCache*/
/**
 * @constant {Object} apiCache - In-memory cache for storing API responses.
 */
const apiCache = {};

/**
 * Retrieves cached data for a specific place ID.
 * @param {string} placeId - The unique identifier for the place.
 * @returns {Object|undefined} - The cached data if it exists, otherwise undefined.
 */
export function getCache(placeId) {
  return apiCache[placeId];
}

/**
 * Stores data in the cache for a specific place ID.
 * @param {string} placeId - The unique identifier for the place.
 * @param {Object} data - The data to be cached.
 */
export function setCache(placeId, data) {
  apiCache[placeId] = data;
}

