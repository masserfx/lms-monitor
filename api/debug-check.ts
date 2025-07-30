import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.replace('Bearer ', '');
    
    const debug = {
      authHeader: authHeader ? 'present' : 'missing',
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'missing',
      envApiKey: process.env.API_KEY ? `${process.env.API_KEY.substring(0, 8)}...${process.env.API_KEY.substring(process.env.API_KEY.length - 4)}` : 'missing',
      match: apiKey === process.env.API_KEY,
      apiKeyLength: apiKey?.length,
      envApiKeyLength: process.env.API_KEY?.length,
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