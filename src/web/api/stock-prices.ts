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

    const results = await yahooFinance.quote(tickers);
    const quotesArray = Array.isArray(results) ? results : [results];

    for (const quote of quotesArray) {
      if (quote && quote.symbol && quote.regularMarketPrice != null) {
        prices[quote.symbol] = quote.regularMarketPrice;
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({ prices });
  } catch (error) {
    console.error('Yahoo Finance error:', error);
    return res.status(500).json({ error: 'Failed to fetch stock prices' });
  }
}
