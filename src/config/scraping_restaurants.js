import puppeteer from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";

puppeteer.use(stealth());

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
    const restaurantElements = await page.$$(".hfpxzc");

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
      await delay(2000);

      // Extrair informações de atrações turisticas apenas se estiverem presentes
      const titleRestaurant = await page
        .waitForSelector("div.lMbq3e > div:nth-child(1) > h1", { timeout: 300 })
        .catch(() => null);

      const evaluationRestaurant = await page
        .waitForSelector(".F7nice > span", { timeout: 300 })
        .catch(() => null);

      await page.waitForSelector(".aoRNLd.kn2E5e.NMjTrf.lvtCsd > img", {
        timeout: 300,
      });
      const imgUrl = await page.evaluate(() => {
        const imgElement = document.querySelector(
          ".aoRNLd.kn2E5e.NMjTrf.lvtCsd > img"
        );
        return imgElement ? imgElement.src : null;
      });

      const addressRestaurant = await page
        .waitForSelector(".Io6YTe.fontBodyMedium.kR99db", { timeout: 300 })
        .catch(() => null);
      const statusRestaurant = await page
        .waitForSelector(".ZDu9vd > span", { timeout: 300 }) //.ZDu9vd
        .catch(() => null);
      const phoneRestaurant = await page
        .waitForSelector(
          " div:nth-child(8) > button div.rogA2c > div.Io6YTe.fontBodyMedium.kR99db",
          { timeout: 300 }
        )
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
      console.log(
        "\nTitulo Restaurante: " + title,
        "\nAvaliação do Restaurante: " + evaluation,
        "\nEndereço do Restaurante: " + address,
        "\nImagem do Restaurante: " + imgUrl,
        "\nStatus do Restaurante: " + status,
        "\nTelefone do Restaurante: " + phone
      );

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
};

// Função de atraso personalizada usando setTimeout
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Chamar a função scraping_restaurants para iniciar o processo
scraping_restaurants();

export default scraping_restaurants;
