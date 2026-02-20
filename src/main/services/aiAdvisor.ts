/**
 * AI Financial Advisor Service
 * Gathers all portfolio data and sends to Anthropic API for analysis.
 */

import { getAllRealEstate } from '../database/repositories/realEstateRepo';
import { getAllStocks } from '../database/repositories/stockRepo';
import { getAllCrypto } from '../database/repositories/cryptoRepo';
import { getAllRetirement } from '../database/repositories/retirementRepo';
import { getAllDebts } from '../database/repositories/debtRepo';
import { getAllCashFlow } from '../database/repositories/cashFlowRepo';
import { getSetting } from '../database/repositories/settingsRepo';
import { createAnalysis, getAllAnalyses } from '../database/repositories/aiAnalysisRepo';

const MODEL = 'claude-sonnet-4-20250514';

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY not set. Add it to your .env file.');
  return key;
}

function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 52 / 12;
    case 'biweekly': return amount * 26 / 12;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

function buildPortfolioSnapshot() {
  const realEstate = getAllRealEstate();
  const stocks = getAllStocks();
  const crypto = getAllCrypto();
  const retirement = getAllRetirement();
  const debts = getAllDebts();
  const cashFlowItems = getAllCashFlow();
  const age = getSetting('age');

  const totalRealEstateEquity = realEstate.reduce((s, p) => s + (p.estimatedValue - p.mortgageBalance), 0);
  const totalStocks = stocks.reduce((s, st) => s + st.shares * (st.currentPrice ?? st.costBasisPerShare), 0);
  const totalCrypto = crypto.reduce((s, c) => s + c.quantity * (c.currentPrice ?? c.costBasisPerUnit), 0);
  const totalRetirement = retirement.reduce((s, r) => s + r.balance, 0);
  const totalDebts = debts.reduce((s, d) => s + d.currentBalance, 0);
  const netWorth = totalRealEstateEquity + totalStocks + totalCrypto + totalRetirement - totalDebts;

  // Cash flow
  const activeFlow = cashFlowItems.filter(i => i.isActive);
  const monthlyIncome = activeFlow
    .filter(i => i.flowType === 'income')
    .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyExpenses = activeFlow
    .filter(i => i.flowType === 'expense')
    .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  // Auto expenses from debts and mortgages
  const autoDebtExpenses = debts.reduce((s, d) => s + (d.monthlyPayment ?? d.minimumPayment), 0);
  const autoMortgageExpenses = realEstate.reduce((s, p) => s + (p.monthlyMortgagePayment ?? 0), 0);
  const totalMonthlyExpenses = monthlyExpenses + autoDebtExpenses + autoMortgageExpenses;
  const freeCashPerMonth = monthlyIncome - totalMonthlyExpenses;

  return {
    age: age ? parseInt(age) : null,
    summary: {
      netWorth,
      totalRealEstateEquity,
      totalStocks,
      totalCrypto,
      totalRetirement,
      totalDebts,
      monthlyIncome,
      totalMonthlyExpenses,
      freeCashPerMonth,
    },
    realEstate: realEstate.map(p => ({
      name: p.name,
      address: p.address,
      type: p.propertyType,
      estimatedValue: p.estimatedValue,
      mortgageBalance: p.mortgageBalance,
      monthlyPayment: p.monthlyMortgagePayment,
      equity: p.estimatedValue - p.mortgageBalance,
    })),
    stocks: stocks.map(s => ({
      name: s.name,
      ticker: s.ticker,
      shares: s.shares,
      costBasis: s.costBasisPerShare,
      currentPrice: s.currentPrice,
      value: s.shares * (s.currentPrice ?? s.costBasisPerShare),
      gainLoss: s.currentPrice ? (s.currentPrice - s.costBasisPerShare) * s.shares : 0,
      gainLossPct: s.currentPrice && s.costBasisPerShare > 0
        ? ((s.currentPrice - s.costBasisPerShare) / s.costBasisPerShare * 100)
        : 0,
    })),
    crypto: crypto.map(c => ({
      name: c.name,
      symbol: c.symbol,
      quantity: c.quantity,
      costBasis: c.costBasisPerUnit,
      currentPrice: c.currentPrice,
      value: c.quantity * (c.currentPrice ?? c.costBasisPerUnit),
      gainLoss: c.currentPrice ? (c.currentPrice - c.costBasisPerUnit) * c.quantity : 0,
      notes: c.notes,
    })),
    retirement: retirement.map(r => ({
      name: r.name,
      type: r.accountType,
      institution: r.institution,
      balance: r.balance,
      contributions: r.contributions,
      growth: r.contributions ? r.balance - r.contributions : null,
    })),
    debts: debts.map(d => ({
      name: d.name,
      type: d.debtType,
      lender: d.lender,
      originalBalance: d.originalBalance,
      currentBalance: d.currentBalance,
      interestRate: d.interestRate,
      minimumPayment: d.minimumPayment,
      monthlyPayment: d.monthlyPayment,
      notes: d.notes,
    })),
    cashFlow: cashFlowItems.filter(i => i.isActive).map(i => ({
      name: i.name,
      type: i.flowType,
      category: i.category,
      amount: i.amount,
      frequency: i.frequency,
      monthlyAmount: toMonthly(i.amount, i.frequency),
    })),
  };
}

