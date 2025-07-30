import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.replace('Bearer ', '');
    
    const debug = {
      authHeader: authHeader ? 'present' : 'missing',
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
      envApiKey: process.env.API_KEY ? `${process.env.API_KEY.substring(0, 8)}...` : 'missing',
      match: apiKey === process.env.API_KEY,
      method: req.method,
      headers: Object.keys(req.headers)
    };
    
    res.status(200).json(debug);
  } catch (error) {
    res.status(500).json({ 
      error: 'Debug error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}