function parseWebhookUrl(url) {
  const trimmed = (url || '').trim();
  const m = trimmed.match(/discord\.com\/api\/webhooks\/(\d+)\/([^/?#]+)/i);
  if (!m) return null;
  return { id: m[1], token: m[2] };
}

async function postWebhookMessage(webhook, payload) {
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
  if (!webhook) throw new Error('Ongeldige DISCORD_STATUS_WEBHOOK_URL');

  if (messageId) {
    return patchWebhookMessage(webhook, messageId, payload);
  }
  return postWebhookMessage(webhook, payload);
}

module.exports = {
  parseWebhookUrl,
  upsertStatusMessage,
};
