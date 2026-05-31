# URP Status — 4e Vercel-project

Publieke statuspagina voor je drie sites:

| Site | Standaard URL | Check |
|------|----------------|-------|
| Hoofdwebsite | `https://www.utrechtroleplay.eu` | `/api/health` (fallback `/`) |
| Overheid | `https://overheid.utrechtroleplay.eu` | `/api/maintenance` |
| Staff | `https://staff.utrechtroleplay.eu` | `/api/site-data` |
| **FiveM** | `45.116.104.215:30120` | `/dynamic.json` + `/players.json` |

Pas URLs aan in **`data/sites.json`** als je andere domeinen gebruikt (bijv. `*.vercel.app`).

FiveM-config: **`data/fivem.json`** (host, poort, naam). Toont spelers online, max slots, map en ping.

---

## GitHub + Vercel

1. Nieuwe repo, bijv. `utrecht-status` — upload **alleen** deze map.
2. Vercel → **Add New Project** → import repo.
3. **Framework:** Other · **Build:** leeg · **Output:** `.`
4. Deploy.

Optioneel custom domein: `status.utrechtroleplay.eu` (DNS CNAME naar Vercel).

---

## Environment variables (optioneel)

| Variabele | Doel |
|-----------|------|
| `STATUS_URL_MAIN` | Overschrijft alleen de URL van site `main` |
| `STATUS_URL_OVERHEID` | Idem voor `overheid` |
| `STATUS_URL_STAFF` | Idem voor `staff` |
| `STATUS_SITES_JSON` | Volledige JSON-config (overschrijft `data/sites.json`) |
| `FIVEM_HOST` | IP of hostname game server |
| `FIVEM_PORT` | Standaard `30120` |
| `FIVEM_ENABLED` | `false` om FiveM-check uit te zetten |

Geen secrets nodig voor de statuspagina zelf.

**Let op:** je game server moet HTTP op poort 30120 bereikbaar zijn (standaard bij FiveM). Vercel moet die poort kunnen bereiken vanaf het internet.

---

## Discord status-bericht

Zie **`DISCORD.md`**: webhook + embed met websites, FiveM en **spelersbalk** (🟩⬛), elke 5 min automatisch via cron.

API: `/api/discord-status` (2e serverless function — past nog op Hobby).

---

## Lokaal testen

```powershell
cd utrecht-status
npx vercel dev
```

Open `http://localhost:3000` — `/api/status` returned JSON met alle checks.

---

## Hobby-plan

Dit project gebruikt **1** serverless function (`api/status.js`). Geen npm-dependencies.
