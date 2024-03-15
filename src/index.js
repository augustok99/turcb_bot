import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

import message from "./message.js";

message(client);

client.initialize();
