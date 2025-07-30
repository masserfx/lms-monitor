import type { VercelRequest, VercelResponse } from '@vercel/node';

// Manual trigger endpoint for monitoring checks
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify API token
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!authToken || authToken !== process.env.MONITORING_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Import and execute the check function
    const checkHandler = await import('./check');
    
    // Create a mock request with cron signature
    const mockReq = {
      ...req,
      headers: {
        ...req.headers,
        'x-vercel-signature': process.env.CRON_SECRET || 'manual-trigger'
      }
    };

    // Execute the check
    await checkHandler.default(mockReq as any, res);
  } catch (error) {
    console.error('Manual trigger failed:', error);
    res.status(500).json({ 
      error: 'Failed to trigger monitoring check',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}