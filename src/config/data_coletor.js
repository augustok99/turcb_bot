import axios from "axios";
import dotenv from "dotenv";
import { writeFile } from "fs/promises";
dotenv.config({ path: "../../.env" });

const searchGoogleCSE = async (query, filename) => {
  const apiKey = process.env.GOOGLE_API;
  const cx = process.env.SEARCH_ENG;
  const lr = "lang_pt";
  const hl = "pt-BR";
  const siteSearchFilter = "i";
  const siteSearch = "https://www.tripadvisor.com.br/";
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${query}&lr=${lr}&hl=${hl}&siteSearch=${siteSearch}&siteSearchFilter=${siteSearchFilter}`;

  try {
    const response = await axios.get(url);
    const searchData = response.data;

    try {
      // Salva os dados brutos em um arquivo JSON na pasta data
      await writeFile(
        `../data/${filename}`,
        JSON.stringify(searchData, null, 2)
      );

      console.log("Arquivo salvo com sucesso:", filename);
    } catch (error) {
      console.error("Erro ao salvar o arquivo:", error);
    }

    return searchData;
  } catch (error) {
    console.error(
      "Erro ao consultar a API do Google Custom Search Engine:",
      error
    );
    return null;
  }
};

// Exemplo de uso:
const query = "Hotéis Corumbá MS";
const filename = "hotels_data.json";
searchGoogleCSE(query, filename)
  .then((data) => {
    console.log("Resultados da pesquisa:", data);
  })
  .catch((error) => {
    console.error("Erro ao pesquisar no Google CSE:", error);
  });
