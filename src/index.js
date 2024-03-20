import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";

const client = new Client({
  authStrategy: new LocalAuth({
  }),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true }); // Usando a função importada qrcode
});

client.on("ready", () => {
  console.log("Bot está pronto para receber mensagens!");
});

import message from "./message.js";

message(client);

client.initialize();
