import puppeteer from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";

puppeteer.use(stealth());

const scraping_attractions = async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1024, height: 800 });

  await page.goto(
    "https://www.google.com/maps/search/pontos+turisticos+de+corumba+ms/"
  );

  const getInformations = async (iterationLimit = null) => {
    const attractionsElements = await page.$$(".Nv2PK.THOPZb.CpccDe");

    // Determinar o número de iterações com base no limite fornecido
    const limit =
      iterationLimit !== null
        ? Math.min(attractionsElements.length, iterationLimit)
        : attractionsElements.length;

    // Iterar sobre os elementos e clicar em cada um
    for (let i = 0; i < limit; i++) {
      // Clicar no elemento de atração turistica
      await attractionsElements[i].click();

      // Aguardar um breve período para carregar as informações
      await delay(2000);

      // Extrair informações de atrações turisticas apenas se estiverem presentes
      const titleAttractions = await page
        .waitForSelector(".DUwDvf.lfPIob", { timeout: 300 })
        .catch(() => null);

      const evaluationAttraction = await page
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

      const addressAttractions = await page
        .waitForSelector(".Io6YTe.fontBodyMedium.kR99db", { timeout: 300 })
        .catch(() => null);
      const statusAttraction = await page
        .waitForSelector(".ZDu9vd > span", { timeout: 300 })
        .catch(() => null);
      const phoneAttraction = await page
        .waitForSelector(
          " div:nth-child(6) > button div.Io6YTe.fontBodyMedium.kR99db",
          { timeout: 300 }
        )
        .catch(() => null);

      // Extrair informações apenas se os elementos estiverem presentes
      const title = titleAttractions
        ? await titleAttractions.evaluate((el) => el.textContent.trim())
        : "N/A";
      const evaluation = evaluationAttraction
        ? await evaluationAttraction.evaluate((el) => el.textContent.trim())
        : "N/A";
      const address = addressAttractions
        ? await addressAttractions.evaluate((el) => el.textContent.trim())
        : "N/A";
      const status = statusAttraction
        ? await statusAttraction.evaluate((el) => el.textContent.trim())
        : "N/A";
      const phone = phoneAttraction
        ? await phoneAttraction.evaluate((el) => el.textContent.trim())
        : "N/A";

      // Exibir informações de atrações turisticas no console
      console.log(
        "\nTitulo Ponto Turistico: " + title,
        "\nAvaliação do Ponto Turistico: " + evaluation,
        "\nEndereço do Ponto Turistico: " + address,
        "\nImagem do Ponto Turistico: " + imgUrl,
        "\nStatus do Ponto Turistico: " + status,
        "\nTelefone do Ponto Turistico: " + phone
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

// Chamar a função scraping_attractions para iniciar o processo
scraping_attractions();

export default scraping_attractions;
