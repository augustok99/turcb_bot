// Defina o tempo de expiração do cache em milissegundos
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 horas
const photoCache = {};

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
