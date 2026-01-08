import { describe, it, expect } from 'vitest';
import {
  calculateRiskReward,
  calculatePercentage,
  formatPrice,
  createPriceLevelChart
} from './priceLevelChart.js';

describe('calculateRiskReward', () => {
  describe('buy trades', () => {
    it('calculates R:R for a standard buy trade', () => {
      // Entry 100, SL 90, TP 120 -> Risk 10, Reward 20 -> R:R = 2
      const rr = calculateRiskReward(100, 90, 120, 'buy');
      expect(rr).toBe(2);
    });

    it('calculates R:R for buy with 1:1 ratio', () => {
      // Entry 100, SL 90, TP 110 -> Risk 10, Reward 10 -> R:R = 1
      const rr = calculateRiskReward(100, 90, 110, 'buy');
      expect(rr).toBe(1);
    });

    it('calculates R:R for crypto buy trade', () => {
      // BTC: Entry 95000, SL 92000, TP 105000 -> Risk 3000, Reward 10000 -> R:R = 3.33
      const rr = calculateRiskReward(95000, 92000, 105000, 'buy');
      expect(rr).toBeCloseTo(3.33, 2);
    });

    it('handles fractional prices', () => {
      // Entry 1.50, SL 1.45, TP 1.65 -> Risk 0.05, Reward 0.15 -> R:R = 3
      const rr = calculateRiskReward(1.50, 1.45, 1.65, 'buy');
      expect(rr).toBeCloseTo(3, 5);
    });
  });

  describe('sell trades', () => {
    it('calculates R:R for a standard sell trade', () => {
      // Entry 100, SL 110, TP 80 -> Risk 10, Reward 20 -> R:R = 2
      const rr = calculateRiskReward(100, 110, 80, 'sell');
      expect(rr).toBe(2);
    });

    it('calculates R:R for sell with 1:1 ratio', () => {
      // Entry 100, SL 110, TP 90 -> Risk 10, Reward 10 -> R:R = 1
      const rr = calculateRiskReward(100, 110, 90, 'sell');
      expect(rr).toBe(1);
    });

    it('calculates R:R for crypto short trade', () => {
      // ETH: Entry 3200, SL 3400, TP 2800 -> Risk 200, Reward 400 -> R:R = 2
      const rr = calculateRiskReward(3200, 3400, 2800, 'sell');
      expect(rr).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('returns 0 when risk is zero (SL equals entry)', () => {
      const rr = calculateRiskReward(100, 100, 120, 'buy');
      expect(rr).toBe(0);
    });

    it('handles very small price differences', () => {
      const rr = calculateRiskReward(100.01, 100.00, 100.03, 'buy');
      expect(rr).toBeCloseTo(2, 1);
    });

    it('handles large crypto prices', () => {
      const rr = calculateRiskReward(100000, 95000, 115000, 'buy');
      expect(rr).toBe(3); // Risk 5000, Reward 15000
    });
  });
});

describe('calculatePercentage', () => {
  describe('positive percentages', () => {
    it('calculates positive percentage for level above entry', () => {
      expect(calculatePercentage(100, 110)).toBe('+10.00%');
    });

    it('calculates large positive percentage', () => {
      expect(calculatePercentage(100, 200)).toBe('+100.00%');
    });

    it('calculates small positive percentage', () => {
      expect(calculatePercentage(1000, 1005)).toBe('+0.50%');
    });
  });

  describe('negative percentages', () => {
    it('calculates negative percentage for level below entry', () => {
      expect(calculatePercentage(100, 90)).toBe('-10.00%');
    });

    it('calculates large negative percentage', () => {
      expect(calculatePercentage(100, 50)).toBe('-50.00%');
    });

    it('calculates small negative percentage', () => {
      expect(calculatePercentage(1000, 995)).toBe('-0.50%');
    });
  });

  describe('edge cases', () => {
    it('returns 0% for same entry and level', () => {
      expect(calculatePercentage(100, 100)).toBe('+0.00%');
    });

    it('returns 0% for zero entry', () => {
      expect(calculatePercentage(0, 100)).toBe('0%');
    });

    it('returns 0% for null entry', () => {
      expect(calculatePercentage(null, 100)).toBe('0%');
    });

    it('handles crypto prices', () => {
      // BTC stop loss at 92000 from 95000 entry = -3.16%
      expect(calculatePercentage(95000, 92000)).toBe('-3.16%');
    });

    it('handles take profit percentage', () => {
      // BTC TP at 105000 from 95000 entry = +10.53%
      expect(calculatePercentage(95000, 105000)).toBe('+10.53%');
    });
  });
});

describe('formatPrice', () => {
  describe('prices under 1000', () => {
    it('formats small prices with 2 decimal places', () => {
      expect(formatPrice(1.5)).toBe('1.50');
    });

    it('formats prices with exact cents', () => {
      expect(formatPrice(99.99)).toBe('99.99');
    });

    it('formats whole numbers under 1000', () => {
      expect(formatPrice(100)).toBe('100.00');
    });

    it('formats sub-dollar prices', () => {
      expect(formatPrice(0.50)).toBe('0.50');
    });
  });

  describe('prices 1000 and over', () => {
    it('formats thousands with commas', () => {
      expect(formatPrice(1000)).toBe('1,000.00');
    });

    it('formats large crypto prices with commas', () => {
      expect(formatPrice(95000)).toBe('95,000.00');
    });

    it('formats six-figure prices', () => {
      expect(formatPrice(105000)).toBe('105,000.00');
    });

    it('formats prices with decimals and commas', () => {
      expect(formatPrice(1234.56)).toBe('1,234.56');
    });
  });
});

describe('createPriceLevelChart', () => {
  describe('SVG generation', () => {
    it('creates valid SVG for buy trade', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('class="price-chart"');
    });

    it('creates valid SVG for sell trade', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 110,
        takeProfit: 80,
        action: 'sell'
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('includes R:R ratio in output', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      // R:R should be 2.0
      expect(svg).toContain('1:2.0 R:R');
    });

    it('includes formatted prices', () => {
      const svg = createPriceLevelChart({
        price: 95000,
        stopLoss: 92000,
        takeProfit: 105000,
        action: 'buy'
      });

      expect(svg).toContain('$95,000.00');
      expect(svg).toContain('$92,000.00');
      expect(svg).toContain('$105,000.00');
    });

    it('includes percentage labels', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toContain('-10.00%'); // Stop loss
      expect(svg).toContain('+20.00%'); // Take profit
    });

    it('includes ENTRY label', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toContain('ENTRY');
    });
  });

  describe('current price support', () => {
    it('includes current price when provided', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy',
        currentPrice: 105
      });

      expect(svg).toContain('$105.00');
      expect(svg).toContain('NOW');
      expect(svg).toContain('price-level-current');
    });

    it('omits current price when not provided', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).not.toContain('NOW');
      expect(svg).not.toContain('price-level-current');
    });
  });

  describe('zone backgrounds', () => {
    it('includes profit zone (green)', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toContain('rgba(34, 197, 94, 0.08)'); // Green profit zone
    });

    it('includes loss zone (red)', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toContain('rgba(239, 68, 68, 0.08)'); // Red loss zone
    });
  });

  describe('CSS classes', () => {
    it('includes correct price level classes', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toContain('price-level-tp');
      expect(svg).toContain('price-level-entry');
      expect(svg).toContain('price-level-sl');
    });

    it('includes label classes', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toContain('price-label-tp');
      expect(svg).toContain('price-label-entry');
      expect(svg).toContain('price-label-sl');
    });
  });

  describe('validation', () => {
    it('returns empty string when price is missing', () => {
      const svg = createPriceLevelChart({
        stopLoss: 90,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toBe('');
    });

    it('returns empty string when stopLoss is missing', () => {
      const svg = createPriceLevelChart({
        price: 100,
        takeProfit: 120,
        action: 'buy'
      });

      expect(svg).toBe('');
    });

    it('returns empty string when takeProfit is missing', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        action: 'buy'
      });

      expect(svg).toBe('');
    });

    it('returns empty string when action is missing', () => {
      const svg = createPriceLevelChart({
        price: 100,
        stopLoss: 90,
        takeProfit: 120
      });

      expect(svg).toBe('');
    });

    it('returns empty string for empty object', () => {
      const svg = createPriceLevelChart({});
      expect(svg).toBe('');
    });
  });

  describe('real-world trade scenarios', () => {
    it('handles BTC long trade', () => {
      const svg = createPriceLevelChart({
        price: 95000,
        stopLoss: 92000,
        takeProfit: 105000,
        action: 'buy'
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('1:3.3 R:R'); // Risk 3000, Reward 10000
    });

    it('handles ETH short trade', () => {
      const svg = createPriceLevelChart({
        price: 3200,
        stopLoss: 3400,
        takeProfit: 2800,
        action: 'sell'
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('1:2.0 R:R'); // Risk 200, Reward 400
    });

    it('handles stock trade with decimal prices', () => {
      const svg = createPriceLevelChart({
        price: 180.50,
        stopLoss: 175.00,
        takeProfit: 195.00,
        action: 'buy'
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('$180.50');
      expect(svg).toContain('$175.00');
      expect(svg).toContain('$195.00');
    });

    it('handles penny stock prices', () => {
      const svg = createPriceLevelChart({
        price: 0.85,
        stopLoss: 0.75,
        takeProfit: 1.10,
        action: 'buy'
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('$0.85');
    });
  });
});
