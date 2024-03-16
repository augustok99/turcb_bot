import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

const client = new Client({
  authStrategy: new LocalAuth(),

  puppeteer: {
    headless: false,
  },
});

client.on("qr", (qr) => {
  generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Bot esta pronto para receber mensagem!");
});

import message from "./message.js";

message(client);

client.initialize();
