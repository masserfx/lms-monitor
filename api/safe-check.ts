import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MonitoringService, MonitoringTarget } from '../lib/monitor';
import monitoringTargetsJson from '../config/monitoring-targets.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify API token
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.replace('Bearer ', '');
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const monitoringService = new MonitoringService();
    const results = [];
    const errors = [];

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
        try {
          await monitoringService.saveResult(result);
        } catch (dbError) {
          console.error(`Failed to save result for ${target.name}:`, dbError);
          errors.push({
            target: target.name,
            error: 'Database save failed',
            message: dbError instanceof Error ? dbError.message : 'Unknown error'
          });
        }
      } catch (error) {
        console.error(`Failed to check ${target.name}:`, error);
        errors.push({
          target: target.name,
          error: 'Check failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.status(200).json({
      success: true,
      checked: results.length,
      failed: errors.length,
      results: results.map(r => ({
        target: r.target,
        status: r.status,
        responseTime: r.responseTime,
      })),
      errors: errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Safe check endpoint error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}