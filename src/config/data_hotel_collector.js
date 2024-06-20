import axios from "axios";
import dotenv from "dotenv";
import { writeFile } from "fs/promises";
import { getCache, setCache } from "./cache/apiCache.js";
import { getPhotoUrl } from "./cache/photoCache.js";
dotenv.config({ path: "../../.env" });
/** @module data_hotel_collector*/

/**
 * @function searchHotelsInCorumba
 * @description - Searches for hotels in Corumbá, MS using the Google Places API.
 * @async
 * @returns {Promise<Array<Object>|null>} - An array of hotel objects if successful, otherwise null.
 */
async function searchHotelsInCorumba() {
  /**
   * @constant {string} apiKey - The Google API key retrieved from environment variables.
   */
  const apiKey = process.env.GOOGLE_API;
  /**
   * @constant {string} query - The search query for hotels in Corumbá, MS.
   */
  const query = "Hotéis em Corumbá MS";
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
      * @constant {Array<Object>} hotels - The array of hotel objects.
      */
      const hotels = await Promise.all(
        data.results.map(async (result) => {
          /**
          * @description - Retrieves detailed information about a specific place using the place ID.
          * @constant {Object|null} placeDetails - The detailed information about the place.
          */
          const placeDetails = await getPlaceDetails(result.place_id);
          /**
          * @constant {Array<string>} photos - The array of photo URLs for the place.
          * @description - Checks if placeDetails exists and is true. If true, extracts the first two elements of the photos array inside placeDetails. If placeDetails is false or photos is empty, initializes photos as an empty array ([]).
          */
          const photos = placeDetails
            ? placeDetails.photos
              .slice(0, 2)
              .map((photo) =>
                getPhotoUrl(result.place_id, photo.photo_reference)
              )
            : [];
          /**
          * @constant {string} phoneNumber - The formatted phone number of the place.
          * If the phone number is not available, a default message is used.
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

      return hotels;
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
 * Retrieves detailed information about a specific place using the Google Places API.
 * @async
 * @param {string} placeId - The unique identifier for the place.
 * @returns {Promise<Object|null>} - The detailed place information if successful, otherwise null.
 */
async function getPlaceDetails(placeId) {
  /**
   * @type {Object|null}
   * @constant cachedDetails - Check if the details are already in cache.
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
 * @description - - Main function to fetch hotels and save them to a JSON file.
 * @async
 */
async function main() {
  /**
 * @constant {Array<Object>|null} hotels - The array of hotel objects.
 */
  const hotels = await searchHotelsInCorumba();

  if (hotels) {
    try {
      const filePath = "../data/hotels_data.json";
      await writeFile(filePath, JSON.stringify(hotels, null, 2));
      console.log(`Hotel data successfully saved in '${filePath}'.`);
    } catch (error) {
      console.error("Error saving hotel data:", error);
    }
  } else {
    console.log("Failed to find hotels in Corumbá.");
  }
}

main();

export { main };