import puppeteer from "puppeteer-extra";
import stealth from "puppeteer-extra-plugin-stealth";

puppeteer.use(stealth());

const main = async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.goto(
    "https://www.google.com/travel/search?q=hoteis%20de%20corumba"
  );

  const getInformations = async () => {
    // capturando a div para clicarmos na janela com as informações que queremos capturar
    const elementDiv = await page.waitForSelector(".PVOOXe");
    await elementDiv.click();

    // capturando os elementos pela classe e selector
    const titleHotel = await page.waitForSelector(".FNkAEc.o4k8l");
    const evaluationHotel = await page.waitForSelector(".KFi5wf.lA0BZ");
    const priceHotel = await page.waitForSelector(".qQOQpe.prxS3d");

    const classficationHotel = await page.waitForSelector(
      "#overview > c-wiz.K1smNd > c-wiz:nth-child(1) > div > section > div.OGAsq > div:nth-child(1) > div > div.B2PODc > span:nth-child(3)"
    );

    const addressHotel = await page.waitForSelector(
      "#overview > c-wiz.K1smNd > c-wiz:nth-child(1) > div > section > div.OGAsq > div:nth-child(1) > div > div.K4nuhf > span:nth-child(1)"
    );

    const phoneHotel = await page.waitForSelector(
      "#overview > c-wiz.K1smNd > c-wiz:nth-child(1) > div > section > div.OGAsq > div:nth-child(1) > div > div.K4nuhf > span:nth-child(3)"
    );

    // extraindo informações das classes e seletores

    const title = await page.evaluate(
      (titleHotel) => titleHotel.textContent,
      titleHotel
    );

    const evaluation = await page.evaluate(
      (evaluationHotel) => evaluationHotel.textContent,
      evaluationHotel
    );

    const classification = await page.evaluate(
      (classficationHotel) => classficationHotel.textContent,
      classficationHotel
    );

    const address = await page.evaluate(
      (addressHotel) => addressHotel.textContent,
      addressHotel
    );

    const phone = await page.evaluate(
      (phoneHotel) => phoneHotel.textContent,
      phoneHotel
    );

    const price = await page.evaluate(
      (priceHotel) => priceHotel.textContent,
      priceHotel
    );

    console.log(title, evaluation, price, classification, address, phone);

    const buttonClose = await page.waitForSelector(".Z2RjOe.ZfVo8d.sd2Eaf");
    await buttonClose.click();
  };

  await getInformations();

  await browser.close();
};

main();
