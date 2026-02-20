/**
 * Insights Engine
 * ---------------
 * Analyzes the full portfolio (assets + debts) and generates actionable
 * financial optimization recommendations.
 *
 * Categories:
 *  1. Debt payoff strategy (avalanche vs snowball)
 *  2. Leverage analysis (asset returns vs debt interest)
 *  3. Portfolio health metrics (debt-to-asset ratio, diversification)
 *  4. Cash flow optimization
 */

import { getAllRealEstate } from '../database/repositories/realEstateRepo';
import { getAllStocks } from '../database/repositories/stockRepo';
import { getAllCrypto } from '../database/repositories/cryptoRepo';
import { getAllRetirement } from '../database/repositories/retirementRepo';
import { getAllDebts } from '../database/repositories/debtRepo';
import { getSetting } from '../database/repositories/settingsRepo';

export interface Insight {
  id: string;
  category: 'debt_payoff' | 'leverage' | 'portfolio_health' | 'cash_flow' | 'opportunity';
  severity: 'info' | 'warning' | 'critical' | 'positive';
  title: string;
  description: string;
  impact?: string;
}

export interface DebtPayoffPlan {
  method: 'avalanche' | 'snowball';
  order: Array<{
    name: string;
    balance: number;
    rate: number;
    minimumPayment: number;
  }>;
  totalInterestSaved?: number;
  monthsToPayoff?: number;
  totalMonthlyMinimum: number;
}

export interface InsightsReport {
  generatedAt: string;
  insights: Insight[];
  debtPayoff: {
    avalanche: DebtPayoffPlan;
    snowball: DebtPayoffPlan;
  } | null;
  metrics: {
    totalAssets: number;
    totalDebts: number;
    netWorth: number;
    debtToAssetRatio: number;
    weightedAvgDebtRate: number;
    monthlyDebtPayments: number;
    highInterestDebtTotal: number;
    goodDebtTotal: number;
    badDebtTotal: number;
    goodDebtMonthly: number;
    badDebtMonthly: number;
  };
}

let counter = 0;
function nextId(): string {
  return `insight-${++counter}`;
}

// Good debt: builds wealth or appreciates (mortgages, student loans under ~7%)
// Bad debt: depreciating or high-rate (credit cards, personal loans, high-rate anything)
const GOOD_DEBT_TYPES = new Set(['mortgage', 'student_loan']);
function isGoodDebt(debtType: string, interestRate: number): boolean {
  if (debtType === 'mortgage') return true;
  if (debtType === 'student_loan' && interestRate <= 7) return true;
  return false;
}

