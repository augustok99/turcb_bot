import puppeteer from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";

puppeteer.use(stealth());

const scraping_hotels = async () => {
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1024, height: 800 });

  await page.goto(
    "https://www.google.com/travel/search?q=hoteis%20de%20corumba"
  );

  await page.waitForNetworkIdle();

  const getInformations = async (iterationLimit = null) => {
    const hotelElements = await page.$$(".PVOOXe");

    // Determinar o número de iterações com base no limite fornecido
    const limit =
      iterationLimit !== null
        ? Math.min(hotelElements.length, iterationLimit)
        : hotelElements.length;

    // Iterar sobre os elementos e clicar em cada um
    for (let i = 0; i < limit; i++) {
      // Clicar no elemento do hotel
      await hotelElements[i].click();

      // Aguardar um breve período para carregar as informações
      await delay(2000);

      // Extrair informações do hotel apenas se estiverem presentes
      const titleHotel = await page
        .waitForSelector(".FNkAEc.o4k8l", { timeout: 300 })
        .catch(() => null);
      const evaluationHotel = await page
        .waitForSelector(".KFi5wf.lA0BZ", { timeout: 300 })
        .catch(() => null);

      await page.waitForSelector(".pb2I5.SV2nb.XGzk1b> img");
      const imgUrl = await page.evaluate(() => {
        const imgElement = document.querySelector(".pb2I5.SV2nb.XGzk1b> img");
        return imgElement ? imgElement.src : null;
      });

      const priceHotel = await page
        .waitForSelector(".qQOQpe.prxS3d", { timeout: 300 })
        .catch(() => null);
      const classficationHotel = await page
        .waitForSelector(".B2PODc > span:nth-child(3)", { timeout: 300 })
        .catch(() => null);
      const addressHotel = await page
        .waitForSelector(".K4nuhf > span:nth-child(1)", { timeout: 300 })
        .catch(() => null);
      const phoneHotel = await page
        .waitForSelector(".K4nuhf > span:nth-child(3)", { timeout: 300 })
        .catch(() => null);

      // Extrair informações apenas se os elementos estiverem presentes
      const title = titleHotel
        ? await titleHotel.evaluate((el) => el.textContent.trim())
        : "N/A";
      const evaluation = evaluationHotel
        ? await evaluationHotel.evaluate((el) => el.textContent.trim())
        : "N/A";

      const price = priceHotel
        ? await priceHotel.evaluate((el) => el.textContent.trim())
        : "N/A";
      const classification = classficationHotel
        ? await classficationHotel.evaluate((el) => el.textContent.trim())
        : "N/A";
      const address = addressHotel
        ? await addressHotel.evaluate((el) => el.textContent.trim())
        : "N/A";
      const phone = phoneHotel
        ? await phoneHotel.evaluate((el) => el.textContent.trim())
        : "N/A";

      // Exibir informações do hotel no console
      console.log(
        "\nTitulo do Hotel: " + title,
        "\nAvaliação do Hotel: " + evaluation,
        "\nImagem do Hotel: " + imgUrl,
        "\nPreço diaria do Hotel: " + price,
        "\nClassisificação do Hotel: " + classification,
        "\nEndereço do Hotel: " + address,
        "\nTelefone do Hotel: " + phone
      );

      // Fechar a janela de informações do hotel
      const buttonClose = await page.waitForSelector(".Z2RjOe.ZfVo8d.sd2Eaf");
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

// Chamar a função scraping_hotels para iniciar o processo
scraping_hotels();

export default scraping_hotels;
