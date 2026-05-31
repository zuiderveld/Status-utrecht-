# Discord status-embed

Eén vast bericht in je Discord-kanaal dat elke **5 minuten** automatisch wordt bijgewerkt (websites + FiveM + spelersbalk).

---

## Stap 1: Webhook maken

1. Discord → je status-kanaal → **Kanaalinstellingen** → **Integraties** → **Webhooks**
2. **Nieuwe webhook** → naam bijv. `URP Status`
3. **Webhook-URL kopiëren**

---

## Stap 2: Vercel environment variables

| Variabele | Waarde |
|-----------|--------|
| `DISCORD_STATUS_WEBHOOK_URL` | Volledige webhook-URL uit Discord (`discord.com` of `canary.discord.com` — beide werken) |
| `DISCORD_STATUS_MESSAGE_ID` | *(eerst leeg)* |
| `CRON_SECRET` | Lang willekeurig wachtwoord *(of leeg laten voor alleen handmatig testen)* |
| `BLOB_READ_WRITE_TOKEN` | **Aanbevolen** — Vercel → Storage → Blob (voor offline-alerts zonder dubbele meldingen) |
| `DISCORD_ALERT_PING` | *(optioneel)* `@here` of `@everyone` bij uitval |
| `STATUS_PAGE_URL` | *(optioneel)* URL van je statuspagina |

**Webhook nooit in GitHub zetten.** Alleen in Vercel. Als de URL gelekt is: in Discord webhook **opnieuw genereren**.

Deploy opnieuw na het opslaan.

---

## Stap 3: Eerste bericht aanmaken

Open in je browser (vervang `JOUW_SECRET`):

```
https://JOUW-STATUS-SITE.vercel.app/api/status?discord=1&secret=JOUW_SECRET
```

(Ook werkend: `/api/discord-status?secret=...` na redeploy met nieuwe `vercel.json`.)

Of met curl:

```powershell
curl.exe "https://JOUW-STATUS-SITE.vercel.app/api/discord-status?secret=JOUW_SECRET"
```

In het JSON-antwoord staat **`messageId`**. Kopieer die naar Vercel:

```
DISCORD_STATUS_MESSAGE_ID=1234567890123456789
```

Redeploy. Daarna wordt **hetzelfde bericht** geüpdatet (geen spam).

---

## Wat staat er in het embed?

- **Overzicht:** groen/geel/rood + tijdstip
- **Velden:** Hoofdwebsite, Overheid, Staff (online/offline + ping)
- **FiveM:** ONLINE/OFFLINE, **spelersbalk** (🟩⬛), `5 / 128`, spelerslijst, join-knop
- **Knoppen:** Statuspagina, Website, FiveM join

---

## Offline-meldingen

Als een **website** of de **FiveM-server** net offline gaat (was online, nu offline), stuurt het systeem een **extra bericht** in hetzelfde kanaal, bijv.:

- `🔴 FiveM server offline`
- `🔴 Hoofdwebsite offline`

Bij herstel (optioneel): `🟢 … weer online`.

Dit werkt betrouwbaar met **`BLOB_READ_WRITE_TOKEN`** (onthoudt vorige status). Zonder Blob kan Vercel tussen runs niets onthouden.

---

## Handmatig verversen

Zelfde URL als stap 3 (met `?secret=` als `CRON_SECRET` staat).

Vercel Cron roept `/api/discord-status` elke 5 minuten aan.

**Geen bericht?** Controleer:

1. `DISCORD_STATUS_WEBHOOK_URL` in Vercel + redeploy  
2. Eén keer `/api/discord-status?secret=...` in de browser (maakt het status-embed)  
3. `DISCORD_STATUS_MESSAGE_ID` invullen na eerste run  
4. Bij `401 Unauthorized`: verkeerd `CRON_SECRET` in de URL  

---

## Optioneel

| Variabele | Doel |
|-----------|------|
| `DISCORD_STATUS_USERNAME` | Bot-naam boven het bericht |
| `DISCORD_STATUS_AVATAR_URL` | Avatar-URL van de webhook |
