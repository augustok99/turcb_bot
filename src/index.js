import pkg from 'whatsapp-web.js';
const { NoAuth } = pkg;
const { Client } = pkg;
import qrcode from "qrcode-terminal";

const client = new Client({
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  },
  authStrategy: new NoAuth({
  }),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Bot está pronto para receber mensagens!");
});

import message from "./message.js";

message(client);

client.initialize();