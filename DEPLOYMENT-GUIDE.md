# 🚀 Deployment Guide pro LMS Monitor

## Problém s Vercel Hobby účtem

Vercel Hobby účet podporuje pouze **denní cron jobs**. Náš monitoring potřebuje častější kontroly.

## Řešení: Hybrid monitoring

1. **Vercel cron** - 4x denně (každých 6 hodin)
2. **Externí trigger** - pro častější kontroly

## Deployment kroky:

### 1. Deploy na Vercel

```bash
cd /Users/lhradek/code/lms/lms-monitor
vercel --yes
```

### 2. Nastavení environment variables

Ve Vercel dashboardu (https://vercel.com/masserfxs-projects/ach-intranet/settings/environment-variables):

```
MONITORING_TOKEN=<vygenerujte-silny-token>
SUPABASE_URL=https://qxykpnjdxsjocmgqvqrq.supabase.co
SUPABASE_SERVICE_KEY=<vas-service-key>
SUPABASE_ANON_KEY=<vas-anon-key>
SLACK_WEBHOOK_URL=<optional>
DISCORD_WEBHOOK_URL=<optional>
EMAIL_FROM=monitoring@achacademy.cz
EMAIL_TO=admin@achacademy.cz
SENDGRID_API_KEY=<optional>
```

### 3. Nastavení externího cron (cron-job.org)

1. Registrace na https://cron-job.org (zdarma)
2. Vytvořit nový job:
   - **URL**: `https://ach-intranet.vercel.app/api/trigger`
   - **Schedule**: Every 5 minutes
   - **Method**: POST
   - **Headers**: 
     ```
     Authorization: Bearer <MONITORING_TOKEN>
     Content-Type: application/json
     ```

### 4. Update LMS environment

V souboru `.env.local` vašeho LMS projektu přidejte:

```
NEXT_PUBLIC_MONITORING_URL=https://ach-intranet.vercel.app
```

### 5. Vytvoření databázové tabulky

V Supabase SQL editoru spusťte migrace z:
`/supabase/migrations/20250130_monitoring_system.sql`

### 6. Test

1. Otevřete: https://ach-intranet.vercel.app/status.html
2. V LMS admin: /admin/monitoring
3. Manuální test: 
   ```bash
   curl -X POST https://ach-intranet.vercel.app/api/trigger \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json"
   ```

## Monitorované endpointy

Aktuálně se monitorují:
- LMS Production Health Check
- LMS Production Database
- LMS Production Homepage
- Supabase API

Pro úpravu viz `/config/monitoring-targets.json`

## Troubleshooting

- **401 Unauthorized**: Zkontrolujte MONITORING_TOKEN
- **Supabase chyby**: Ověřte SUPABASE_SERVICE_KEY
- **Cron nefunguje**: Zkontrolujte logs ve Vercel dashboard