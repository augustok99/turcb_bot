import axios from "axios";
import dotenv from "dotenv";
import { writeFile } from "fs/promises";
dotenv.config({ path: "../../.env" });

async function searchHotelsInCorumba() {
  const apiKey = process.env.GOOGLE_API;
  const query = "Hotéis em Corumbá MS";
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === "OK" && data.results.length > 0) {
      const hotels = await Promise.all(
        data.results.map(async (result) => {
          const placeDetails = await getPlaceDetails(result.place_id);
          const photos = placeDetails
            ? placeDetails.photos
                .slice(0, 2)
                .map((photo) => getPhotoUrl(photo.photo_reference))
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

      return hotels;
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
  const apiKey = process.env.GOOGLE_API;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,rating,user_ratings_total,photos&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === "OK" && data.result) {
      return data.result;
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
  const hotels = await searchHotelsInCorumba();

  if (hotels) {
    try {
      const filePath = "../data/hotels_data.json";
      await writeFile(filePath, JSON.stringify(hotels, null, 2));
      console.log(`Dados dos hotéis salvos com sucesso em '${filePath}'.`);
    } catch (error) {
      console.error("Erro ao salvar os dados dos hotéis:", error);
    }
  } else {
    console.log("Falha ao buscar hotéis em Corumbá.");
  }
}

function getPhotoUrl(photoReference) {
  const apiKey = process.env.GOOGLE_API;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference=${photoReference}&key=${apiKey}`;
}

main();
