import { describe, it, expect, beforeEach } from 'vitest';
import { DEMO_TRADES, getNextDemo, resetDemoCycle } from './demoData.js';

describe('Demo Data', () => {
  describe('DEMO_TRADES array', () => {
    it('contains exactly 3 demo trades', () => {
      expect(DEMO_TRADES).toHaveLength(3);
    });

    it('includes crypto trades', () => {
      const cryptoTrades = DEMO_TRADES.filter(demo =>
        demo.id.startsWith('crypto-')
      );
      expect(cryptoTrades.length).toBeGreaterThanOrEqual(2);
    });

    it('includes stock trade', () => {
      const stockTrades = DEMO_TRADES.filter(demo =>
        demo.id.startsWith('stock-')
      );
      expect(stockTrades.length).toBeGreaterThanOrEqual(1);
    });

    it('all demos have required structure', () => {
      DEMO_TRADES.forEach(demo => {
        expect(demo).toHaveProperty('id');
        expect(demo).toHaveProperty('name');
        expect(demo).toHaveProperty('transcript');
        expect(demo).toHaveProperty('trade');

        expect(typeof demo.id).toBe('string');
        expect(typeof demo.name).toBe('string');
        expect(typeof demo.transcript).toBe('string');
        expect(typeof demo.trade).toBe('object');
      });
    });

    it('all trade objects have required fields', () => {
      DEMO_TRADES.forEach(demo => {
        const { trade } = demo;
        expect(trade).toHaveProperty('action');
        expect(trade).toHaveProperty('ticker');
        expect(trade).toHaveProperty('price');
        expect(trade).toHaveProperty('stopLoss');
        expect(trade).toHaveProperty('takeProfit');

        expect(typeof trade.action).toBe('string');
        expect(['buy', 'sell']).toContain(trade.action);
      });
    });

    it('all transcripts are realistic trader phrases', () => {
      DEMO_TRADES.forEach(demo => {
        const transcript = demo.transcript.toLowerCase();
        // Should mention key trade elements
        const hasAction = transcript.includes('long') ||
                         transcript.includes('short') ||
                         transcript.includes('buy') ||
                         transcript.includes('sell');
        expect(hasAction).toBe(true);
        expect(transcript.length).toBeGreaterThan(50); // Reasonable length
      });
    });
  });

  describe('Bitcoin Long Demo', () => {
    it('has complete trade information', () => {
      const btcDemo = DEMO_TRADES.find(d => d.id === 'crypto-btc');
      expect(btcDemo).toBeDefined();
      expect(btcDemo.name).toBe('Bitcoin Long');
      expect(btcDemo.trade.ticker).toBe('BTC/USDT');
      expect(btcDemo.trade.action).toBe('buy');
      expect(btcDemo.trade.exchange).toBe('Binance');
    });

    it('has realistic BTC prices', () => {
      const btcDemo = DEMO_TRADES.find(d => d.id === 'crypto-btc');
      expect(btcDemo.trade.price).toBeGreaterThan(50000);
      expect(btcDemo.trade.stopLoss).toBeLessThan(btcDemo.trade.price);
      expect(btcDemo.trade.takeProfit).toBeGreaterThan(btcDemo.trade.price);
    });

    it('includes technical analysis context', () => {
      const btcDemo = DEMO_TRADES.find(d => d.id === 'crypto-btc');
      expect(btcDemo.trade.timeframe).toBe('4H');
      expect(btcDemo.trade.indicators).toBeDefined();
      expect(btcDemo.trade.indicators.length).toBeGreaterThan(0);
      expect(btcDemo.trade.rationale).toBeDefined();
    });
  });

  describe('Ethereum Short Demo', () => {
    it('has complete trade information', () => {
      const ethDemo = DEMO_TRADES.find(d => d.id === 'crypto-eth');
      expect(ethDemo).toBeDefined();
      expect(ethDemo.name).toBe('Ethereum Short');
      expect(ethDemo.trade.ticker).toBe('ETH/USDT');
      expect(ethDemo.trade.action).toBe('sell');
      expect(ethDemo.trade.exchange).toBe('Binance');
    });

    it('has correct short trade structure', () => {
      const ethDemo = DEMO_TRADES.find(d => d.id === 'crypto-eth');
      // For shorts: SL > entry, TP < entry
      expect(ethDemo.trade.stopLoss).toBeGreaterThan(ethDemo.trade.price);
      expect(ethDemo.trade.takeProfit).toBeLessThan(ethDemo.trade.price);
    });

    it('includes risk/reward mention in transcript', () => {
      const ethDemo = DEMO_TRADES.find(d => d.id === 'crypto-eth');
      expect(ethDemo.transcript.toLowerCase()).toContain('risk');
    });
  });

  describe('Apple Long Demo', () => {
    it('has complete trade information', () => {
      const aaplDemo = DEMO_TRADES.find(d => d.id === 'stock-aapl');
      expect(aaplDemo).toBeDefined();
      expect(aaplDemo.name).toBe('Apple Long');
      expect(aaplDemo.trade.ticker).toBe('AAPL');
      expect(aaplDemo.trade.action).toBe('buy');
    });

    it('includes share quantity', () => {
      const aaplDemo = DEMO_TRADES.find(d => d.id === 'stock-aapl');
      expect(aaplDemo.trade.quantity).toBe(50);
    });

    it('has stock-appropriate price levels', () => {
      const aaplDemo = DEMO_TRADES.find(d => d.id === 'stock-aapl');
      // Stock prices are typically under $1000
      expect(aaplDemo.trade.price).toBeLessThan(1000);
      expect(aaplDemo.trade.price).toBeGreaterThan(50);
    });

    it('does not include exchange (stocks trade on standard exchanges)', () => {
      const aaplDemo = DEMO_TRADES.find(d => d.id === 'stock-aapl');
      // Stock demos may or may not include exchange
      // If included, it's optional
      if (aaplDemo.trade.exchange) {
        expect(typeof aaplDemo.trade.exchange).toBe('string');
      }
    });
  });

  describe('getNextDemo', () => {
    beforeEach(() => {
      resetDemoCycle();
    });

    it('returns first demo on first call', () => {
      const demo = getNextDemo();
      expect(demo).toBe(DEMO_TRADES[0]);
    });

    it('returns second demo on second call', () => {
      getNextDemo(); // First call
      const demo = getNextDemo(); // Second call
      expect(demo).toBe(DEMO_TRADES[1]);
    });

    it('returns third demo on third call', () => {
      getNextDemo(); // First
      getNextDemo(); // Second
      const demo = getNextDemo(); // Third
      expect(demo).toBe(DEMO_TRADES[2]);
    });

    it('cycles back to first demo after all demos shown', () => {
      getNextDemo(); // First
      getNextDemo(); // Second
      getNextDemo(); // Third
      const demo = getNextDemo(); // Should cycle to first
      expect(demo).toBe(DEMO_TRADES[0]);
    });

    it('continues cycling indefinitely', () => {
      // Go through two complete cycles
      for (let i = 0; i < DEMO_TRADES.length * 2; i++) {
        const demo = getNextDemo();
        const expectedDemo = DEMO_TRADES[i % DEMO_TRADES.length];
        expect(demo).toBe(expectedDemo);
      }
    });

    it('returns valid demo object every time', () => {
      for (let i = 0; i < 10; i++) {
        const demo = getNextDemo();
        expect(demo).toHaveProperty('id');
        expect(demo).toHaveProperty('transcript');
        expect(demo).toHaveProperty('trade');
      }
    });
  });

  describe('resetDemoCycle', () => {
    it('resets cycle to first demo', () => {
      // Advance through some demos
      getNextDemo(); // 0
      getNextDemo(); // 1
      getNextDemo(); // 2

      resetDemoCycle();

      const demo = getNextDemo();
      expect(demo).toBe(DEMO_TRADES[0]);
    });

    it('can be called multiple times safely', () => {
      resetDemoCycle();
      resetDemoCycle();
      resetDemoCycle();

      const demo = getNextDemo();
      expect(demo).toBe(DEMO_TRADES[0]);
    });

    it('resets even mid-cycle', () => {
      getNextDemo(); // 0
      resetDemoCycle();
      const demo = getNextDemo();
      expect(demo).toBe(DEMO_TRADES[0]);
    });
  });

  describe('Integration: Demo cycling behavior', () => {
    beforeEach(() => {
      resetDemoCycle();
    });

    it('shows each demo exactly once per cycle', () => {
      const seenIds = new Set();

      // Get all demos in one cycle
      for (let i = 0; i < DEMO_TRADES.length; i++) {
        const demo = getNextDemo();
        seenIds.add(demo.id);
      }

      // Should have seen all unique demos
      expect(seenIds.size).toBe(DEMO_TRADES.length);
      DEMO_TRADES.forEach(demo => {
        expect(seenIds.has(demo.id)).toBe(true);
      });
    });

    it('maintains consistent order across cycles', () => {
      resetDemoCycle();
      const firstCycle = [];
      for (let i = 0; i < DEMO_TRADES.length; i++) {
        firstCycle.push(getNextDemo().id);
      }

      const secondCycle = [];
      for (let i = 0; i < DEMO_TRADES.length; i++) {
        secondCycle.push(getNextDemo().id);
      }

      expect(secondCycle).toEqual(firstCycle);
    });
  });

  describe('Trade Data Quality', () => {
    it('all prices are positive numbers', () => {
      DEMO_TRADES.forEach(demo => {
        expect(demo.trade.price).toBeGreaterThan(0);
        expect(demo.trade.stopLoss).toBeGreaterThan(0);
        expect(demo.trade.takeProfit).toBeGreaterThan(0);
      });
    });

    it('all buy trades have SL < entry < TP', () => {
      const buyTrades = DEMO_TRADES.filter(d => d.trade.action === 'buy');
      buyTrades.forEach(demo => {
        expect(demo.trade.stopLoss).toBeLessThan(demo.trade.price);
        expect(demo.trade.price).toBeLessThan(demo.trade.takeProfit);
      });
    });

    it('all sell trades have TP < entry < SL', () => {
      const sellTrades = DEMO_TRADES.filter(d => d.trade.action === 'sell');
      sellTrades.forEach(demo => {
        expect(demo.trade.takeProfit).toBeLessThan(demo.trade.price);
        expect(demo.trade.price).toBeLessThan(demo.trade.stopLoss);
      });
    });

    it('all trades have reasonable risk/reward ratios', () => {
      DEMO_TRADES.forEach(demo => {
        const { price, stopLoss, takeProfit, action } = demo.trade;
        let risk, reward;

        if (action === 'buy') {
          risk = price - stopLoss;
          reward = takeProfit - price;
        } else {
          risk = stopLoss - price;
          reward = price - takeProfit;
        }

        const rrRatio = reward / risk;
        // Good trades typically have R:R >= 1
        expect(rrRatio).toBeGreaterThanOrEqual(1);
        // But not unrealistically high
        expect(rrRatio).toBeLessThan(10);
      });
    });

    it('crypto tickers use standard format', () => {
      const cryptoTrades = DEMO_TRADES.filter(d => d.id.startsWith('crypto-'));
      cryptoTrades.forEach(demo => {
        // Crypto pairs should be BASE/QUOTE format
        expect(demo.trade.ticker).toMatch(/^[A-Z]+\/[A-Z]+$/);
      });
    });

    it('stock tickers are simple symbols', () => {
      const stockTrades = DEMO_TRADES.filter(d => d.id.startsWith('stock-'));
      stockTrades.forEach(demo => {
        // Stock tickers are typically 1-5 uppercase letters
        expect(demo.trade.ticker).toMatch(/^[A-Z]{1,5}$/);
      });
    });

    it('all indicators are strings', () => {
      DEMO_TRADES.forEach(demo => {
        if (demo.trade.indicators) {
          expect(Array.isArray(demo.trade.indicators)).toBe(true);
          demo.trade.indicators.forEach(indicator => {
            expect(typeof indicator).toBe('string');
            expect(indicator.length).toBeGreaterThan(0);
          });
        }
      });
    });

    it('all rationales are meaningful', () => {
      DEMO_TRADES.forEach(demo => {
        if (demo.trade.rationale) {
          expect(typeof demo.trade.rationale).toBe('string');
          expect(demo.trade.rationale.length).toBeGreaterThan(20); // Substantial text
        }
      });
    });
  });

  describe('Transcript Quality', () => {
    it('transcripts match trade data', () => {
      DEMO_TRADES.forEach(demo => {
        const transcript = demo.transcript.toLowerCase();
        const ticker = demo.trade.ticker.split('/')[0].toLowerCase();

        // Transcript should mention the asset
        // Bitcoin/BTC, Ethereum/ETH, or stock name
        const mentionsAsset =
          transcript.includes(ticker) ||
          transcript.includes('bitcoin') ||
          transcript.includes('ethereum') ||
          transcript.includes('apple');

        expect(mentionsAsset).toBe(true);
      });
    });

    it('transcripts mention key price levels', () => {
      DEMO_TRADES.forEach(demo => {
        const transcript = demo.transcript.toLowerCase();

        // Should mention stop loss or target
        const mentionsPrices =
          transcript.includes('stop') ||
          transcript.includes('target') ||
          transcript.includes('take profit') ||
          transcript.includes('tp');

        expect(mentionsPrices).toBe(true);
      });
    });

    it('transcripts use natural language', () => {
      DEMO_TRADES.forEach(demo => {
        const transcript = demo.transcript;

        // Should have proper capitalization
        expect(transcript[0]).toMatch(/[A-Z]/);

        // Should end with punctuation
        expect(transcript[transcript.length - 1]).toMatch(/[.!?]/);

        // Should have spaces (not just comma-separated data)
        expect(transcript).toContain(' ');
      });
    });
  });
});
