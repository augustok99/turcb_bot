const apiCache = {};

export function getCache(placeId) {
  return apiCache[placeId];
}

export function setCache(placeId, data) {
  apiCache[placeId] = data;
}
