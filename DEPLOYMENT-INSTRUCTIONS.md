# 📋 Deployment Instructions - LMS Monitor

## 1. Deploy na Vercel

```bash
cd /Users/lhradek/code/lms/lms-monitor
vercel --yes
```

Při prvním deployi budete dotázáni na environment variables. Můžete je přeskočit (Enter) a nastavit později.

## 2. Získejte URL vaší aplikace

Po úspěšném deployi uvidíte něco jako:
```
🔗  Preview: https://ach-intranet-xxx.vercel.app
```

## 3. Nastavte Environment Variables

### Možnost A: Přes Vercel CLI
```bash
# Vygenerujte silný token (např. 32 znaků)
openssl rand -hex 32

# Nastavte proměnné
vercel env add MONITORING_TOKEN production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add SUPABASE_ANON_KEY production
```

### Možnost B: Přes Vercel Dashboard
1. Jděte na: https://vercel.com/masserfxs-projects/ach-intranet/settings/environment-variables
2. Přidejte:
   - `MONITORING_TOKEN` - vygenerovaný token
   - `SUPABASE_URL` - vaše Supabase URL
   - `SUPABASE_SERVICE_KEY` - service role key
   - `SUPABASE_ANON_KEY` - anon key

## 4. Vytvořte databázovou tabulku

V Supabase SQL editoru:

```sql
-- Create monitoring results table
CREATE TABLE IF NOT EXISTS monitoring_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy')),
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_monitoring_results_target_checked 
ON monitoring_results(target_name, checked_at DESC);

-- Enable RLS
ALTER TABLE monitoring_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read" ON monitoring_results
FOR SELECT USING (true);

CREATE POLICY "Allow service insert" ON monitoring_results
FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

## 5. Nastavte GitHub Actions

V GitHub repozitáři vašeho LMS projektu:

1. Jděte na: Settings → Secrets and variables → Actions
2. Přidejte secrets:
   - `MONITORING_URL`: https://ach-intranet.vercel.app (nebo vaše URL)
   - `MONITORING_TOKEN`: stejný token jako v kroku 3

## 6. Update LMS Environment

V souboru `/Users/lhradek/code/lms/saas-app/.env.local`:
```
NEXT_PUBLIC_MONITORING_URL=https://ach-intranet.vercel.app
```

## 7. Test

### Test API:
```bash
# Nahraďte YOUR_TOKEN a YOUR_URL
curl -X POST https://ach-intranet.vercel.app/api/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Zkontrolujte:
- Status page: https://ach-intranet.vercel.app/status.html
- LMS admin: http://localhost:3000/admin/monitoring

## 8. Commit a push změn

```bash
cd /Users/lhradek/code/lms/saas-app
git add .github/workflows/monitoring.yml
git add app/[locale]/admin/monitoring/
git add components/admin/VercelMonitoringDashboard.tsx
git add app/api/health/db/route.ts
git add supabase/migrations/20250130_monitoring_system.sql
git commit -m "feat: Add monitoring system with Vercel and GitHub Actions"
git push
```

## Troubleshooting

- **401 Unauthorized**: Zkontrolujte MONITORING_TOKEN
- **Database errors**: Ověřte SUPABASE_SERVICE_KEY a že tabulka existuje
- **GitHub Actions nefunguje**: Zkontrolujte Secrets v repozitáři
- **No data v dashboard**: Počkejte 5 minut na první spuštění