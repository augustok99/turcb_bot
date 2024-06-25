import pkg from 'whatsapp-web.js';
const { NoAuth } = pkg;
const { Client } = pkg;
import qrcode from "qrcode-terminal";
/** @module index*/
/**
 * @constant
 * @type {Client}
 * @description - Creates an instance of the WhatsApp client.
 * @property {Object} webVersionCache - Cache settings for the web version of WhatsApp.
 * @property {string} webVersionCache.type - Remote cache type.
 * @property {string} webVersionCache.remotePath - URL to the remote version HTML file.
 * @property {NoAuth} authStrategy - Authentication strategy used to connect without authentication.
 */
const client = new Client({
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  },
  authStrategy: new NoAuth({
  }),
  puppeteer: {
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

/**
 *@description - Event triggered when a QR code is received.
 * @param {string} qr - QR code received.
 */
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

/**
 * @description - Event triggered when the customer is ready to receive messages.
 */
client.on("ready", () => {
  console.log("Bot está pronto para receber mensagens!");
});

/**
 * @description - Import the message handling module.
 */
import message from "./message.js";

/**
 * 
 * @function message
 * @description - passes the client to the message.js file.
 */
message(client);

/**
 * @description - Starts the WhatsApp client.
 */
client.initialize();

