# Alternativy pro častější monitoring

Vzhledem k omezení Vercel Hobby účtu (pouze 1 cron job denně), zde jsou alternativy pro častější monitoring:

## 1. Externí Cron služby (DOPORUČENO)

### Použití cron-job.org (ZDARMA)
1. Registrujte se na https://cron-job.org
2. Vytvořte nový cron job:
   - URL: `https://ach-intranet.vercel.app/api/trigger`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_MONITORING_TOKEN`
   - Schedule: Každých 5 minut

### Použití UptimeRobot (ZDARMA)
1. Registrujte se na https://uptimerobot.com
2. Přidejte HTTP(s) monitor:
   - URL: `https://ach-intranet.vercel.app/api/trigger`
   - Monitoring interval: 5 minutes
   - HTTP Method: POST
   - Request Headers: `Authorization: Bearer YOUR_MONITORING_TOKEN`

## 2. GitHub Actions (ZDARMA)

Vytvořte `.github/workflows/monitoring.yml`:

```yaml
name: Trigger Monitoring
on:
  schedule:
    - cron: '*/5 * * * *'  # Každých 5 minut
  workflow_dispatch:  # Manuální spuštění

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger monitoring check
        run: |
          curl -X POST https://ach-intranet.vercel.app/api/trigger \
            -H "Authorization: Bearer ${{ secrets.MONITORING_TOKEN }}" \
            -H "Content-Type: application/json"
```

## 3. Vlastní cron na produkčním serveru

Přidejte do crontab na serveru:

```bash
# Editace crontab
crontab -e

# Přidat řádek:
*/5 * * * * curl -X POST https://ach-intranet.vercel.app/api/trigger -H "Authorization: Bearer YOUR_TOKEN" >/dev/null 2>&1
```

## 4. Monitoring služby s webhooks

### Better Uptime (30 dnů zdarma)
- https://betteruptime.com
- Podporuje webhooks při selhání
- Vlastní status page

### Freshping (50 monitors zdarma)
- https://www.freshworks.com/website-monitoring/
- Multi-location monitoring
- Slack/Email integrace

## Doporučení

Pro váš use case doporučuji:

1. **Rychlé řešení**: Použít cron-job.org pro spouštění `/api/trigger` každých 5 minut
2. **Dlouhodobé řešení**: GitHub Actions pro spolehlivost a verzování
3. **Profesionální řešení**: Upgrade na Vercel Pro ($20/měsíc) pro neomezené cron jobs

## Aktuální nastavení

Vercel cron je nastaven na každých 6 hodin (4x denně):
- 00:00, 06:00, 12:00, 18:00

Pro častější monitoring použijte jednu z výše uvedených alternativ.