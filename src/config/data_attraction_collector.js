import axios from "axios";
import dotenv from "dotenv";
import { writeFile } from "fs/promises";
import { getCache, setCache } from "./cache/apiCache.js";
import { getPhotoUrl } from "./cache/photoCache.js";
dotenv.config({ path: "../../.env" });
/** @module data_attraction_collector*/
/**
 * @function searchAttractionsInCorumba
 * @description - Searches for attractions in Corumbá, MS using the Google Places API.
 * @async
 * @returns {Promise<Array<Object>|null>} - An array of attraction objects if successful, otherwise null.
 */
async function searchAttractionsInCorumba() {
  /**
   * @constant {string} apiKey - The Google API key retrieved from environment variables.
   */
  const apiKey = process.env.GOOGLE_API;
  /**
  * @constant {string} query - The search query for tourist attractions in Corumba, MS.
  */
  const query = "Pontos Turísticos em Corumbá MS";
  /**
  * @constant {string} url - The encoded URL for the Google Places API request.
  */
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&key=${apiKey}`;

  try {
    /**
    * @constant {Object} response - The response from the Google Places API.
    */
    const response = await axios.get(url);
    /**
    * @constant {Object} data - The data object from the response.
    * @property {string} status - The status of the API request.
    * @property {Array} results - The array of results from the search query.
    */
    const data = response.data;

    if (data.status === "OK" && data.results.length > 0) {
      /**
      * @constant {Array<Object>} attractions - The array of attraction objects.
      */
      const attractions = await Promise.all(
        data.results.map(async (result) => {
          /**
          * @description - Retrieves detailed information about a specific place using the place ID.
          * @constant {Object|null} placeDetails - The detailed information about the place.
          */
          const placeDetails = await getPlaceDetails(result.place_id);

          /**
           * @constant {Array<string>} photos - The array of photo URLs for the place. Array containing URLs of the photos associated with the location obtained from placeDetails.
           * @description -  Checks if placeDetails exists and is true. If true Extracts the first two elements of the photos array inside placeDetails. If placeDetails is false or photos is empty, initializes photos as an empty array ([]).
           */
          const photos = placeDetails
            ? placeDetails.photos
              .slice(0, 2)
              .map((photo) =>
                getPhotoUrl(result.place_id, photo.photo_reference)
              )
            : [];
          /**
         * @constant {string} phoneNumber - The formatted phone number of the place. If the phone number is not available, a default message is used.
         */
          const phoneNumber =
            placeDetails && placeDetails.formatted_phone_number
              ? placeDetails.formatted_phone_number
              : "Phone number not available";

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
      console.error("Error when searching for hotels:", data.error_message);
      return null;
    }
  } catch (error) {
    console.error("Connection error:", error);
    return null;
  }
}

/**
 * @function getPlaceDetails
 * @description - Retrieves detailed information about a specific place using the Google Places API.
 * @async
 * @param {string} placeId - The unique identifier for the place.
 * @returns {Promise<Object|null>} - The detailed place information if successful, otherwise null.
 */
async function getPlaceDetails(placeId) {
  /**
   * Checks if the details are already in the cache.
   * @constant {Object|null} cachedDetails - The cached place details if available.
   */
  const cachedDetails = getCache(placeId);
  if (cachedDetails) {
    return cachedDetails;
  }

  const apiKey = process.env.GOOGLE_API;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,rating,user_ratings_total,photos&key=${apiKey}`;

  try {
    /**
    * @constant {Object} response - The response from the Google Places API.
    */
    const response = await axios.get(url);
    /**
    * @constant {Object} data - The data object from the response.
    * @property {string} status - The status of the API request.
    * @property {Object} result - The detailed place information.
    */
    const data = response.data;

    if (data.status === "OK" && data.result) {
      const detail = data.result;
      /**
     * @constant {Array<string>} photoUrls - The array of photo URLs for the place.
     */
      detail.photoUrls = detail.photos.map((photo) =>
        getPhotoUrl(placeId, photo.photo_reference)
      );
      setCache(placeId, detail);
      return detail;
    } else {
      console.error("Error getting the location details:", data.error_message);
      return null;
    }
  } catch (error) {
    console.error("Connection error:", error);
    return null;
  }
}

/**
 * @function main
 * @description - Main function to fetch attractions and save them to a JSON file.
 * @async
 */
async function main() {
  /**
  * @constant {Array<Object>|null} attractions - The array of attraction objects.
  */
  const attractions = await searchAttractionsInCorumba();

  if (attractions) {
    try {
      const filePath = "../data/attractions_data.json";
      await writeFile(filePath, JSON.stringify(attractions, null, 2));
      console.log(
        `Tourist Attraction data successfully saved in '${filePath}'.`
      );
    } catch (error) {
      console.error("Error when saving data on tourist attractions: ", error);
    }
  } else {
    console.log("Missing the sights.");
  }
}

main();

export { main };
