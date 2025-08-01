import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const MonitoringTargetSchema = z.object({
  name: z.string(),
  group: z.string(),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  interval: z.number(),
  conditions: z.object({
    status: z.number(),
    responseTime: z.number(),
    body: z.any().optional(),
    bodyContains: z.string().optional(),
  }),
  alerts: z.object({
    enabled: z.boolean(),
    channels: z.array(z.enum(['email', 'slack', 'discord'])),
    failureThreshold: z.number(),
    successThreshold: z.number().optional(),
  }),
});

export type MonitoringTarget = z.infer<typeof MonitoringTargetSchema>;

export interface CheckResult {
  target: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  statusCode: number;
  error?: string;
  timestamp: Date;
}

export class MonitoringService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async checkEndpoint(target: MonitoringTarget): Promise<CheckResult> {
    const startTime = Date.now();
    const result: CheckResult = {
      target: target.name,
      status: 'unhealthy',
      responseTime: 0,
      statusCode: 0,
      timestamp: new Date(),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(target.url, {
        method: 'GET',
        headers: {
          ...target.headers,
          'User-Agent': 'LMS-Monitor/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;

      // Check status code
      if (response.status !== target.conditions.status) {
        result.error = `Expected status ${target.conditions.status}, got ${response.status}`;
        return result;
      }

      // Check response time
      if (result.responseTime > target.conditions.responseTime) {
        result.error = `Response time ${result.responseTime}ms exceeds threshold ${target.conditions.responseTime}ms`;
        return result;
      }

      // Check body content if specified
      if (target.conditions.body || target.conditions.bodyContains) {
        const bodyText = await response.text();
        
        if (target.conditions.bodyContains && !bodyText.includes(target.conditions.bodyContains)) {
          result.error = `Body does not contain expected text: ${target.conditions.bodyContains}`;
          return result;
        }

        if (target.conditions.body) {
          try {
            const bodyJson = JSON.parse(bodyText);
            for (const [key, value] of Object.entries(target.conditions.body)) {
              if (bodyJson[key] !== value) {
                result.error = `Body validation failed: ${key} expected ${value}, got ${bodyJson[key]}`;
                return result;
              }
            }
          } catch (e) {
            result.error = 'Failed to parse response body as JSON';
            return result;
          }
        }
      }

      result.status = 'healthy';
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  async saveResult(result: CheckResult): Promise<void> {
    try {
      await this.supabase.from('monitoring_results').insert({
        target_name: result.target,
        status: result.status,
        response_time_ms: result.responseTime,
        status_code: result.statusCode,
        error_message: result.error,
        checked_at: result.timestamp,
      });
    } catch (error) {
      console.error('Failed to save monitoring result:', error);
    }
  }

  async checkFailureCount(targetName: string, threshold: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('monitoring_results')
      .select('status')
      .eq('target_name', targetName)
      .order('checked_at', { ascending: false })
      .limit(threshold);

    if (error || !data) return false;

    // Check if all recent checks failed
    return data.length >= threshold && data.every(r => r.status === 'unhealthy');
  }

  async checkSuccessCount(targetName: string, threshold: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('monitoring_results')
      .select('status')
      .eq('target_name', targetName)
      .order('checked_at', { ascending: false })
      .limit(threshold);

    if (error || !data) return false;

    // Check if all recent checks succeeded
    return data.length >= threshold && data.every(r => r.status === 'healthy');
  }
}