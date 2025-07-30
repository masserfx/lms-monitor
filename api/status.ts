import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import monitoringTargets from '../config/monitoring-targets.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow public access for status page
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get latest status for each target
    const statusPromises = monitoringTargets.targets.map(async (target) => {
      const { data, error } = await supabase
        .from('monitoring_results')
        .select('*')
        .eq('target_name', target.name)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return {
          name: target.name,
          group: target.group,
          status: 'unknown',
          lastChecked: null,
          responseTime: null,
          uptime: 0,
        };
      }

      // Calculate uptime for last 24 hours
      const { data: uptimeData } = await supabase
        .from('monitoring_results')
        .select('status')
        .eq('target_name', target.name)
        .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const uptime = uptimeData
        ? (uptimeData.filter(r => r.status === 'healthy').length / uptimeData.length) * 100
        : 0;

      return {
        name: target.name,
        group: target.group,
        status: data.status,
        lastChecked: data.checked_at,
        responseTime: data.response_time_ms,
        uptime: uptime.toFixed(2),
        error: data.error_message,
      };
    });

    const services = await Promise.all(statusPromises);

    // Get historical data for last 24 hours
    const { data: historyData } = await supabase
      .from('monitoring_results')
      .select('target_name, response_time_ms, checked_at')
      .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: true });

    res.status(200).json({
      services,
      history: historyData || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
}