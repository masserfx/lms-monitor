import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Test endpoint to verify environment variables
  res.status(200).json({
    status: 'ok',
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasApiKey: !!process.env.API_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
    },
    timestamp: new Date().toISOString(),
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'x-vercel-signature': req.headers['x-vercel-signature'] ? 'present' : 'missing',
    }
  });
}