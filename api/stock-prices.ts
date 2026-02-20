import type { VercelRequest, VercelResponse } from '@vercel/node';
import yahooFinance from 'yahoo-finance2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tickersParam = req.query.tickers;
  if (!tickersParam || typeof tickersParam !== 'string') {
    return res.status(400).json({ error: 'Missing tickers parameter' });
  }

  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  if (tickers.length === 0) {
    return res.status(400).json({ error: 'No valid tickers provided' });
  }
  if (tickers.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 tickers per request' });
  }

  try {
    const prices: Record<string, number> = {};

    // Fetch each ticker individually for type safety
    for (const ticker of tickers) {
      try {
        const quote = await yahooFinance.quote(ticker) as { symbol?: string; regularMarketPrice?: number };
        if (quote?.symbol && quote.regularMarketPrice != null) {
          prices[quote.symbol] = quote.regularMarketPrice;
        }
      } catch {
        // Skip individual ticker failures
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({ prices });
  } catch (error) {
    console.error('Yahoo Finance error:', error);
    return res.status(500).json({ error: 'Failed to fetch stock prices' });
  }
}
