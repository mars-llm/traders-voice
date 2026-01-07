/**
 * Trade Information Extractor
 *
 * Extracts trading-related information from transcribed text.
 * Identifies tickers, buy/sell actions, prices, quantities, stop loss, and take profit.
 */

/**
 * Extract trade information from transcribed text
 * @param {string} text - The transcribed text to analyze
 * @returns {Object|null} - Extracted trade info or null if no trade detected
 */
export function extractTradeInfo(text) {
  const upperText = text.toUpperCase();
  const trade = {
    ticker: null,
    action: null,
    quantity: null,
    price: null,
    stopLoss: null,
    takeProfit: null,
  };

  // Detect buy/sell action
  const buyPatterns = /\b(BUY|BUYING|BOUGHT|LONG|GOING LONG)\b/i;
  const sellPatterns = /\b(SELL|SELLING|SOLD|SHORT|GOING SHORT)\b/i;

  if (buyPatterns.test(text)) {
    trade.action = 'buy';
  } else if (sellPatterns.test(text)) {
    trade.action = 'sell';
  }

  // Extract ticker symbols (1-5 uppercase letters, common patterns)
  const tickerPatterns = [
    /\b(AAPL|GOOGL|GOOG|MSFT|AMZN|META|TSLA|NVDA|AMD|INTC|NFLX|DIS|BA|JPM|GS|V|MA|WMT|HD|NKE)\b/i,
    /\b([A-Z]{1,5})\s+(AT|@|\$)/i,
    /\b(BUY|SELL|LONG|SHORT)\s+([A-Z]{1,5})\b/i,
    /\bTICKER\s+([A-Z]{1,5})\b/i,
  ];

  for (const pattern of tickerPatterns) {
    const match = upperText.match(pattern);
    if (match) {
      trade.ticker = match[2] || match[1];
      break;
    }
  }

  // Extract price (look for $ or "at" followed by number)
  const pricePatterns = [
    /\$\s*(\d+(?:\.\d{1,2})?)/,
    /AT\s+\$?\s*(\d+(?:\.\d{1,2})?)/i,
    /PRICE\s+(?:OF\s+)?\$?\s*(\d+(?:\.\d{1,2})?)/i,
    /(\d+(?:\.\d{1,2})?)\s*(?:DOLLARS|BUCKS)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      trade.price = parseFloat(match[1]);
      break;
    }
  }

  // Extract quantity/shares
  const quantityPatterns = [
    /(\d+)\s*(?:SHARES|CONTRACTS|LOTS)/i,
    /(?:BUY|SELL|LONG|SHORT)\s+(\d+)\s+/i,
    /QUANTITY\s+(?:OF\s+)?(\d+)/i,
  ];

  for (const pattern of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      trade.quantity = parseInt(match[1], 10);
      break;
    }
  }

  // Extract stop loss
  const stopLossPatterns = [
    /STOP\s*(?:LOSS)?\s*(?:AT|@)?\s*\$?\s*(\d+(?:\.\d{1,2})?)/i,
    /SL\s*(?:AT|@)?\s*\$?\s*(\d+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of stopLossPatterns) {
    const match = text.match(pattern);
    if (match) {
      trade.stopLoss = parseFloat(match[1]);
      break;
    }
  }

  // Extract take profit
  const takeProfitPatterns = [
    /(?:TAKE\s*PROFIT|TARGET|TP)\s*(?:AT|@)?\s*\$?\s*(\d+(?:\.\d{1,2})?)/i,
    /PROFIT\s*(?:AT|@)?\s*\$?\s*(\d+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of takeProfitPatterns) {
    const match = text.match(pattern);
    if (match) {
      trade.takeProfit = parseFloat(match[1]);
      break;
    }
  }

  // Only return if we found meaningful trade info
  const hasTradeInfo = trade.ticker || trade.action || trade.price || trade.quantity;
  return hasTradeInfo ? trade : null;
}

/**
 * Generate natural language summary from trade info
 * @param {Object} trade - The extracted trade information
 * @returns {string} - Human-readable summary
 */
export function generateTradeSummary(trade) {
  const parts = [];

  if (trade.action && trade.ticker) {
    parts.push(`${trade.action === 'buy' ? 'Buy' : 'Sell'} ${trade.ticker}`);
  } else if (trade.ticker) {
    parts.push(`Trade ${trade.ticker}`);
  }

  if (trade.quantity) {
    parts.push(`${trade.quantity} shares`);
  }

  if (trade.price) {
    parts.push(`at $${trade.price.toFixed(2)}`);
  }

  if (trade.stopLoss) {
    parts.push(`• Stop loss: $${trade.stopLoss.toFixed(2)}`);
  }

  if (trade.takeProfit) {
    parts.push(`• Target: $${trade.takeProfit.toFixed(2)}`);
  }

  return parts.join(' ');
}
