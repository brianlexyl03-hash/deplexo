import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const getText = (message) => {
  if (!message) return '';

  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;

  if (message.ephemeralMessage?.message)
    return getText(message.ephemeralMessage.message);

  if (message.viewOnceMessage?.message)
    return getText(message.viewOnceMessage.message);

  return '';
};

const isGreeting = (text) =>
  /^(hi|hello|hey|hallo|helo|yo|sup|morning|good morning|good afternoon|good evening)\b/i.test(
    text.trim()
  );

const isMentionedAll = (text) =>
  /@all\b/i.test(text);

function replyFor(text, name = 'there') {
  const t = text.trim().toLowerCase();

  if (isGreeting(text)) {
    return `Hello ${name}. What do you need? I'm currently unavailable, but Deplexo is here to receive your message.`;
  }

  if (t === '/help' || t === 'help') {
    return `DEPLEXO

What I can do:

- Respond to messages
- Handle greetings
- Receive requests while you're unavailable
- React to @all mentions
- Respond to WhatsApp messages automatically

Send your message and Deplexo will receive it.`;
  }

  if (t === '/ping' || t === 'ping') {
    return 'Deplexo is online and responding.';
  }

  if (t === '/about' || t === 'about') {
    return `I'm Deplexo, an automated WhatsApp assistant.`;
  }

  if (t === '/time' || t === 'time') {
    return `Server time: ${new Date().toLocaleString()}`;
  }

  if (/\b(thanks|thank you|thx|thankyou)\b/i.test(text)) {
    return `You're welcome, ${name}.`;
  }

  return `Hello ${name}. What do you need? I'm currently unavailable, but Deplexo has received your message and will keep it here.`;
}

async function connectToWhatsApp() {
  const { state, saveCreds } =
    await useMultiFileAuthState('auth_info_baileys');

  const { version, isLatest } =
    await fetchLatestBaileysVersion();

  console.log(
    `Using WhatsApp Web v${version.join('.')}, latest: ${isLatest}`
  );

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\nScan this QR code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('\n================================');
      console.log('DEPLEXO IS ONLINE');
      console.log('================================\n');
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : undefined;

      const reconnect =
        statusCode !== DisconnectReason.loggedOut;

      console.log(
        `Connection closed: ${statusCode}. Reconnecting: ${reconnect}`
      );

      if (reconnect) {
        connectToWhatsApp().catch(console.error);
      } else {
        console.log('WhatsApp session logged out.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      for (const msg of messages || []) {
        if (!msg?.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;

        if (!jid) continue;

        const text = getText(msg.message).trim();

        if (!text) continue;

        const name = msg.pushName || 'there';

        console.log(
          `[MESSAGE] ${name} (${jid}): ${text}`
        );

        if (isMentionedAll(text)) {
          try {
            await sock.sendMessage(jid, {
              react: {
                text: '👍',
                key: msg.key
              }
            });
          } catch (reactionError) {
            console.error(
              '[REACTION ERROR]',
              reactionError
            );
          }
        }

        const reply = replyFor(text, name);

        await sock.sendMessage(
          jid,
          { text: reply },
          { quoted: msg }
        );

        console.log(`[REPLIED] ${jid}`);
      }
    } catch (error) {
      console.error('[MESSAGE ERROR]', error);
    }
  });

  console.log('Deplexo message handler loaded.');
}

connectToWhatsApp().catch((error) => {
  console.error('Critical initialization error:', error);
});
