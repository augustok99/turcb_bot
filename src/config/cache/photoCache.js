/** @module photoCache*/
/**
 * @constant {number} - In the photoCache.js module, cached photo URLs are stored together with the timestamp of the last update. This timestamp is compared with the current time whenever a photo URL is requested. If the difference between the current time and the last updated time is less than the expiration time (24 hours), the cached URL is used. Otherwise, a new URL is generated and the cache is updated. It was created to try to minimize calls to the api.
 */
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000;

/**
 * @description - In-memory cache for storing photo URLs.
 * @type {Object}
 */
const photoCache = {};

/**
 * Retrieves the photo URL from the cache or generates a new URL if not cached or expired.
 * @param {string} placeId - The unique identifier for the place.
 * @param {string} photoReference - The reference ID for the photo.
 * @returns {string} - The photo URL.
 */
export function getPhotoUrl(placeId, photoReference) {
  const cacheKey = `${placeId}-${photoReference}`;
  const cachedPhotoUrl = photoCache[cacheKey];
  if (
    cachedPhotoUrl &&
    Date.now() - cachedPhotoUrl.lastUpdated < CACHE_EXPIRATION_TIME
  ) {
    return cachedPhotoUrl.url;
  }

  // Se a URL da foto não estiver no cache ou se expirou, gerar a URL
  const apiKey = process.env.GOOGLE_API;
  const newPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference=${photoReference}&key=${apiKey}`;

  // Atualizar o cache com a nova URL da foto e o horário de atualização
  photoCache[cacheKey] = {
    url: newPhotoUrl,
    lastUpdated: Date.now(),
  };

  return newPhotoUrl;
}
