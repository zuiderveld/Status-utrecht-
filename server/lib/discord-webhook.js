function parseWebhookUrl(url) {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  const m = trimmed.match(/(?:canary\.)?discord\.com\/api\/webhooks\/(\d+)\/([^/?#]+)/i);
  if (!m) return null;
  return { id: m[1], token: m[2] };
}

function normalizeWebhookUrl(url) {
  const w = parseWebhookUrl(url);
  if (!w) return null;
  return `https://discord.com/api/webhooks/${w.id}/${w.token}`;
}

async function postWebhookMessage(webhookOrUrl, payload) {
  const webhook =
    typeof webhookOrUrl === 'string' ? parseWebhookUrl(webhookOrUrl) : webhookOrUrl;
  if (!webhook) throw new Error('Ongeldige webhook URL');
  const url = `https://discord.com/api/v10/webhooks/${webhook.id}/${webhook.token}?wait=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Discord POST ${res.status}`);
  }
  return data;
}

async function patchWebhookMessage(webhook, messageId, payload) {
  const url = `https://discord.com/api/v10/webhooks/${webhook.id}/${webhook.token}/messages/${messageId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Discord PATCH ${res.status}`);
  }
  return data;
}

async function upsertStatusMessage(webhookUrl, messageId, payload) {
  const webhook = parseWebhookUrl(webhookUrl);
  if (!webhook) {
    throw new Error(
      'Ongeldige DISCORD_STATUS_WEBHOOK_URL. Gebruik de volledige URL van Discord (discord.com of canary.discord.com).'
    );
  }

  if (messageId) {
    return patchWebhookMessage(webhook, messageId, payload);
  }
  return postWebhookMessage(webhook, payload);
}

module.exports = {
  parseWebhookUrl,
  normalizeWebhookUrl,
  postWebhookMessage,
  upsertStatusMessage,
};
