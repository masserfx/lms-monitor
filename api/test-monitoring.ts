import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test basic functionality
    const test = {
      env: {
        hasApiKey: !!process.env.API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      timestamp: new Date().toISOString(),
    };
    
    // Test imports
    try {
      const { MonitoringService } = await import('../lib/monitor');
      test.monitoringServiceImport = 'success';
      
      // Test instantiation
      const service = new MonitoringService();
      test.monitoringServiceInstance = 'success';
    } catch (importError) {
      test.monitoringServiceError = importError instanceof Error ? importError.message : 'Unknown import error';
    }
    
    // Test config import
    try {
      const config = await import('../config/monitoring-targets.json');
      test.configImport = 'success';
      test.targetsCount = config.default.targets?.length || 0;
    } catch (configError) {
      test.configError = configError instanceof Error ? configError.message : 'Unknown config error';
    }
    
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}