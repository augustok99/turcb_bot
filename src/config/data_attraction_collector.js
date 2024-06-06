import axios from "axios";
import dotenv from "dotenv";
import { writeFile } from "fs/promises";
import { getCache, setCache } from "./cache/apiCache.js";
import { getPhotoUrl } from "./cache/photoCache.js";
dotenv.config({ path: "../../.env" });

async function searchAttractionsInCorumba() {
  const apiKey = process.env.GOOGLE_API;
  const query = "Pontos Turísticos em Corumbá MS";
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === "OK" && data.results.length > 0) {
      const attractions = await Promise.all(
        data.results.map(async (result) => {
          const placeDetails = await getPlaceDetails(result.place_id);
          const photos = placeDetails
            ? placeDetails.photos
              .slice(0, 2)
              .map((photo) =>
                getPhotoUrl(result.place_id, photo.photo_reference)
              ) // Atualizando a chamada para getPhotoUrl
            : [];
          const phoneNumber =
            placeDetails && placeDetails.formatted_phone_number
              ? placeDetails.formatted_phone_number
              : "Número de telefone não disponível";

          return {
            name: result.name,
            address: result.formatted_address,
            phone_number: phoneNumber,
            rating: result.rating,
            user_ratings_total: result.user_ratings_total,
            coordinates: result.geometry.location,
            photos: photos,
          };
        })
      );

      return attractions;
    } else {
      console.error("Erro ao buscar hotéis:", data.error_message);
      return null;
    }
  } catch (error) {
    console.error("Erro de conexão:", error);
    return null;
  }
}

async function getPlaceDetails(placeId) {
  // Verificar se os detalhes já estão no cache
  const cachedDetails = getCache(placeId);
  if (cachedDetails) {
    return cachedDetails;
  }

  const apiKey = process.env.GOOGLE_API;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,rating,user_ratings_total,photos&key=${apiKey}`;

  try {
    const response = await axios.get(url); // consome a api
    const data = response.data;

    if (data.status === "OK" && data.result) {
      // Aqui está a correção: trabalhar com data.result em vez de data.results
      const detail = data.result;
      detail.photoUrls = detail.photos.map((photo) =>
        getPhotoUrl(placeId, photo.photo_reference)
      );
      setCache(placeId, detail);
      return detail;
    } else {
      console.error("Erro ao obter os detalhes do local:", data.error_message);
      return null;
    }
  } catch (error) {
    console.error("Erro de conexão:", error);
    return null;
  }
}

async function main() {
  const attractions = await searchAttractionsInCorumba();

  if (attractions) {
    try {
      const filePath = "../data/attractions_data.json";
      await writeFile(filePath, JSON.stringify(attractions, null, 2));
      console.log(
        `Dados dos pontos turísticos salvos com sucesso em '${filePath}'.`
      );
    } catch (error) {
      console.error("Erro ao salvar os dados dos pontos turísticos:", error);
    }
  } else {
    console.log("Falha ao pontos turísticos.");
  }
}

main();

export { main };
