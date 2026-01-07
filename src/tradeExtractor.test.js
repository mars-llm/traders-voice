import { describe, it, expect } from 'vitest';
import { extractTradeInfo, generateTradeSummary } from './tradeExtractor.js';

describe('extractTradeInfo', () => {
  describe('action detection', () => {
    it('detects buy action', () => {
      expect(extractTradeInfo('Buy AAPL').action).toBe('buy');
      expect(extractTradeInfo('buying some shares').action).toBe('buy');
      expect(extractTradeInfo('I bought yesterday').action).toBe('buy');
      expect(extractTradeInfo('going long on this').action).toBe('buy');
    });

    it('detects open long as buy', () => {
      expect(extractTradeInfo('Open long BTC USDT').action).toBe('buy');
      expect(extractTradeInfo('Opening long position').action).toBe('buy');
    });

    it('detects sell action', () => {
      expect(extractTradeInfo('Sell TSLA').action).toBe('sell');
      expect(extractTradeInfo('selling my position').action).toBe('sell');
      expect(extractTradeInfo('I sold it').action).toBe('sell');
      expect(extractTradeInfo('going short').action).toBe('sell');
    });

    it('detects open short as sell', () => {
      expect(extractTradeInfo('Open short ETH').action).toBe('sell');
      expect(extractTradeInfo('Opening short position').action).toBe('sell');
    });
  });

  describe('crypto pair detection', () => {
    it('extracts crypto pairs with space', () => {
      const result = extractTradeInfo('Open Long BTC USDT');
      expect(result.ticker).toBe('BTC/USDT');
    });

    it('extracts crypto pairs with slash', () => {
      const result = extractTradeInfo('Buy BTC/USDT at 50000');
      expect(result.ticker).toBe('BTC/USDT');
    });

    it('extracts combined crypto pairs', () => {
      const result = extractTradeInfo('Long ETHUSDT');
      expect(result.ticker).toBe('ETH/USDT');
    });

    it('extracts various crypto tokens', () => {
      expect(extractTradeInfo('Buy SOL USDT').ticker).toBe('SOL/USDT');
      expect(extractTradeInfo('Long DOGE USD').ticker).toBe('DOGE/USD');
      expect(extractTradeInfo('Trade ARB/USDT').ticker).toBe('ARB/USDT');
    });
  });

  describe('stock ticker detection', () => {
    it('extracts common stock tickers', () => {
      expect(extractTradeInfo('Buy AAPL').ticker).toBe('AAPL');
      expect(extractTradeInfo('Sell TSLA now').ticker).toBe('TSLA');
      expect(extractTradeInfo('NVDA is looking good').ticker).toBe('NVDA');
    });

    it('extracts ETF tickers', () => {
      expect(extractTradeInfo('Buy SPY calls').ticker).toBe('SPY');
      expect(extractTradeInfo('Long QQQ').ticker).toBe('QQQ');
    });
  });

  describe('excludes common words from ticker detection', () => {
    it('does not match AT as ticker', () => {
      const result = extractTradeInfo('stop loss at 86000');
      expect(result?.ticker).toBeUndefined();
    });

    it('does not match USD as ticker', () => {
      const result = extractTradeInfo('500 USD position');
      expect(result?.ticker).toBeUndefined();
    });
  });

  describe('large number parsing', () => {
    it('parses comma-separated thousands', () => {
      const result = extractTradeInfo('Stop loss at 86,000');
      expect(result.stopLoss).toBe(86000);
    });

    it('parses take profit with commas', () => {
      const result = extractTradeInfo('Take profit at 94,000');
      expect(result.takeProfit).toBe(94000);
    });

    it('handles mixed comma formats', () => {
      const result = extractTradeInfo('Buy BTC USDT, stop loss at 85,500, take profit at 95,000');
      expect(result.stopLoss).toBe(85500);
      expect(result.takeProfit).toBe(95000);
    });
  });

  describe('position size detection', () => {
    it('extracts position size in USD', () => {
      const result = extractTradeInfo('500 USD position');
      expect(result.positionSize).toBe(500);
    });

    it('extracts position size with dollars', () => {
      const result = extractTradeInfo('1000 dollars position size');
      expect(result.positionSize).toBe(1000);
    });

    it('extracts position size with USDT', () => {
      const result = extractTradeInfo('Trade 2500 USDT');
      expect(result.positionSize).toBe(2500);
    });
  });

  describe('price extraction', () => {
    it('extracts price with dollar sign', () => {
      expect(extractTradeInfo('Buy at $150').price).toBe(150);
    });

    it('extracts entry price', () => {
      expect(extractTradeInfo('Entry at 175').price).toBe(175);
    });

    it('does not confuse stop loss with price', () => {
      const result = extractTradeInfo('Buy AAPL stop loss at $140');
      expect(result.price).toBeUndefined();
      expect(result.stopLoss).toBe(140);
    });
  });

  describe('quantity extraction', () => {
    it('extracts shares quantity', () => {
      expect(extractTradeInfo('Buy 100 shares').quantity).toBe(100);
      expect(extractTradeInfo('50 shares of AAPL').quantity).toBe(50);
    });

    it('extracts contracts', () => {
      expect(extractTradeInfo('Buy 10 contracts').quantity).toBe(10);
    });
  });

  describe('stop loss extraction', () => {
    it('extracts stop loss with various formats', () => {
      expect(extractTradeInfo('Stop loss at $140').stopLoss).toBe(140);
      expect(extractTradeInfo('SL at 135').stopLoss).toBe(135);
      expect(extractTradeInfo('Stop at 145.50').stopLoss).toBe(145.5);
      expect(extractTradeInfo('Set stop at 130').stopLoss).toBe(130);
    });

    it('handles common Whisper mishearings for stop loss', () => {
      // "Stopplers" is a common Whisper mishearing of "stop loss"
      expect(extractTradeInfo('Stopplers at 92000').stopLoss).toBe(92000);
      expect(extractTradeInfo('Stoppers at 150').stopLoss).toBe(150);
    });
  });

  describe('take profit extraction', () => {
    it('extracts take profit with various formats', () => {
      expect(extractTradeInfo('Take profit at $200').takeProfit).toBe(200);
      expect(extractTradeInfo('TP at 175').takeProfit).toBe(175);
      expect(extractTradeInfo('Target 180').takeProfit).toBe(180);
    });
  });

  describe('real-world trade scenarios', () => {
    it('parses crypto trade with large numbers', () => {
      const result = extractTradeInfo(
        'Open Long BTC USDT, Mean Reversion Trade, 500 USD, stop loss at 86,000, take profit at 94,000 USD.'
      );

      expect(result.ticker).toBe('BTC/USDT');
      expect(result.action).toBe('buy');
      expect(result.positionSize).toBe(500);
      expect(result.stopLoss).toBe(86000);
      expect(result.takeProfit).toBe(94000);
    });

    it('parses stock trade with shares', () => {
      const result = extractTradeInfo(
        'Buy 100 shares of AAPL at $150 with stop loss at $140 and take profit at $170'
      );

      expect(result.ticker).toBe('AAPL');
      expect(result.action).toBe('buy');
      expect(result.quantity).toBe(100);
      expect(result.price).toBe(150);
      expect(result.stopLoss).toBe(140);
      expect(result.takeProfit).toBe(170);
    });

    it('parses short trade', () => {
      const result = extractTradeInfo('Open short ETH USDT at 2500, SL 2600, TP 2300');

      expect(result.ticker).toBe('ETH/USDT');
      expect(result.action).toBe('sell');
      expect(result.stopLoss).toBe(2600);
      expect(result.takeProfit).toBe(2300);
    });

    it('handles Whisper transcription errors', () => {
      // Real transcription: "Long Bitcoin and Binance at 95,000 Stopplers at 92,000..."
      const result = extractTradeInfo(
        'Long Bitcoin on Binance at 95000 Stopplers at 92000 take profit at 105000 4-hour chart RSI oversold MHCD crossover'
      );

      expect(result.ticker).toBe('BTC');
      expect(result.action).toBe('buy');
      expect(result.tradeType).toBe('long');
      expect(result.price).toBe(95000);
      expect(result.stopLoss).toBe(92000);
      expect(result.takeProfit).toBe(105000);
      expect(result.exchange).toBe('Binance');
      expect(result.timeframe).toBe('4h');
      expect(result.indicators).toContain('RSI');
      expect(result.indicators).toContain('MACD'); // MHCD → MACD
    });
  });

  describe('no trade detection', () => {
    it('returns null for non-trade text', () => {
      expect(extractTradeInfo('Hello world')).toBeNull();
      expect(extractTradeInfo('The weather is nice')).toBeNull();
      expect(extractTradeInfo('')).toBeNull();
      expect(extractTradeInfo(null)).toBeNull();
    });
  });
});

describe('generateTradeSummary', () => {
  it('generates summary for crypto trade', () => {
    const trade = {
      action: 'buy',
      ticker: 'BTC/USDT',
      positionSize: 500,
      stopLoss: 86000,
      takeProfit: 94000,
    };
    const summary = generateTradeSummary(trade);
    expect(summary).toContain('Buy BTC/USDT');
    expect(summary).toContain('$500');
    expect(summary).toContain('Stop loss: $86,000');
    expect(summary).toContain('Target: $94,000');
  });

  it('generates summary for stock trade', () => {
    const trade = { action: 'buy', ticker: 'AAPL', quantity: 100, price: 150 };
    expect(generateTradeSummary(trade)).toBe('Buy AAPL 100 shares at $150.00');
  });

  it('handles ticker-only trade', () => {
    const trade = { ticker: 'AMD' };
    expect(generateTradeSummary(trade)).toBe('Trade AMD');
  });

  it('handles action-only', () => {
    const trade = { action: 'sell', stopLoss: 100 };
    const summary = generateTradeSummary(trade);
    expect(summary).toContain('Sell');
    expect(summary).toContain('Stop loss');
  });
});
