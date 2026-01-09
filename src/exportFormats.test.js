import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Test suite for export format functions
 *
 * Note: Since the export functions are defined within main.js and reference DOM elements
 * and module state, we'll test the logic independently here with mock data.
 */

// Mock formatSavedNoteNumber function (from savedNotes.js)
function formatSavedNoteNumber(num) {
  if (num === null || num === undefined) return '';
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 8 });
}

// Mock calculateRiskReward function (from priceLevelChart.js)
function calculateRiskReward(entry, stopLoss, takeProfit, action) {
  if (!entry || !stopLoss || !takeProfit) return null;

  const entryNum = Number(entry);
  const slNum = Number(stopLoss);
  const tpNum = Number(takeProfit);

  if (isNaN(entryNum) || isNaN(slNum) || isNaN(tpNum)) return null;

  let risk, reward;

  if (action === 'buy' || action === 'long') {
    risk = Math.abs(entryNum - slNum);
    reward = Math.abs(tpNum - entryNum);
  } else {
    risk = Math.abs(slNum - entryNum);
    reward = Math.abs(entryNum - tpNum);
  }

  if (risk === 0) return null;
  return reward / risk;
}

// Export format functions (extracted from main.js for testing)
function exportAsPlainText(text) {
  return text;
}

function exportAsMarkdown(text, trade) {
  let markdown = '# Trade Note\n';
  markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;

  markdown += '## Transcript\n';
  markdown += `${text}\n\n`;

  if (trade) {
    markdown += '## Trade Details\n';

    if (trade.action || trade.tradeType) {
      const action = trade.tradeType || trade.action || '';
      markdown += `- **Action:** ${action.charAt(0).toUpperCase() + action.slice(1)}\n`;
    }

    if (trade.ticker) {
      markdown += `- **Ticker:** ${trade.ticker}\n`;
    }

    if (trade.exchange) {
      markdown += `- **Exchange:** ${trade.exchange}\n`;
    }

    if (trade.price) {
      markdown += `- **Entry:** $${formatSavedNoteNumber(trade.price)}\n`;
    }

    if (trade.stopLoss) {
      markdown += `- **Stop Loss:** $${formatSavedNoteNumber(trade.stopLoss)}\n`;
    }

    if (trade.takeProfit) {
      markdown += `- **Take Profit:** $${formatSavedNoteNumber(trade.takeProfit)}\n`;
    }

    // Calculate R:R ratio
    const rrRatio = calculateRiskReward(trade.price, trade.stopLoss, trade.takeProfit, trade.action);
    if (rrRatio !== null && rrRatio !== 0) {
      markdown += `- **R:R:** 1:${rrRatio.toFixed(2)}\n`;
    }

    if (trade.timeframe) {
      markdown += `- **Timeframe:** ${trade.timeframe}\n`;
    }

    if (trade.positionSize) {
      markdown += `- **Position Size:** $${formatSavedNoteNumber(trade.positionSize)}\n`;
    }

    if (trade.quantity) {
      markdown += `- **Quantity:** ${formatSavedNoteNumber(trade.quantity)}\n`;
    }

    if (trade.leverage) {
      markdown += `- **Leverage:** ${trade.leverage}x\n`;
    }

    if (trade.indicators && trade.indicators.length > 0) {
      markdown += `- **Indicators:** ${trade.indicators.join(', ')}\n`;
    }

    if (trade.rationale) {
      markdown += `\n## Rationale\n${trade.rationale}\n`;
    }
  }

  return markdown;
}

function exportAsJSON(text, trade, model = 'Xenova/whisper-base.en') {
  const data = {
    schema_version: '1.0',
    timestamp: new Date().toISOString(),
    transcript: text,
    trade: trade || null,
    model: model
  };

  return JSON.stringify(data, null, 2);
}

