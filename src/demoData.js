/**
 * Demo data for Try Demo feature
 * Pre-parsed trade examples that don't require the Whisper model
 */

export const DEMO_TRADES = [
  {
    id: 'crypto-btc',
    name: 'Bitcoin Long',
    transcript: "Going long on Bitcoin at 95,000. Stop loss at 92,000, take profit at 105,000. The 4-hour chart is showing strong support with RSI bouncing from oversold. Volume increasing on the bounce.",
    trade: {
      action: 'buy',
      ticker: 'BTC/USDT',
      exchange: 'Binance',
      price: 95000,
      stopLoss: 92000,
      takeProfit: 105000,
      timeframe: '4H',
      indicators: ['RSI oversold', 'Volume increasing'],
      rationale: 'Strong support bounce on 4H with increasing volume'
    }
  },
  {
    id: 'crypto-eth',
    name: 'Ethereum Short',
    transcript: "Shorting Ethereum at 3,200. Target is 2,800 with stop at 3,400. MACD crossing bearish on the daily, and we're rejecting from resistance. Risk to reward is about 2:1.",
    trade: {
      action: 'sell',
      ticker: 'ETH/USDT',
      exchange: 'Binance',
      price: 3200,
      stopLoss: 3400,
      takeProfit: 2800,
      timeframe: 'Daily',
      indicators: ['MACD bearish cross'],
      rationale: 'Rejection from resistance with bearish MACD'
    }
  },
  {
    id: 'stock-aapl',
    name: 'Apple Long',
    transcript: "Buying 50 shares of Apple at 185. Stop loss at 180, first target at 195. The stock is breaking out of a consolidation pattern on the daily chart. EMA 20 crossing above EMA 50.",
    trade: {
      action: 'buy',
      ticker: 'AAPL',
      price: 185,
      stopLoss: 180,
      takeProfit: 195,
      quantity: 50,
      timeframe: 'Daily',
      indicators: ['EMA 20/50 cross', 'Breakout'],
      rationale: 'Consolidation breakout with bullish EMA cross'
    }
  }
];

/**
 * Cycle to the next demo trade
 */
let currentDemoIndex = 0;

export function getNextDemo() {
  const demo = DEMO_TRADES[currentDemoIndex];
  currentDemoIndex = (currentDemoIndex + 1) % DEMO_TRADES.length;
  return demo;
}

export function resetDemoCycle() {
  currentDemoIndex = 0;
}
