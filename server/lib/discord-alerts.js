const { postWebhookMessage } = require('./discord-webhook');

function formatNlTime(iso) {
  try {
    return new Date(iso).toLocaleString('nl-NL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso || '—';
  }
}

function pingContent() {
  const raw = process.env.DISCORD_ALERT_PING || '';
  if (!raw || raw === 'none') return '';
  return raw.trim() + '\n';
}

function detectTransitions(previous, current, status) {
  const alerts = [];
  const recover = process.env.DISCORD_ALERT_ON_RECOVER !== 'false';
  const time = formatNlTime(status.checkedAt);

  if (!previous) {
    return alerts;
  }

  for (const site of status.sites || []) {
    const was = previous.sites?.[site.id];
    const now = site.status;
    if (was === 'up' && now === 'down') {
      alerts.push({
        kind: 'down',
        title: `🔴 ${site.name} offline`,
        description: [
          `**${site.name}** is niet meer bereikbaar.`,
          site.error ? `\nFout: ${site.error}` : '',
          site.link ? `\n🔗 ${site.link}` : '',
          `\n🕐 ${time}`,
        ].join(''),
      });
    } else if (recover && was === 'down' && now === 'up') {
      alerts.push({
        kind: 'up',
        title: `🟢 ${site.name} weer online`,
        description: `**${site.name}** reageert weer.\n🕐 ${time}`,
      });
    }
  }

  if (status.fivem?.enabled) {
    const was = previous.fivem;
    const now = status.fivem.status;
    if (was === 'up' && now === 'down') {
      alerts.push({
        kind: 'down',
        title: '🔴 FiveM server offline',
        description: [
          'De **Utrecht Roleplay** game server is niet bereikbaar.',
          status.fivem.error ? `\nFout: ${status.fivem.error}` : '',
          `\n\`${status.fivem.host}:${status.fivem.port}\``,
          status.fivem.connectUrl ? `\n🔗 ${status.fivem.connectUrl}` : '',
          `\n🕐 ${time}`,
        ].join(''),
      });
    } else if (recover && was === 'down' && now === 'up') {
      const f = status.fivem;
      alerts.push({
        kind: 'up',
        title: '🟢 FiveM server weer online',
        description: [
          `Server **${f.hostname || 'Utrecht Roleplay'}** is terug.`,
          f.maxClients != null ? `\n👥 ${f.clients} / ${f.maxClients} spelers` : '',
          `\n🕐 ${time}`,
        ].join(''),
      });
    }
  }

  return alerts;
}

function buildAlertPayload(alert) {
  const color = alert.kind === 'down' ? 0xef4444 : 0x22c55e;
  return {
    content: pingContent() || undefined,
    embeds: [
      {
        title: alert.title,
        description: alert.description.slice(0, 4000),
        color,
        footer: { text: 'URP Status monitor' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function sendTransitionAlerts(webhookUrl, previous, current, status) {
  const transitions = detectTransitions(previous, current, status);
  if (!transitions.length) return { sent: 0, alerts: [] };

  const sent = [];
  for (const alert of transitions) {
    try {
      await postWebhookMessage(webhookUrl, buildAlertPayload(alert));
      sent.push(alert.title);
    } catch (err) {
      console.error('discord alert:', alert.title, err);
    }
  }

  return { sent: sent.length, alerts: sent };
}

module.exports = {
  detectTransitions,
  sendTransitionAlerts,
};