describe('Export Formats', () => {
  const mockTranscript = 'Long Bitcoin at 95000, stop loss 92000, take profit 105000, 4-hour timeframe, RSI oversold.';

  const mockTrade = {
    ticker: 'BTC/USDT',
    action: 'buy',
    tradeType: 'long',
    price: 95000,
    stopLoss: 92000,
    takeProfit: 105000,
    timeframe: '4H',
    exchange: 'Binance',
    positionSize: 10000,
    quantity: 0.105,
    leverage: 3,
    indicators: ['RSI', 'MACD'],
    rationale: 'RSI showing oversold conditions, bullish divergence on MACD'
  };

  describe('Plain Text Export', () => {
    it('returns transcript as-is', () => {
      const result = exportAsPlainText(mockTranscript);
      expect(result).toBe(mockTranscript);
    });

    it('handles empty transcript', () => {
      const result = exportAsPlainText('');
      expect(result).toBe('');
    });
  });

  describe('Markdown Export', () => {
    it('includes trade note header', () => {
      const result = exportAsMarkdown(mockTranscript, mockTrade);
      expect(result).toContain('# Trade Note');
      expect(result).toContain('**Date:**');
    });

    it('includes transcript section', () => {
      const result = exportAsMarkdown(mockTranscript, mockTrade);
      expect(result).toContain('## Transcript');
      expect(result).toContain(mockTranscript);
    });

    it('includes all trade details', () => {
      const result = exportAsMarkdown(mockTranscript, mockTrade);

      expect(result).toContain('## Trade Details');
      expect(result).toContain('- **Action:** Long');
      expect(result).toContain('- **Ticker:** BTC/USDT');
      expect(result).toContain('- **Exchange:** Binance');
      expect(result).toContain('- **Entry:** $95,000');
      expect(result).toContain('- **Stop Loss:** $92,000');
      expect(result).toContain('- **Take Profit:** $105,000');
      expect(result).toContain('- **Timeframe:** 4H');
      expect(result).toContain('- **Position Size:** $10,000');
      expect(result).toContain('- **Leverage:** 3x');
      expect(result).toContain('- **Indicators:** RSI, MACD');
    });

    it('calculates and includes R:R ratio', () => {
      const result = exportAsMarkdown(mockTranscript, mockTrade);
      expect(result).toContain('- **R:R:** 1:3.33');
    });

    it('includes rationale section when present', () => {
      const result = exportAsMarkdown(mockTranscript, mockTrade);
      expect(result).toContain('## Rationale');
      expect(result).toContain('RSI showing oversold conditions');
    });

    it('handles trade without optional fields', () => {
      const minimalTrade = {
        ticker: 'BTC/USDT',
        action: 'buy',
        price: 95000
      };

      const result = exportAsMarkdown(mockTranscript, minimalTrade);
      expect(result).toContain('- **Ticker:** BTC/USDT');
      expect(result).toContain('- **Entry:** $95,000');
      expect(result).not.toContain('- **Stop Loss:**');
      expect(result).not.toContain('## Rationale');
    });

    it('handles transcript without trade data', () => {
      const result = exportAsMarkdown(mockTranscript, null);
      expect(result).toContain('# Trade Note');
      expect(result).toContain('## Transcript');
      expect(result).toContain(mockTranscript);
      expect(result).not.toContain('## Trade Details');
    });
  });

  describe('JSON Export', () => {
    it('includes schema version', () => {
      const result = exportAsJSON(mockTranscript, mockTrade);
      const parsed = JSON.parse(result);

      expect(parsed.schema_version).toBe('1.0');
    });

    it('includes timestamp in ISO format', () => {
      const result = exportAsJSON(mockTranscript, mockTrade);
      const parsed = JSON.parse(result);

      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('includes transcript', () => {
      const result = exportAsJSON(mockTranscript, mockTrade);
      const parsed = JSON.parse(result);

      expect(parsed.transcript).toBe(mockTranscript);
    });

    it('includes complete trade object', () => {
      const result = exportAsJSON(mockTranscript, mockTrade);
      const parsed = JSON.parse(result);

      expect(parsed.trade).toEqual(mockTrade);
      expect(parsed.trade.ticker).toBe('BTC/USDT');
      expect(parsed.trade.price).toBe(95000);
      expect(parsed.trade.indicators).toEqual(['RSI', 'MACD']);
    });

    it('includes model information', () => {
      const model = 'Xenova/whisper-small.en';
      const result = exportAsJSON(mockTranscript, mockTrade, model);
      const parsed = JSON.parse(result);

      expect(parsed.model).toBe(model);
    });

    it('handles null trade data', () => {
      const result = exportAsJSON(mockTranscript, null);
      const parsed = JSON.parse(result);

      expect(parsed.trade).toBeNull();
      expect(parsed.transcript).toBe(mockTranscript);
    });

    it('produces valid JSON that can be parsed', () => {
      const result = exportAsJSON(mockTranscript, mockTrade);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('formats JSON with proper indentation', () => {
      const result = exportAsJSON(mockTranscript, mockTrade);
      expect(result).toContain('  "schema_version": "1.0"');
      expect(result).toContain('  "transcript":');
    });
  });

  describe('Demo Data Export', () => {
    it('exports demo crypto trade correctly', () => {
      const demoText = 'Long Bitcoin at 95,000, stop loss 92,000, take profit 105,000';
      const demoTrade = {
        ticker: 'BTC/USDT',
        action: 'buy',
        price: 95000,
        stopLoss: 92000,
        takeProfit: 105000
      };

      // Test all formats
      const plainText = exportAsPlainText(demoText);
      const markdown = exportAsMarkdown(demoText, demoTrade);
      const json = exportAsJSON(demoText, demoTrade);

      expect(plainText).toBe(demoText);
      expect(markdown).toContain('BTC/USDT');
      expect(markdown).toContain('$95,000');

      const parsed = JSON.parse(json);
      expect(parsed.trade.ticker).toBe('BTC/USDT');
      expect(parsed.trade.price).toBe(95000);
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in transcript', () => {
      const specialText = 'Trade: BTC/USDT @ $95k - looking good! 🚀';
      const result = exportAsMarkdown(specialText, null);
      expect(result).toContain(specialText);
    });

    it('handles very large numbers correctly', () => {
      const largeTrade = {
        ticker: 'BTC/USDT',
        action: 'buy',
        price: 1234567.89,
        positionSize: 9999999.99
      };

      const markdown = exportAsMarkdown('Large position', largeTrade);
      expect(markdown).toContain('1,234,567.89');
      expect(markdown).toContain('9,999,999.99');
    });

    it('handles empty indicators array', () => {
      const tradeWithEmptyIndicators = {
        ...mockTrade,
        indicators: []
      };

      const result = exportAsMarkdown(mockTranscript, tradeWithEmptyIndicators);
      expect(result).not.toContain('- **Indicators:**');
    });

    it('handles undefined optional fields gracefully', () => {
      const incompleteTrade = {
        ticker: 'ETH/USDT',
        action: 'sell'
        // missing most fields
      };

      const markdown = exportAsMarkdown('Short ETH', incompleteTrade);
      expect(markdown).toContain('ETH/USDT');
      expect(markdown).not.toContain('undefined');
      expect(markdown).not.toContain('null');
    });
  });
});
