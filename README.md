# Deplexo — WhatsApp automation bot

Deplexo is a Node.js WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys). The current implementation connects to WhatsApp Web and uses Google's Gemini API to generate responses.

The bot is intended for controlled, owner-configured use. Review WhatsApp's terms and the relevant API/provider policies before deploying it.

## Current capabilities

- Connects through the Baileys WhatsApp Web socket client.
- Uses Gemini for message-generation requests.
- Reads configuration from environment variables.
- Keeps the WhatsApp session locally so a paired session can be reused.
- Uses Pino for application logging and QR-code output for initial pairing.

These are descriptions of the current codebase, not guarantees of production reliability or compatibility with every WhatsApp account.

## Requirements

- Node.js (use a current supported LTS release)
- npm
- A WhatsApp account for pairing
- A Google Gemini API key

## Setup

```bash
git clone https://github.com/brianlexyl03-hash/deplexo.git
cd deplexo
npm install
cp .env.example .env
```

Add the required Gemini credential to `.env`, then start the bot:

```bash
npm start
```

On first launch, follow the QR-code pairing flow shown in the terminal.

## Configuration and security

- Keep API keys and session files out of version control.
- Do not publish a paired WhatsApp session or share its authentication directory.
- Use the example configuration as a template; never put real credentials in `.env.example`.
- Restrict the bot to accounts and chats you are authorized to automate.

## Development notes

The package currently exposes a single `start` script that runs `index.js`. Automated tests and a deployment workflow are not documented in this repository yet.

## License

See [LICENSE](LICENSE).
