# 🚀 Rychlý deployment bez Vercel Cron

## Problém
Vercel Hobby účet neumožňuje cron jobs častěji než 1x denně.

## Řešení
Použijeme pouze API endpointy a externí cron službu.

## Kroky:

### 1. Přejmenujte konfiguraci
```bash
mv vercel.json vercel-with-cron.json
mv vercel-no-cron.json vercel.json
```

### 2. Deploy na Vercel
```bash
vercel --yes
```

### 3. Nastavte environment variables

Po úspěšném deployi:
```bash
# Nebo přes Vercel dashboard
vercel env add MONITORING_TOKEN
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add SUPABASE_ANON_KEY
```

### 4. Nastavte externí cron

#### Možnost A: GitHub Actions (doporučeno)

Ve vašem LMS repozitáři vytvořte `.github/workflows/monitoring.yml`:

```yaml
name: LMS Monitoring
on:
  schedule:
    - cron: '*/5 * * * *'  # Každých 5 minut
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger monitoring
        run: |
          curl -X POST ${{ secrets.MONITORING_URL }}/api/trigger \
            -H "Authorization: Bearer ${{ secrets.MONITORING_TOKEN }}" \
            -f -s -S
```

Přidejte secrets v GitHub:
- `MONITORING_URL`: https://ach-intranet.vercel.app
- `MONITORING_TOKEN`: váš token

#### Možnost B: Cron na produkčním serveru

SSH na server a přidejte do crontab:
```bash
crontab -e

# Přidat:
*/5 * * * * curl -X POST https://ach-intranet.vercel.app/api/trigger -H "Authorization: Bearer YOUR_TOKEN" >/dev/null 2>&1
```

### 5. Test

```bash
# Test trigger endpoint
curl -X POST https://ach-intranet.vercel.app/api/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Zkontrolujte status
curl https://ach-intranet.vercel.app/api/status
```

## Výhody tohoto řešení

✅ Funguje na Hobby účtu  
✅ Flexibilní frekvence kontrol  
✅ Můžete použít více cron služeb jako backup  
✅ Snadná změna frekvence bez re-deploye  

## API Endpointy

- `POST /api/trigger` - Spustí kontrolu (vyžaduje auth)
- `POST /api/check` - Přímá kontrola (vyžaduje auth)  
- `GET /api/status` - Získá aktuální status (public)
- `/status.html` - Veřejná status stránka