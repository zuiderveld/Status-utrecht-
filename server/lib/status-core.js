const fs = require('fs');
const path = require('path');

const CHECK_TIMEOUT_MS = 15000;

function readSitesFile() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'sites.json');
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(raw.sites) ? raw.sites : [];
  } catch {
    return [];
  }
}

function loadSites() {
  const envJson = process.env.STATUS_SITES_JSON;
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.sites)) return parsed.sites;
    } catch {
      /* fallback */
    }
  }

  const sites = readSitesFile();
  return sites.map((site) => {
    const key = `STATUS_URL_${(site.id || '').toUpperCase().replace(/-/g, '_')}`;
    const override = process.env[key];
    if (override) return { ...site, url: override.replace(/\/$/, '') };
    return site;
  });
}

async function probeUrl(fullUrl) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'application/json, text/html;q=0.9' },
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - started;
    let body = null;
    const up = res.status >= 200 && res.status < 400;
    if (up) {
      try {
        const text = await res.text();
        if (text) body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    return { up, latencyMs, httpStatus: res.status, body };
  } catch (err) {
    clearTimeout(timer);
    return {
      up: false,
      latencyMs: Date.now() - started,
      httpStatus: 0,
      error: err.name === 'AbortError' ? 'Timeout' : err.message || 'Onbereikbaar',
    };
  }
}

async function checkSite(site) {
  const base = (site.url || '').replace(/\/$/, '');
  if (!base) {
    return {
      id: site.id,
      name: site.name,
      description: site.description || '',
      link: site.link || '#',
      icon: site.icon || 'circle',
      status: 'unknown',
      latencyMs: null,
      httpStatus: 0,
      checkedPath: null,
      error: 'Geen URL geconfigureerd',
    };
  }

  const paths = [site.checkPath, site.fallbackPath].filter(Boolean);
  let lastResult = null;
  let usedPath = paths[0] || '/';

  for (const p of paths) {
    const pathPart = p.startsWith('/') ? p : `/${p}`;
    usedPath = pathPart;
    lastResult = await probeUrl(base + pathPart);
    if (lastResult.up) break;
  }

  const maintenance =
    site.id === 'overheid' && lastResult?.body && typeof lastResult.body.global === 'boolean'
      ? {
          global: !!lastResult.body.global,
          message: lastResult.body.message || null,
          diensten: lastResult.body.diensten || null,
        }
      : null;

  return {
    id: site.id,
    name: site.name,
    description: site.description || '',
    link: site.link || base,
    icon: site.icon || 'circle',
    status: lastResult.up ? 'up' : 'down',
    latencyMs: lastResult.latencyMs,
    httpStatus: lastResult.httpStatus,
    checkedPath: usedPath,
    error: lastResult.up ? null : lastResult.error || `HTTP ${lastResult.httpStatus}`,
    maintenance,
  };
}

function readFivemFile() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'fivem.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { enabled: false };
  }
}

function loadFivemConfig() {
  const file = readFivemFile();
  const enabled = process.env.FIVEM_ENABLED !== 'false' && file.enabled !== false;
  const host = process.env.FIVEM_HOST || file.host || '';
  const port = Number(process.env.FIVEM_PORT || file.port || 30120);
  return {
    enabled: enabled && !!host,
    host: host.trim(),
    port: Number.isFinite(port) ? port : 30120,
    name: file.name || 'FiveM game server',
    description: file.description || '',
  };
}

async function checkFivem(config) {
  if (!config.enabled) {
    return { enabled: false };
  }

  const base = `http://${config.host}:${config.port}`;
  const started = Date.now();

  try {
    const [dynamicRes, playersRes] = await Promise.all([
      probeUrl(`${base}/dynamic.json`),
      probeUrl(`${base}/players.json`),
    ]);

    const latencyMs = Math.max(dynamicRes.latencyMs || 0, playersRes.latencyMs || 0);
    const up = dynamicRes.up;

    if (!up || !dynamicRes.body) {
      return {
        enabled: true,
        id: 'fivem',
        name: config.name,
        description: config.description,
        status: 'down',
        latencyMs,
        host: config.host,
        port: config.port,
        connectUrl: `fivem://connect/${config.host}:${config.port}`,
        error: dynamicRes.error || 'Server niet bereikbaar',
        hostname: null,
        clients: 0,
        maxClients: null,
        mapname: null,
        gametype: null,
        players: [],
      };
    }

    const dynamic = dynamicRes.body;
    const maxClients = parseInt(dynamic.sv_maxclients, 10) || null;
    const clients = Number(dynamic.clients) || 0;
    let players = [];

    if (playersRes.up && Array.isArray(playersRes.body)) {
      players = playersRes.body
        .map((p) => ({
          id: p.id,
          name: (p.name || 'Speler').trim(),
          ping: typeof p.ping === 'number' ? p.ping : null,
        }))
        .filter((p) => p.name)
        .sort((a, b) => (a.id || 0) - (b.id || 0));
    }

    return {
      enabled: true,
      id: 'fivem',
      name: config.name,
      description: config.description,
      status: 'up',
      latencyMs,
      host: config.host,
      port: config.port,
      connectUrl: `fivem://connect/${config.host}:${config.port}`,
      error: null,
      hostname: dynamic.hostname || null,
      clients,
      maxClients,
      mapname: dynamic.mapname || null,
      gametype: dynamic.gametype || null,
      players,
    };
  } catch (err) {
    return {
      enabled: true,
      id: 'fivem',
      name: config.name,
      description: config.description,
      status: 'down',
      latencyMs: Date.now() - started,
      host: config.host,
      port: config.port,
      connectUrl: `fivem://connect/${config.host}:${config.port}`,
      error: err.message || 'Check mislukt',
      hostname: null,
      clients: 0,
      maxClients: null,
      mapname: null,
      gametype: null,
      players: [],
    };
  }
}

function summarizeSiteResults(results) {
  const down = results.filter((r) => r.status === 'down').length;
  const unknown = results.filter((r) => r.status === 'unknown').length;
  if (down > 0) return 'outage';
  if (unknown > 0) return 'unknown';
  return 'operational';
}

function summarizeAll(siteResults, fivem) {
  let overall = summarizeSiteResults(siteResults);
  if (fivem?.enabled && fivem.status === 'down') {
    return overall === 'operational' ? 'degraded' : 'outage';
  }
  return overall;
}

async function getFullStatus() {
  const sites = loadSites();
  const fivemConfig = loadFivemConfig();
  const [siteResults, fivem] = await Promise.all([
    Promise.all(sites.map(checkSite)),
    checkFivem(fivemConfig),
  ]);

  return {
    overall: summarizeAll(siteResults, fivem),
    checkedAt: new Date().toISOString(),
    sites: siteResults,
    fivem: fivem.enabled ? fivem : null,
  };
}

module.exports = {
  getFullStatus,
  loadSites,
  loadFivemConfig,
};
