const { getFullStatus } = require('../server/lib/status-core');
const { buildDiscordPayload } = require('../server/lib/discord-embed');
const { upsertStatusMessage, parseWebhookUrl } = require('../server/lib/discord-webhook');
const { snapshotFromStatus, loadPreviousState, savePreviousState } = require('../server/lib/status-state');
const { sendTransitionAlerts } = require('../server/lib/discord-alerts');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET || process.env.DISCORD_STATUS_SECRET;
  if (!secret) return true;

  const auth = req.headers.authorization || '';
  if (auth === `Bearer ${secret}`) return true;

  const q = req.query?.secret;
  if (q && q === secret) return true;

  return false;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Alleen GET of POST' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({
      error: 'Unauthorized — gebruik ?secret=JOUW_CRON_SECRET of zet CRON_SECRET in Vercel',
    });
  }

  const webhookUrl = process.env.DISCORD_STATUS_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({
      error: 'DISCORD_STATUS_WEBHOOK_URL ontbreekt in Vercel Environment Variables',
    });
  }

  if (!parseWebhookUrl(webhookUrl)) {
    return res.status(500).json({
      error: 'DISCORD_STATUS_WEBHOOK_URL is ongeldig. Kopieer de volledige webhook-URL opnieuw uit Discord.',
    });
  }

  try {
    const previous = await loadPreviousState();
    const status = await getFullStatus();
    const current = snapshotFromStatus(status);

    const alertResult = await sendTransitionAlerts(webhookUrl, previous, current, status);

    const payload = buildDiscordPayload(status);
    const messageId = process.env.DISCORD_STATUS_MESSAGE_ID || null;
    const message = await upsertStatusMessage(webhookUrl, messageId, payload);

    await savePreviousState(current);

    const response = {
      ok: true,
      mode: messageId ? 'updated' : 'created',
      messageId: message.id,
      channelId: message.channel_id,
      overall: status.overall,
      checkedAt: status.checkedAt,
      alertsSent: alertResult.sent,
      alerts: alertResult.alerts,
      stateStored: !!process.env.BLOB_READ_WRITE_TOKEN || 'local-only',
    };

    if (!messageId) {
      response.hint =
        'Zet DISCORD_STATUS_MESSAGE_ID=' +
        message.id +
        ' in Vercel (redeploy) zodat hetzelfde embed-bericht wordt bijgewerkt.';
    }

    if (!previous) {
      response.note =
        'Eerste run: geen offline-meldingen. Vanaf de volgende check krijg je een alert bij uitval.';
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      response.warning =
        'Zonder BLOB_READ_WRITE_TOKEN onthoudt Vercel geen vorige status tussen runs — zet Blob aan voor betrouwbare offline-alerts.';
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('discord-status:', err);
    return res.status(500).json({ error: err.message || 'Discord update mislukt' });
  }
};