export function generateInsights(): InsightsReport {
  counter = 0;
  const realEstate = getAllRealEstate();
  const stocks = getAllStocks();
  const crypto = getAllCrypto();
  const retirement = getAllRetirement();
  const debts = getAllDebts();

  // Compute totals
  const totalRealEstate = realEstate.reduce((s, p) => s + p.estimatedValue, 0);
  const totalRealEstateEquity = realEstate.reduce((s, p) => s + (p.estimatedValue - p.mortgageBalance), 0);
  const totalStocks = stocks.reduce((s, st) => s + st.shares * (st.currentPrice ?? st.costBasisPerShare), 0);
  const totalCrypto = crypto.reduce((s, c) => s + c.quantity * (c.currentPrice ?? c.costBasisPerUnit), 0);
  const totalRetirement = retirement.reduce((s, r) => s + r.balance, 0);
  const totalAssets = totalRealEstateEquity + totalStocks + totalCrypto + totalRetirement;

  // Include mortgages from real estate as debt obligations
  const totalMortgageBalances = realEstate.reduce((s, p) => s + p.mortgageBalance, 0);
  const monthlyMortgagePayments = realEstate.reduce((s, p) => s + (p.monthlyMortgagePayment ?? 0), 0);

  // All debt = debts table + mortgage balances from real estate
  const totalDebtsOnly = debts.reduce((s, d) => s + d.currentBalance, 0);
  const totalDebts = totalDebtsOnly; // Net worth already accounts for mortgages via equity calc
  const totalAllObligations = totalDebtsOnly + totalMortgageBalances;
  const netWorth = totalAssets - totalDebts;

  // Good vs bad debt classification
  const badDebts = debts.filter(d => !isGoodDebt(d.debtType, d.interestRate));
  const goodDebtsFromTable = debts.filter(d => isGoodDebt(d.debtType, d.interestRate));

  const badDebtTotal = badDebts.reduce((s, d) => s + d.currentBalance, 0);
  const goodDebtTotal = goodDebtsFromTable.reduce((s, d) => s + d.currentBalance, 0) + totalMortgageBalances;
  const badDebtMonthly = badDebts.reduce((s, d) => s + (d.monthlyPayment ?? d.minimumPayment), 0);
  const goodDebtMonthly = goodDebtsFromTable.reduce((s, d) => s + (d.monthlyPayment ?? d.minimumPayment), 0) + monthlyMortgagePayments;

  // Weighted avg rate across all obligations (debts + mortgages)
  // Estimate mortgage rate from payments if available, otherwise assume ~6%
  const totalAllDebtBalance = totalDebtsOnly + totalMortgageBalances;
  const debtWeightedSum = debts.reduce((s, d) => s + d.interestRate * d.currentBalance, 0);
  // Rough mortgage rate estimate: use 6% default since we don't track mortgage rates
  const mortgageWeightedSum = totalMortgageBalances * 6;
  const weightedAvgDebtRate = totalAllDebtBalance > 0
    ? (debtWeightedSum + mortgageWeightedSum) / totalAllDebtBalance
    : 0;

  const monthlyDebtPayments = debts.reduce((s, d) => s + (d.monthlyPayment ?? d.minimumPayment), 0) + monthlyMortgagePayments;
  const highInterestDebts = debts.filter(d => d.interestRate >= 10);
  const highInterestDebtTotal = highInterestDebts.reduce((s, d) => s + d.currentBalance, 0);

  const debtToAssetRatio = totalAssets > 0 ? totalAllObligations / totalAssets : 0;

  const insights: Insight[] = [];

  // --- Good vs Bad Debt Overview ---
  if (totalAllObligations > 0) {
    if (badDebtTotal > 0 && goodDebtTotal > 0) {
      insights.push({
        id: nextId(),
        category: 'debt_payoff',
        severity: badDebtTotal > goodDebtTotal ? 'warning' : 'info',
        title: `${formatUsd(badDebtTotal)} bad debt vs ${formatUsd(goodDebtTotal)} good debt`,
        description: `Bad debt (credit cards, personal loans, high-rate): ${formatUsd(badDebtTotal)} costing ${formatUsd(badDebtMonthly)}/mo. Good debt (mortgages, low-rate student loans): ${formatUsd(goodDebtTotal)} costing ${formatUsd(goodDebtMonthly)}/mo. Focus on eliminating bad debt first — good debt builds equity or is tax-advantaged.`,
      });
    } else if (badDebtTotal > 0) {
      insights.push({
        id: nextId(),
        category: 'debt_payoff',
        severity: 'warning',
        title: `All ${formatUsd(badDebtTotal)} of your debt is high-cost`,
        description: `You have ${formatUsd(badDebtTotal)} in bad debt costing ${formatUsd(badDebtMonthly)}/mo. Prioritize paying this off aggressively before investing.`,
      });
    } else if (goodDebtTotal > 0 && badDebtTotal === 0) {
      insights.push({
        id: nextId(),
        category: 'debt_payoff',
        severity: 'positive',
        title: 'Only good debt — no high-cost liabilities',
        description: `Your ${formatUsd(goodDebtTotal)} in debt is all low-rate mortgages/student loans (${formatUsd(goodDebtMonthly)}/mo). This debt builds equity or is tax-advantaged. No need to aggressively pay it off — investing likely earns more.`,
      });
    }
  }

  // --- Debt Payoff Insights ---

  if (debts.length > 0) {
    // High interest debt warning
    if (highInterestDebtTotal > 0) {
      const highRateDebts = highInterestDebts.map(d => `${d.name} (${d.interestRate}%)`).join(', ');
      insights.push({
        id: nextId(),
        category: 'debt_payoff',
        severity: highInterestDebtTotal > totalAssets * 0.1 ? 'critical' : 'warning',
        title: 'High-interest debt detected',
        description: `You have ${formatUsd(highInterestDebtTotal)} in high-interest debt (10%+): ${highRateDebts}. These debts cost you ~${formatUsd(highInterestDebtTotal * weightedAvgDebtRate / 100 / 12)}/month in interest alone.`,
        impact: `Paying these off first (avalanche method) saves the most money over time.`,
      });
    }

    // Minimum payment warning
    const minOnlyDebts = debts.filter(d => d.monthlyPayment && d.monthlyPayment <= d.minimumPayment * 1.05);
    if (minOnlyDebts.length > 0) {
      insights.push({
        id: nextId(),
        category: 'cash_flow',
        severity: 'warning',
        title: 'Paying only minimums on some debts',
        description: `${minOnlyDebts.map(d => d.name).join(', ')} — paying only the minimum extends repayment time significantly and maximizes interest paid.`,
        impact: 'Even $50-100 extra/month on the highest-rate debt can save hundreds in interest.',
      });
    }

    // Annual interest cost
    const annualInterest = debts.reduce((s, d) => s + (d.currentBalance * d.interestRate / 100), 0);
    if (annualInterest > 0) {
      insights.push({
        id: nextId(),
        category: 'debt_payoff',
        severity: annualInterest > 2000 ? 'warning' : 'info',
        title: `Paying ~${formatUsd(annualInterest)}/year in interest`,
        description: `Your debts cost approximately ${formatUsd(annualInterest)} per year (${formatUsd(annualInterest / 12)}/month) in interest charges. Eliminating high-rate debts first reduces this fastest.`,
      });
    }
  }

  // --- Leverage Insights ---

  // Stock gains vs debt interest — use annualized return for fair comparison
  const stockGains = stocks.reduce((s, st) => {
    const current = st.currentPrice ?? st.costBasisPerShare;
    const cost = st.costBasisPerShare;
    return s + (current - cost) * st.shares;
  }, 0);
  const stockCostBasis = stocks.reduce((s, st) => s + st.shares * st.costBasisPerShare, 0);
  const stockReturnPct = stockCostBasis > 0 ? (stockGains / stockCostBasis) * 100 : 0;

  // Estimate holding period from oldest stock's createdAt to annualize
  const oldestStockDate = stocks.reduce((oldest, st) => {
    const d = new Date(st.createdAt).getTime();
    return d < oldest ? d : oldest;
  }, Date.now());
  const holdingYears = Math.max((Date.now() - oldestStockDate) / (365.25 * 24 * 60 * 60 * 1000), 1);
  // Annualized return: (1 + totalReturn)^(1/years) - 1
  const annualizedReturnPct = stockCostBasis > 0
    ? (Math.pow(1 + stockGains / stockCostBasis, 1 / holdingYears) - 1) * 100
    : 0;

  if (debts.length > 0 && annualizedReturnPct > 0) {
    const highRateDebtsAboveReturn = debts.filter(d => d.interestRate > annualizedReturnPct);
    if (highRateDebtsAboveReturn.length > 0) {
      insights.push({
        id: nextId(),
        category: 'leverage',
        severity: 'warning',
        title: 'Debt interest exceeds investment returns',
        description: `Your annualized portfolio return is ~${annualizedReturnPct.toFixed(1)}%, but ${highRateDebtsAboveReturn.map(d => `${d.name} (${d.interestRate}%)`).join(', ')} charge more than that. Paying off these debts gives a guaranteed "return" equal to their interest rate.`,
        impact: `Every dollar put toward a ${highRateDebtsAboveReturn[0].interestRate}% debt is like earning ${highRateDebtsAboveReturn[0].interestRate}% risk-free.`,
      });
    }
  }

  // Credit card vs investing
  const creditCards = debts.filter(d => d.debtType === 'credit_card' && d.currentBalance > 0);
  if (creditCards.length > 0 && (totalStocks > 0 || totalCrypto > 0)) {
    const ccTotal = creditCards.reduce((s, d) => s + d.currentBalance, 0);
    const avgCCRate = creditCards.reduce((s, d) => s + d.interestRate * d.currentBalance, 0) / ccTotal;
    insights.push({
      id: nextId(),
      category: 'leverage',
      severity: 'critical',
      title: 'Credit card debt while investing',
      description: `You have ${formatUsd(ccTotal)} in credit card debt at ~${avgCCRate.toFixed(1)}% APR while holding investments. No investment reliably beats ${avgCCRate.toFixed(0)}% guaranteed returns from paying off credit cards.`,
      impact: `Consider pausing new investments until credit card debt is eliminated.`,
    });
  }

  // --- Portfolio Health ---

  // Debt-to-asset ratio
  if (debtToAssetRatio > 0) {
    let severity: Insight['severity'] = 'positive';
    let desc = `Your debt-to-asset ratio is ${(debtToAssetRatio * 100).toFixed(1)}%. `;
    if (debtToAssetRatio < 0.2) {
      desc += 'This is excellent — you have strong equity relative to debt. Even aggressive investors typically aim for under 30-40%, so you have plenty of room to leverage if desired.';
    } else if (debtToAssetRatio < 0.4) {
      severity = 'info';
      desc += 'For an aggressive investor, this is a comfortable range (under 40%). You\'re using leverage without overextending. Focus on keeping bad debt near zero and only carrying debt that builds wealth (mortgages, low-rate loans invested at higher returns).';
    } else if (debtToAssetRatio < 0.6) {
      severity = 'warning';
      desc += 'This is getting elevated. Aggressive investors can tolerate up to 40-50% if it\'s mostly good debt (mortgages, low-rate leverage), but above that you\'re exposed to market downturns wiping out equity. Reduce bad debt before taking on more.';
    } else {
      severity = 'critical';
      desc += 'This is high even for aggressive investors. Above 60%, a market correction could put you underwater. Prioritize paying down high-interest debt immediately — no investment reliably outearns 15%+ credit card rates.';
    }
    insights.push({
      id: nextId(),
      category: 'portfolio_health',
      severity,
      title: `Debt-to-asset ratio: ${(debtToAssetRatio * 100).toFixed(1)}%`,
      description: desc,
    });
  }

  // Diversification check
  const totalInvestable = totalStocks + totalCrypto + totalRetirement;
  const cryptoPct = totalInvestable > 0 ? totalCrypto / totalInvestable * 100 : 0;
  const stocksPct = totalInvestable > 0 ? totalStocks / totalInvestable * 100 : 0;
  if (totalInvestable > 0) {

    if (cryptoPct > 30) {
      insights.push({
        id: nextId(),
        category: 'portfolio_health',
        severity: 'warning',
        title: `Crypto is ${cryptoPct.toFixed(0)}% of investable assets`,
        description: `Having ${cryptoPct.toFixed(0)}% in crypto is high-risk concentration. Consider rebalancing — most advisors suggest keeping volatile assets under 10-20% of your portfolio.`,
      });
    }

    if (stocksPct > 80) {
      insights.push({
        id: nextId(),
        category: 'portfolio_health',
        severity: 'info',
        title: `Stocks are ${stocksPct.toFixed(0)}% of investable assets`,
        description: 'Heavy stock concentration. Consider diversifying across asset classes (bonds, real estate, international) to reduce volatility.',
      });
    }
  }

  // Emergency fund check (simple heuristic)
  if (monthlyDebtPayments > 0 && debts.length > 0) {
    const monthlyExpenseEstimate = monthlyDebtPayments * 2; // rough estimate
    const liquidAssets = totalStocks + totalCrypto; // rough proxy
    const monthsCovered = liquidAssets / monthlyExpenseEstimate;
    if (monthsCovered < 3) {
      insights.push({
        id: nextId(),
        category: 'cash_flow',
        severity: 'warning',
        title: 'Limited emergency buffer',
        description: `Your liquid assets (~${formatUsd(liquidAssets)}) cover roughly ${monthsCovered.toFixed(1)} months of estimated expenses. Aim for 3-6 months of expenses in an accessible account before aggressive investing.`,
      });
    }
  }

  // --- Age-based insights ---
  const ageSetting = getSetting('age');
  const age = ageSetting ? parseInt(ageSetting) : null;

  if (age && totalRetirement > 0) {
    // Retirement savings benchmarks (Fidelity guideline: 1x salary by 30, 3x by 40, 6x by 50, 8x by 60)
    // We don't know salary, but we can use total investable assets as a proxy for progress
    const yearsToRetirement = Math.max(65 - age, 0);
    if (yearsToRetirement > 0) {
      insights.push({
        id: nextId(),
        category: 'portfolio_health',
        severity: 'info',
        title: `~${yearsToRetirement} years to traditional retirement`,
        description: `At age ${age}, you have roughly ${yearsToRetirement} years until age 65. Your retirement accounts hold ${formatUsd(totalRetirement)}. Time is ${yearsToRetirement > 20 ? 'strongly on your side — compound growth will do heavy lifting' : yearsToRetirement > 10 ? 'still working for you, but maximizing contributions now is important' : 'limited — consider catch-up contributions and reducing portfolio risk'}.`,
      });
    }
  }

  if (age && age < 35 && totalCrypto > 0 && cryptoPct <= 30) {
    // Young with reasonable crypto allocation — positive
    const investable = totalStocks + totalCrypto + totalRetirement;
    if (investable > 0) {
      const cryptoPctOfTotal = (totalCrypto / investable) * 100;
      if (cryptoPctOfTotal > 5 && cryptoPctOfTotal <= 25) {
        insights.push({
          id: nextId(),
          category: 'portfolio_health',
          severity: 'positive',
          title: 'Age-appropriate risk allocation',
          description: `At ${age}, having ${cryptoPctOfTotal.toFixed(0)}% in crypto is within a reasonable risk range for your age. You have decades for volatile assets to recover from downturns.`,
        });
      }
    }
  }

  if (age && age >= 50) {
    const volatileAssets = totalCrypto + totalStocks;
    const volatilePct = totalAssets > 0 ? (volatileAssets / totalAssets) * 100 : 0;
    if (volatilePct > 80) {
      insights.push({
        id: nextId(),
        category: 'portfolio_health',
        severity: 'warning',
        title: 'High equity exposure for your age',
        description: `At ${age}, having ${volatilePct.toFixed(0)}% in stocks and crypto is aggressive. A common guideline is to hold roughly your age in percentage as stable/bond allocation. Consider gradually shifting toward more stable assets.`,
      });
    }
  }

  // --- Positive insights ---
  if (netWorth > 0 && debts.length === 0) {
    insights.push({
      id: nextId(),
      category: 'positive' as Insight['category'],
      severity: 'positive',
      title: 'Debt-free!',
      description: `You have zero tracked debts and a net worth of ${formatUsd(netWorth)}. Every dollar earned can go straight to building wealth.`,
    });
  }

  if (netWorth > 0 && totalRetirement > 0) {
    const retirementPct = (totalRetirement / totalAssets) * 100;
    if (retirementPct >= 20) {
      insights.push({
        id: nextId(),
        category: 'portfolio_health',
        severity: 'positive',
        title: `${retirementPct.toFixed(0)}% in retirement accounts`,
        description: `Good allocation to tax-advantaged retirement accounts (${formatUsd(totalRetirement)}). These grow tax-free or tax-deferred, compounding faster than taxable accounts.`,
      });
    }
  }

  // --- Debt payoff plans ---
  let debtPayoff: InsightsReport['debtPayoff'] = null;
  if (debts.length > 0) {
    const debtItems = debts.map(d => ({
      name: d.name,
      balance: d.currentBalance,
      rate: d.interestRate,
      minimumPayment: d.minimumPayment,
    }));
    const totalMin = debtItems.reduce((s, d) => s + d.minimumPayment, 0);

    // Avalanche: highest interest first
    const avalanche = [...debtItems].sort((a, b) => b.rate - a.rate);

    // Snowball: smallest balance first
    const snowball = [...debtItems].sort((a, b) => a.balance - b.balance);

    debtPayoff = {
      avalanche: {
        method: 'avalanche',
        order: avalanche,
        totalMonthlyMinimum: totalMin,
        monthsToPayoff: estimatePayoffMonths(avalanche, totalMin),
      },
      snowball: {
        method: 'snowball',
        order: snowball,
        totalMonthlyMinimum: totalMin,
        monthsToPayoff: estimatePayoffMonths(snowball, totalMin),
      },
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    insights,
    debtPayoff,
    metrics: {
      totalAssets,
      totalDebts,
      netWorth,
      debtToAssetRatio,
      weightedAvgDebtRate,
      monthlyDebtPayments,
      highInterestDebtTotal,
      goodDebtTotal,
      badDebtTotal,
      goodDebtMonthly,
      badDebtMonthly,
    },
  };
}

/**
 * Estimate months to pay off debts using avalanche/snowball method.
 * Pays minimums on ALL debts first, then puts remaining budget
 * toward the priority debt (first in sorted order). When a debt is
 * paid off, its minimum payment rolls into the extra pool.
 */
function estimatePayoffMonths(
  debts: Array<{ balance: number; rate: number; minimumPayment: number }>,
  totalMonthlyPayment: number,
): number {
  if (debts.length === 0 || totalMonthlyPayment <= 0) return 0;

  const balances = debts.map(d => d.balance);
  const rates = debts.map(d => d.rate / 100 / 12); // monthly rate
  const mins = debts.map(d => d.minimumPayment);
  let months = 0;
  const MAX_MONTHS = 600; // 50 year cap

  while (months < MAX_MONTHS) {
    const totalRemaining = balances.reduce((s, b) => s + Math.max(b, 0), 0);
    if (totalRemaining <= 0.01) break;

    months++;

    // Apply interest to all active debts
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] > 0) {
        balances[i] += balances[i] * rates[i];
      }
    }

    let budget = totalMonthlyPayment;

    // Step 1: Pay minimums on all debts
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;
      const minPay = Math.min(mins[i], balances[i], budget);
      balances[i] -= minPay;
      budget -= minPay;
    }

    // Step 2: Put remaining budget toward the first unpaid debt (priority target)
    if (budget > 0) {
      for (let i = 0; i < balances.length; i++) {
        if (balances[i] <= 0) continue;
        const extra = Math.min(balances[i], budget);
        balances[i] -= extra;
        budget -= extra;
        break; // Only the priority debt gets extra
      }
    }
  }

  return months;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}
