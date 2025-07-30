import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MonitoringService, MonitoringTarget } from '../lib/monitor';
import { AlertService } from '../lib/alerts';
import monitoringTargetsJson from '../config/monitoring-targets.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
  // Verify cron secret or API token
  const authHeader = req.headers.authorization;
  const apiKey = authHeader?.replace('Bearer ', '');
  
  // Accept either API key or Vercel cron signature
  const isAuthorized = (apiKey && apiKey === process.env.API_KEY) || 
                       req.headers['x-vercel-signature'] === process.env.CRON_SECRET;
  
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const monitoringService = new MonitoringService();
  const alertService = new AlertService();
  const results = [];

  // Type-safe targets
  const monitoringTargets = monitoringTargetsJson.targets as MonitoringTarget[];

  // Check all targets
  for (const target of monitoringTargets) {
    try {
      // Replace environment variables in headers
      if (target.headers) {
        const processedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(target.headers)) {
          if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
            const envVar = value.slice(2, -1);
            processedHeaders[key] = process.env[envVar] || '';
          } else {
            processedHeaders[key] = String(value);
          }
        }
        target.headers = processedHeaders;
      }

      const result = await monitoringService.checkEndpoint(target);
      results.push(result);

      // Save result to database
      await monitoringService.saveResult(result);

      // Check if we need to send alerts
      if (target.alerts.enabled) {
        const shouldAlert = result.status === 'unhealthy'
          ? await monitoringService.checkFailureCount(target.name, target.alerts.failureThreshold)
          : target.alerts.successThreshold 
            ? await monitoringService.checkSuccessCount(target.name, target.alerts.successThreshold)
            : false;

        if (shouldAlert) {
          await alertService.sendAlert({
            channels: target.alerts.channels as ("email" | "slack" | "discord")[],
            targetName: target.name,
            result,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to check ${target.name}:`, error);
    }
  }

  res.status(200).json({
    checked: results.length,
    results: results.map(r => ({
      target: r.target,
      status: r.status,
      responseTime: r.responseTime,
    })),
  });
  } catch (error) {
    console.error('Check endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}