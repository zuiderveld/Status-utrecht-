const { buildPlayerBar } = require('./player-bar');

const COLORS = {
  operational: 0x22c55e,
  degraded: 0xeab308,
  outage: 0xef4444,
  unknown: 0x6b7280,
};

const OVERALL_TITLE = {
  operational: '🟢 Alles operationeel',
  degraded: '🟡 Beperkte beschikbaarheid',
  outage: '🔴 Storing gedetecteerd',
  unknown: '⚪ Status onbekend',
};

const SITE_ICONS = {
  main: '🌐',
  overheid: '🏛️',
  staff: '🛡️',
};

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

function siteField(site) {
  const icon = SITE_ICONS[site.id] || '📄';
  const up = site.status === 'up';
  const statusLine = up
    ? `✅ **Online**${site.latencyMs != null ? ` · ${Math.round(site.latencyMs)}ms` : ''}`
    : `❌ **Offline**${site.error ? `\n${site.error}` : ''}`;

  let maint = '';
  if (site.maintenance?.global) {
    maint = '\n⚠️ Onderhoud actief';
  } else if (site.maintenance?.diensten) {
    const on = Object.entries(site.maintenance.diensten)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (on.length) maint = `\n⚠️ Onderhoud: ${on.join(', ')}`;
  }

  return {
    name: `${icon} ${site.name}`,
    value: statusLine + maint,
    inline: true,
  };
}

function fivemEmbed(fivem) {
  if (!fivem?.enabled) return null;

  const up = fivem.status === 'up';
  const max = fivem.maxClients || 128;
  const clients = fivem.clients || 0;

  if (!up) {
    return {
      title: '🎮 FiveM server',
      color: COLORS.outage,
      description: [
        '🔴 **OFFLINE**',
        '',
        fivem.error || 'Server niet bereikbaar',
        '',
        `\`${fivem.host}:${fivem.port}\``,
      ].join('\n'),
    };
  }

  const { bar, scale, percent } = buildPlayerBar(clients, max, 18);
  const meta = [];
  if (fivem.hostname) meta.push(`**${fivem.hostname}**`);
  if (fivem.mapname) meta.push(`Map: ${fivem.mapname}`);
  if (fivem.gametype) meta.push(fivem.gametype);

  let playerLines = '';
  if (fivem.players?.length) {
    playerLines = fivem.players
      .slice(0, 12)
      .map((p) => `• ${p.name}${p.ping != null ? ` · ${p.ping}ms` : ''}`)
      .join('\n');
    if (fivem.clients > fivem.players.length) {
      playerLines += `\n_+${fivem.clients - fivem.players.length} overige_`;
    }
  } else if (clients === 0) {
    playerLines = '_Geen spelers online_';
  }

  const embed = {
    title: '🎮 FiveM server',
    color: COLORS.operational,
    description: [
      '📶 **ONLINE**',
      '',
      `👥 **${clients} / ${max}** spelers online`,
      '',
      bar,
      scale,
      `**${percent}%** bezetting`,
      '',
      meta.join(' · ') || null,
      '',
      `🔗 [Verbinden](${fivem.connectUrl})`,
    ]
      .filter((line) => line !== null && line !== '')
      .join('\n'),
  };

  if (playerLines) {
    embed.fields = [
      {
        name: 'Spelers in de stad',
        value: playerLines.slice(0, 1020),
        inline: false,
      },
    ];
  }

  return embed;
}

function buildDiscordPayload(status, options = {}) {
  const statusPageUrl =
    options.statusPageUrl ||
    process.env.STATUS_PAGE_URL ||
    'https://status.utrechtroleplay.eu';

  const embeds = [
    {
      title: OVERALL_TITLE[status.overall] || OVERALL_TITLE.unknown,
      color: COLORS[status.overall] || COLORS.unknown,
      description: [
        `Status van **Utrecht Roleplay**`,
        '',
        `🕐 Bijgewerkt: **${formatNlTime(status.checkedAt)}**`,
        options.footerNote || '',
      ]
        .filter(Boolean)
        .join('\n'),
      fields: (status.sites || []).map(siteField),
    },
  ];

  const fivem = fivemEmbed(status.fivem);
  if (fivem) embeds.push(fivem);

  return {
    username: options.username || process.env.DISCORD_STATUS_USERNAME || 'URP Status',
    avatar_url: options.avatarUrl || process.env.DISCORD_STATUS_AVATAR_URL || undefined,
    embeds,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: 'Statuspagina',
            url: statusPageUrl,
          },
          {
            type: 2,
            style: 5,
            label: 'Website',
            url: 'https://www.utrechtroleplay.eu',
          },
          ...(status.fivem?.connectUrl
            ? [
                {
                  type: 2,
                  style: 5,
                  label: 'FiveM join',
                  url: status.fivem.connectUrl,
                },
              ]
            : []),
        ],
      },
    ],
  };
}

module.exports = { buildDiscordPayload, buildPlayerBar };
