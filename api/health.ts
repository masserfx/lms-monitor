import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Simple health check
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasApiKey: !!process.env.API_KEY,
      }
    };
    
    // Test Supabase connection
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        const { error } = await supabase.from('monitoring_results').select('count').limit(1);
        healthCheck.database = error ? 'error' : 'connected';
        if (error) {
          healthCheck.databaseError = error.message;
        }
      } catch (dbError) {
        healthCheck.database = 'error';
        healthCheck.databaseError = dbError instanceof Error ? dbError.message : 'Unknown error';
      }
    }
    
    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}