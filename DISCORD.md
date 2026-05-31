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
| `DISCORD_STATUS_WEBHOOK_URL` | De volledige webhook-URL |
| `DISCORD_STATUS_MESSAGE_ID` | *(eerst leeg)* |
| `CRON_SECRET` | Zelf een lang willekeurig wachtwoord |
| `STATUS_PAGE_URL` | *(optioneel)* URL van je statuspagina |

Deploy opnieuw na het opslaan.

---

## Stap 3: Eerste bericht aanmaken

Open in je browser (vervang `JOUW_SECRET`):

```
https://JOUW-STATUS-SITE.vercel.app/api/discord-status?secret=JOUW_SECRET
```

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

## Handmatig verversen

Zelfde URL als stap 3 (met `?secret=`).

Vercel Cron roept `/api/discord-status` elke 5 minuten aan (met `Authorization: Bearer CRON_SECRET` als die env is gezet).

---

## Optioneel

| Variabele | Doel |
|-----------|------|
| `DISCORD_STATUS_USERNAME` | Bot-naam boven het bericht |
| `DISCORD_STATUS_AVATAR_URL` | Avatar-URL van de webhook |
