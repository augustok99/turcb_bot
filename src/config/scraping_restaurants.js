import puppeteer from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";

puppeteer.use(stealth());

const restaurants = [];

const scraping_restaurants = async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1024, height: 800 });

  await page.goto(
    "https://www.google.com/maps/search/restaurantes+corumba+ms/"
  );

  const getInformations = async (iterationLimit = null) => {
    const restaurantElements = await page.$$(".Nv2PK.THOPZb.CpccDe > a");

    // Determinar o número de iterações com base no limite fornecido ou de elementos ou passado via parametro
    const limit =
      iterationLimit !== null
        ? Math.min(restaurantElements.length, iterationLimit)
        : restaurantElements.length;

    // Iterar sobre os elementos e clicar em cada um
    for (let i = 0; i < limit; i++) {
      // Clicar no elemento de atração turistica
      await restaurantElements[i].click();

      // Aguardar um breve período para carregar as informações
      await delay(3000);

      // Extrair informações de atrações turisticas apenas se estiverem presentes
      const titleRestaurant = await page
        .waitForSelector("div.lMbq3e > div:nth-child(1) > h1", { timeout: 300 })
        .catch(() => null);

      const evaluationRestaurant = await page
        .waitForSelector(".F7nice > span", { timeout: 300 })
        .catch(() => null);

      let imgUrl;
      try {
        await page.waitForSelector(".aoRNLd.kn2E5e.NMjTrf.lvtCsd > img", {
          timeout: 500,
        });
        imgUrl = await page.evaluate(() => {
          const imgElement = document.querySelector(
            ".aoRNLd.kn2E5e.NMjTrf.lvtCsd > img"
          );
          return imgElement ? imgElement.src : null;
        });
      } catch (error) {
        console.error("Erro ao aguardar ou avaliar o seletor:", error);
        console.log("Tentando novamente uma vez...");
        // Tente novamente após um curto período de tempo
        await delay(1000); // Aguarde 1 segundo antes de tentar novamente
        try {
          await page.waitForSelector(".aoRNLd.kn2E5e.NMjTrf.lvtCsd > img", {
            timeout: 500,
          });
          imgUrl = await page.evaluate(() => {
            const imgElement = document.querySelector(
              ".aoRNLd.kn2E5e.NMjTrf.lvtCsd > img"
            );
            return imgElement ? imgElement.src : null;
          });
        } catch (error) {
          console.error("Erro ao tentar novamente:", error);
          imgUrl = "N/A";
        }
      }

      const addressRestaurant = await page
        .waitForSelector(".Io6YTe.fontBodyMedium.kR99db", { timeout: 300 })
        .catch(() => null);
      const statusRestaurant = await page
        .waitForSelector(".ZDu9vd > span", { timeout: 300 }) //.ZDu9vd
        .catch(() => null);
      const phoneRestaurant = await page
        .waitForSelector(".rogA2c  > div", { timeout: 300 })
        .catch(() => null);

      // Extrair informações apenas se os elementos estiverem presentes
      const title = titleRestaurant
        ? await titleRestaurant.evaluate((el) => el.textContent.trim())
        : "N/A";
      const evaluation = evaluationRestaurant
        ? await evaluationRestaurant.evaluate((el) => el.textContent.trim())
        : "N/A";
      const address = addressRestaurant
        ? await addressRestaurant.evaluate((el) => el.textContent.trim())
        : "N/A";
      const status = statusRestaurant
        ? await statusRestaurant.evaluate((el) => el.textContent.trim())
        : "N/A";
      const phone = phoneRestaurant
        ? await phoneRestaurant.evaluate((el) => el.textContent.trim())
        : "N/A";

      // Exibir informações de atrações turisticas no console
      restaurants.push({
        title,
        status,
        evaluation,
        address,
        imgUrl,
        phone,
      });

      // Exibir informações de atrações turisticas no console
      console.log(restaurants);

      // Fechar a janela de atrações turisticas
      const buttonClose = await page.waitForSelector(
        ".VfPpkd-icon-LgbsSe.yHy1rc.eT1oJ.mN1ivc"
      );
      await buttonClose.click();

      // Esperar um breve período antes de clicar no próximo hotel
      await delay(2000);
    }
  };

  // Chamar a função getInformations com limite de 10 iterações
  await getInformations(10);

  await browser.close();

  // Escrever os dados em um arquivo JSON
  try {
    await fs.writeFile(
      "../data/restaurants_data.json",
      JSON.stringify(restaurants, null, 2)
    );
    console.log("Dados salvos com sucesso em restaurants_data.json");
  } catch (error) {
    console.error("Erro ao salvar os dados:", error);
  }
};

// Função de atraso personalizada usando setTimeout
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Chamar a função scraping_restaurants para iniciar o processo
scraping_restaurants();

export default scraping_restaurants;
