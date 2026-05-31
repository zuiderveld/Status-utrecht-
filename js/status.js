const REFRESH_MS = 60 * 1000;

const OVERALL_LABELS = {
    operational: { title: 'Alle systemen operationeel', sub: 'Websites en game server reageren normaal.' },
    outage: { title: 'Storing gedetecteerd', sub: 'Minstens één onderdeel is niet bereikbaar.' },
    degraded: { title: 'Beperkte beschikbaarheid', sub: 'Sommige onderdelen werken mogelijk niet goed.' },
    unknown: { title: 'Status onbekend', sub: 'Kon de status niet volledig bepalen.' },
    loading: { title: 'Status laden…', sub: 'Even geduld.' },
};

const SITE_STATUS = {
    up: { label: 'Online', className: 'up' },
    down: { label: 'Offline', className: 'down' },
    unknown: { label: 'Onbekend', className: '' },
};

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
}

function formatLatency(ms) {
    if (ms == null || ms < 0) return '—';
    if (ms < 1000) return Math.round(ms) + ' ms';
    return (ms / 1000).toFixed(1) + ' s';
}

function formatCheckedAt(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('nl-NL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch {
        return iso;
    }
}

function iconClass(name) {
    const map = {
        globe: 'fa-globe',
        landmark: 'fa-landmark',
        'user-shield': 'fa-user-shield',
    };
    return map[name] || 'fa-circle';
}

function setBanner(overall, checkedAt, fivem) {
    const banner = document.getElementById('statusBanner');
    const title = document.getElementById('bannerTitle');
    const sub = document.getElementById('bannerSub');
    const meta = document.getElementById('lastChecked');

    banner.className = 'status-banner ' + (overall || 'loading');
    const copy = OVERALL_LABELS[overall] || OVERALL_LABELS.unknown;
    title.textContent = copy.title;
    let subText = copy.sub;
    if (fivem && fivem.status === 'up' && fivem.maxClients != null) {
        subText =
            fivem.clients +
            ' speler' +
            (fivem.clients === 1 ? '' : 's') +
            ' online op FiveM (max ' +
            fivem.maxClients +
            ').';
    } else if (fivem && fivem.status === 'down') {
        subText = 'FiveM-server offline of niet bereikbaar.';
    }
    sub.textContent = subText;
    meta.textContent = 'Laatste check: ' + formatCheckedAt(checkedAt);
}

function renderSites(sites) {
    const list = document.getElementById('statusList');
    if (!sites || !sites.length) {
        list.innerHTML = '<p class="status-footer">Geen websites geconfigureerd in data/sites.json</p>';
        return;
    }

    list.innerHTML = sites
        .map(function (site) {
            const st = SITE_STATUS[site.status] || SITE_STATUS.unknown;
            const maint =
                site.maintenance && site.maintenance.global
                    ? '<span class="status-maint-badge">Onderhoud actief</span>'
                    : '';
            return (
                '<a class="status-card" href="' +
                escapeHtml(site.link) +
                '" target="_blank" rel="noopener">' +
                '<div class="status-card-icon"><i class="fas ' +
                iconClass(site.icon) +
                '"></i></div>' +
                '<div class="status-card-body">' +
                '<h2>' +
                escapeHtml(site.name) +
                '</h2>' +
                '<p>' +
                escapeHtml(site.description) +
                '</p>' +
                maint +
                '</div>' +
                '<div class="status-card-meta">' +
                '<span class="status-pill ' +
                st.className +
                '"><span class="status-dot-sm"></span>' +
                escapeHtml(st.label) +
                '</span>' +
                '<span class="status-latency">' +
                escapeHtml(formatLatency(site.latencyMs)) +
                '</span>' +
                '</div></a>'
            );
        })
        .join('');
}

function renderFivem(fivem) {
    const section = document.getElementById('fivemSection');
    const card = document.getElementById('fivemCard');
    if (!fivem || !fivem.enabled) {
        section.hidden = true;
        return;
    }
    section.hidden = false;

    const st = SITE_STATUS[fivem.status] || SITE_STATUS.unknown;
    const playerLine =
        fivem.status === 'up' && fivem.maxClients != null
            ? fivem.clients + ' / ' + fivem.maxClients + ' spelers'
            : fivem.status === 'up'
              ? fivem.clients + ' speler' + (fivem.clients === 1 ? '' : 's')
              : escapeHtml(fivem.error || 'Offline');

    const metaBits = [];
    if (fivem.hostname) metaBits.push(escapeHtml(fivem.hostname));
    if (fivem.mapname) metaBits.push('Map: ' + escapeHtml(fivem.mapname));
    if (fivem.gametype) metaBits.push(escapeHtml(fivem.gametype));
    metaBits.push(escapeHtml(fivem.host + ':' + fivem.port));

    let playersHtml = '';
    if (fivem.players && fivem.players.length) {
        const rows = fivem.players
            .slice(0, 24)
            .map(function (p) {
                const ping = p.ping != null ? p.ping + ' ms' : '—';
                return (
                    '<li class="fivem-player">' +
                    '<span class="fivem-player-name">' +
                    escapeHtml(p.name) +
                    '</span>' +
                    '<span class="fivem-player-ping">' +
                    escapeHtml(ping) +
                    '</span></li>'
                );
            })
            .join('');
        const more =
            fivem.clients > fivem.players.length
                ? '<li class="fivem-player fivem-player-more">+' +
                  (fivem.clients - fivem.players.length) +
                  ' niet zichtbaar in lijst</li>'
                : '';
        playersHtml =
            '<ul class="fivem-player-list">' +
            rows +
            more +
            '</ul>';
    } else if (fivem.status === 'up' && fivem.clients === 0) {
        playersHtml = '<p class="fivem-empty">Geen spelers online</p>';
    }

    card.innerHTML =
        '<div class="status-card fivem-card">' +
        '<div class="status-card-icon"><i class="fas fa-server"></i></div>' +
        '<div class="status-card-body">' +
        '<h2>' +
        escapeHtml(fivem.name) +
        '</h2>' +
        '<p class="fivem-players-count">' +
        playerLine +
        '</p>' +
        '<p class="fivem-meta">' +
        metaBits.join(' · ') +
        '</p>' +
        playersHtml +
        '<a class="fivem-connect-btn" href="' +
        escapeHtml(fivem.connectUrl) +
        '"><i class="fas fa-play"></i> Verbinden in FiveM</a>' +
        '</div>' +
        '<div class="status-card-meta">' +
        '<span class="status-pill ' +
        st.className +
        '"><span class="status-dot-sm"></span>' +
        escapeHtml(st.label) +
        '</span>' +
        '<span class="status-latency">' +
        escapeHtml(formatLatency(fivem.latencyMs)) +
        '</span></div></div>';
}

async function loadStatus() {
    const errBox = document.getElementById('statusError');
    errBox.classList.remove('show');
    setBanner('loading', null);

    try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Status laden mislukt');

        setBanner(data.overall, data.checkedAt, data.fivem);
        renderFivem(data.fivem);
        renderSites(data.sites);
    } catch (err) {
        setBanner('outage', null, null);
        errBox.textContent = err.message || 'Kon status niet ophalen.';
        errBox.classList.add('show');
        document.getElementById('fivemSection').hidden = true;
        document.getElementById('statusList').innerHTML = '';
    }
}

loadStatus();
setInterval(loadStatus, REFRESH_MS);
