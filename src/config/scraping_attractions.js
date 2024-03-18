import puppeteer from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";

puppeteer.use(stealth());

const attractions = [];

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
      await delay(3000);

      // Extrair informações de atrações turisticas apenas se estiverem presentes
      const titleAttractions = await page
        .waitForSelector(".DUwDvf.lfPIob", { timeout: 300 })
        .catch(() => null);

      const evaluationAttraction = await page
        .waitForSelector(".F7nice > span", { timeout: 300 })
        .catch(() => null);

      await page.waitForSelector(".aoRNLd.kn2E5e.NMjTrf.lvtCsd > img", {
        timeout: 500,
      });

      // Imagens demoram a carregar, necessario implementar uma logica separada
      let imgUrl;
      try {
        await page.waitForSelector(".aoRNLd.kn2E5e.NMjTrf.lvtCsd > img", {
          timeout: 1000,
          visible: true, // Esperar até que o elemento seja visível
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
      attractions.push({ title, evaluation, address, imgUrl, status, phone });

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
      "../data/attractions_data.json",
      JSON.stringify(attractions, null, 2)
    );
    console.log("Dados salvos com sucesso em attractions_data.json");
  } catch (error) {
    console.error("Erro ao salvar os dados:", error);
  }
};

// Função de atraso personalizada usando setTimeout
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Chamar a função scraping_attractions para iniciar o processo
scraping_attractions();

export default scraping_attractions;
