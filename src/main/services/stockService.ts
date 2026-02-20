import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function fetchStockQuotes(tickers: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (tickers.length === 0) return prices;

  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const quote = await yahooFinance.quote(ticker);
      const price = (quote as Record<string, unknown>).regularMarketPrice as number | undefined;
      return { ticker, price: price ?? 0 };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.price > 0) {
      prices.set(result.value.ticker, result.value.price);
    }
  }

  return prices;
}