const SYSTEM_PROMPT = `You are a personal financial advisor analyzing a user's complete portfolio. Be specific, actionable, and personalized — reference their actual holdings by name, ticker, and dollar amounts. Structure your response with clear sections using markdown headers.

The data includes their age (if provided), all assets, debts, and monthly cash flow (income, expenses, free cash). Use their age to tailor advice for their life stage:
- Under 30: Can afford more risk, emphasize growth, maximize retirement contributions early for compounding
- 30-45: Balance growth with stability, ensure adequate insurance and emergency fund, plan for major expenses
- 45-60: Shift toward capital preservation, catch-up retirement contributions, reduce high-risk positions
- Over 60: Focus on income generation, minimize volatility, plan for withdrawal strategies

Your analysis should cover:
1. **Portfolio Overview** — Quick health check: net worth, monthly cash flow, savings rate, and how they compare for their age
2. **Asset Allocation Assessment** — Are they properly diversified for their age? What's overweight/underweight?
3. **Cash Flow Analysis** — How is their free cash being deployed? Are they saving enough? Where can they optimize spending?
4. **Debt Strategy** — Should they pay down debt or invest? Which debts to prioritize and why. If they have DeFi loans (Morpho, Aave, etc.), warn about liquidation risks.
5. **Investment Recommendations** — Where should they invest next? Be specific about asset classes, sectors, or strategies appropriate for their age and situation.
6. **Risk Warnings** — Red flags, concentration risks, or urgent issues to address
7. **Action Items** — Top 3-5 concrete next steps, ranked by priority

Be direct and honest. If something is risky, say so clearly. Use dollar amounts and percentages from their actual data. Don't give generic advice — make every recommendation specific to their portfolio, age, and cash flow.`;

export async function analyzePortfolio(): Promise<{ id: string; createdAt: string; response: string }> {
  const apiKey = getApiKey();
  const snapshot = buildPortfolioSnapshot();
  const snapshotJson = JSON.stringify(snapshot, null, 2);

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is my complete financial portfolio as of ${new Date().toLocaleDateString()}:\n\n\`\`\`json\n${snapshotJson}\n\`\`\`\n\nPlease analyze my portfolio and give me personalized financial advice.`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Anthropic API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const responseText = data.content?.[0]?.text ?? 'No response received.';

  // Save to database
  const saved = createAnalysis({
    model: MODEL,
    portfolioSnapshot: snapshotJson,
    response: responseText,
  });

  return { id: saved.id, createdAt: saved.createdAt, response: responseText };
}

export function getPortfolioPrompt(): string {
  const snapshot = buildPortfolioSnapshot();
  const snapshotJson = JSON.stringify(snapshot, null, 2);
  return `${SYSTEM_PROMPT}\n\nHere is my complete financial portfolio as of ${new Date().toLocaleDateString()}:\n\n\`\`\`json\n${snapshotJson}\n\`\`\`\n\nPlease analyze my portfolio and give me personalized financial advice.`;
}

export function getAnalysisHistory() {
  return getAllAnalyses();
}
