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

    it('detects sell action', () => {
      expect(extractTradeInfo('Sell TSLA').action).toBe('sell');
      expect(extractTradeInfo('selling my position').action).toBe('sell');
      expect(extractTradeInfo('I sold it').action).toBe('sell');
      expect(extractTradeInfo('going short').action).toBe('sell');
    });
  });

  describe('ticker extraction', () => {
    it('extracts common tickers', () => {
      expect(extractTradeInfo('Buy AAPL').ticker).toBe('AAPL');
      expect(extractTradeInfo('Sell TSLA now').ticker).toBe('TSLA');
      expect(extractTradeInfo('NVDA is looking good').ticker).toBe('NVDA');
    });

    it('extracts ticker with price context', () => {
      expect(extractTradeInfo('MSFT at $400').ticker).toBe('MSFT');
    });

    it('extracts ticker after action', () => {
      const result = extractTradeInfo('Buy GOOG at 150');
      expect(result.ticker).toBe('GOOG');
    });
  });

  describe('price extraction', () => {
    it('extracts price with dollar sign', () => {
      expect(extractTradeInfo('Buy at $150').price).toBe(150);
      expect(extractTradeInfo('Price is $99.50').price).toBe(99.5);
    });

    it('extracts price with "at" keyword', () => {
      expect(extractTradeInfo('AAPL at 175').price).toBe(175);
    });

    it('extracts price with decimals', () => {
      expect(extractTradeInfo('Buy at $123.45').price).toBe(123.45);
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
    it('extracts stop loss', () => {
      expect(extractTradeInfo('Stop loss at $140').stopLoss).toBe(140);
      expect(extractTradeInfo('SL at 135').stopLoss).toBe(135);
      expect(extractTradeInfo('Stop at $145.50').stopLoss).toBe(145.5);
    });
  });

  describe('take profit extraction', () => {
    it('extracts take profit', () => {
      expect(extractTradeInfo('Take profit at $200').takeProfit).toBe(200);
      expect(extractTradeInfo('Buy AAPL target 180').takeProfit).toBe(180);
      expect(extractTradeInfo('TP at $175').takeProfit).toBe(175);
    });
  });

  describe('full trade extraction', () => {
    it('extracts complete trade info', () => {
      const result = extractTradeInfo(
        'Buy 100 shares of AAPL at $150 with stop loss at $140 and take profit at $170'
      );

      expect(result).toEqual({
        ticker: 'AAPL',
        action: 'buy',
        quantity: 100,
        price: 150,
        stopLoss: 140,
        takeProfit: 170,
      });
    });

    it('handles partial trade info', () => {
      const result = extractTradeInfo('Thinking about TSLA');
      expect(result.ticker).toBe('TSLA');
      expect(result.action).toBeNull();
    });
  });

  describe('no trade detection', () => {
    it('returns null for non-trade text', () => {
      expect(extractTradeInfo('Hello world')).toBeNull();
      expect(extractTradeInfo('The weather is nice')).toBeNull();
      expect(extractTradeInfo('')).toBeNull();
    });
  });
});

describe('generateTradeSummary', () => {
  it('generates summary for buy trade', () => {
    const trade = { action: 'buy', ticker: 'AAPL', quantity: 100, price: 150 };
    expect(generateTradeSummary(trade)).toBe('Buy AAPL 100 shares at $150.00');
  });

  it('generates summary for sell trade', () => {
    const trade = { action: 'sell', ticker: 'TSLA', price: 200 };
    expect(generateTradeSummary(trade)).toBe('Sell TSLA at $200.00');
  });

  it('includes stop loss and take profit', () => {
    const trade = {
      action: 'buy',
      ticker: 'NVDA',
      price: 500,
      stopLoss: 480,
      takeProfit: 550,
    };
    const summary = generateTradeSummary(trade);
    expect(summary).toContain('Stop loss: $480.00');
    expect(summary).toContain('Target: $550.00');
  });

  it('handles ticker-only trade', () => {
    const trade = { ticker: 'AMD' };
    expect(generateTradeSummary(trade)).toBe('Trade AMD');
  });
});
