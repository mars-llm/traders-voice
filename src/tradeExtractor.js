/**
 * Trade Information Extractor
 *
 * Extracts trading-related information from transcribed text.
 * Supports stocks, crypto pairs, and various trading terminology.
 */

// Common words to exclude from ticker detection
const EXCLUDED_WORDS = new Set([
  'AT', 'THE', 'AND', 'FOR', 'WITH', 'USD', 'USDT', 'USDC', 'EUR', 'GBP',
  'BUY', 'SELL', 'LONG', 'SHORT', 'STOP', 'LOSS', 'TAKE', 'PROFIT', 'TARGET',
  'OPEN', 'CLOSE', 'SET', 'PUT', 'CALL', 'GET', 'TRADE', 'TRADING',
  'PRICE', 'SHARES', 'CONTRACTS', 'LOTS', 'QUANTITY', 'POSITION', 'SIZE',
  'MEET', 'MEAN', 'REVERSION', 'MARKET', 'LIMIT', 'ORDER',
]);

// Popular crypto pairs and tokens
const CRYPTO_TOKENS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LINK', 'AVAX',
  'UNI', 'ATOM', 'LTC', 'BCH', 'XLM', 'ALGO', 'VET', 'FTM', 'NEAR', 'APT',
  'ARB', 'OP', 'INJ', 'SUI', 'SEI', 'TIA', 'PEPE', 'SHIB', 'BONK', 'WIF',
  'BNB', 'XMR',
];

// Crypto name to ticker mapping
const CRYPTO_NAME_TO_TICKER = {
  'BITCOIN': 'BTC',
  'ETHEREUM': 'ETH',
  'SOLANA': 'SOL',
  'CARDANO': 'ADA',
  'DOGECOIN': 'DOGE',
  'AVALANCHE': 'AVAX',
  'POLKADOT': 'DOT',
  'CHAINLINK': 'LINK',
  'LITECOIN': 'LTC',
  'MONERO': 'XMR',
  'BINANCE COIN': 'BNB',
  'BNB': 'BNB',
  'RIPPLE': 'XRP',
};

// Spoken pair variants mapping to canonical form
const SPOKEN_PAIR_VARIANTS = {
  'BITCOIN TETHER': 'BTC/USDT',
  'BTC USDT': 'BTC/USDT',
  'ETHEREUM TETHER': 'ETH/USDT',
  'ETHER TETHER': 'ETH/USDT',
  'ETH USDT': 'ETH/USDT',
  'EURO DOLLAR': 'EUR/USD',
  'POUND DOLLAR': 'GBP/USD',
  'STERLING DOLLAR': 'GBP/USD',
  'DOLLAR YEN': 'USD/JPY',
};

// Known crypto exchanges
const EXCHANGES = [
  'BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'KUCOIN', 'BITFINEX',
  'GEMINI', 'HUOBI', 'GATE.IO', 'BITGET', 'MEXC', 'CRYPTO.COM',
];

// Trading indicators (including common Whisper mishearings)
const INDICATORS = [
  'RSI', 'MACD', 'MHCD', 'MCD', 'MAC D',  // MACD variants from Whisper
  'EMA', 'SMA', 'VWAP', 'ATR', 'BOLLINGER', 'BOLLINGER BANDS',
  'STOCHASTIC', 'FIBONACCI', 'ICHIMOKU', 'ADX', 'CCI', 'WILLIAMS',
];

// Normalize indicator names (fix Whisper mishearings)
const INDICATOR_CORRECTIONS = {
  'MHCD': 'MACD',
  'MCD': 'MACD',
  'MAC D': 'MACD',
};

// Common Whisper mishearings for stop loss
const STOP_LOSS_VARIANTS = [
  'STOP LOSS', 'STOPLOSS', 'STOP-LOSS',
  'STOPPLERS', 'STOPPERS', 'STOP PLUS', 'STOPPER',  // Common mishearings
  'SL', 'S L', 'S.L.',
];

// Timeframe mappings
// Timeframe variants - ordered from most specific to least specific
// Includes hyphenated variants common in Whisper transcriptions
const TIMEFRAME_VARIANTS = [
  ['FIFTEEN MINUTES', '15m'],
  ['15 MINUTES', '15m'],
  ['15-MINUTE', '15m'],
  ['15M CHART', '15m'],
  ['FIVE MINUTES', '5m'],
  ['5 MINUTES', '5m'],
  ['5-MINUTE', '5m'],
  ['5M CHART', '5m'],
  ['ONE MINUTE', '1m'],
  ['1 MINUTE', '1m'],
  ['1-MINUTE', '1m'],
  ['1M CHART', '1m'],
  ['FOUR-HOUR', '4h'],
  ['4-HOUR', '4h'],
  ['FOUR HOUR', '4h'],
  ['FOUR HOURS', '4h'],
  ['4 HOUR', '4h'],
  ['4 HOURS', '4h'],
  ['4H CHART', '4h'],
  ['ONE-HOUR', '1h'],
  ['1-HOUR', '1h'],
  ['ONE HOUR', '1h'],
  ['1 HOUR', '1h'],
  ['1H CHART', '1h'],
  ['HOUR CHART', '1h'],
  ['HOURLY', '1h'],
  ['ONE DAY', '1D'],
  ['1 DAY', '1D'],
  ['1-DAY', '1D'],
  ['DAY CHART', '1D'],
  ['DAILY', '1D'],
  ['ONE WEEK', '1W'],
  ['1 WEEK', '1W'],
  ['1-WEEK', '1W'],
  ['WEEK CHART', '1W'],
  ['WEEKLY', '1W'],
  ['ONE MONTH', '1M'],
  ['1 MONTH', '1M'],
  ['MONTH CHART', '1M'],
  ['MONTHLY', '1M'],
];

// Common stock tickers
const STOCK_TICKERS = [
  'AAPL', 'GOOGL', 'GOOG', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD', 'INTC',
  'NFLX', 'DIS', 'BA', 'JPM', 'GS', 'V', 'MA', 'WMT', 'HD', 'NKE', 'COST', 'PEP',
  'KO', 'MCD', 'SBUX', 'CVX', 'XOM', 'PFE', 'JNJ', 'UNH', 'ABBV', 'MRK', 'LLY',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'ARKK', 'XLF', 'XLE', 'XLK',
];

/**
 * Parse a number that may contain commas (e.g., "86,000" → 86000)
 */
function parseNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Extract trade information from transcribed text
 * @param {string} text - The transcribed text to analyze
 * @returns {Object|null} - Extracted trade info or null if no trade detected
 */
export function extractTradeInfo(text) {
  if (!text || typeof text !== 'string') return null;

  const upperText = text.toUpperCase();
  const trade = {
    ticker: null,
    action: null,
    quantity: null,
    price: null,
    stopLoss: null,
    takeProfit: null,
    positionSize: null,
    exchange: null,
    timeframe: null,
    indicators: [],
    breakEven: null,
    leverage: null,
    tradeType: null,
  };

  // === ACTION DETECTION ===
  const buyPatterns = /\b(BUY|BUYING|BOUGHT|LONG|GOING LONG|OPEN LONG|OPENING LONG)\b/i;
  const sellPatterns = /\b(SELL|SELLING|SOLD|SHORT|GOING SHORT|OPEN SHORT|OPENING SHORT|CLOSE|CLOSING)\b/i;

  if (buyPatterns.test(text)) {
    trade.action = 'buy';
    trade.tradeType = 'long';
  } else if (sellPatterns.test(text)) {
    trade.action = 'sell';
    trade.tradeType = 'short';
  }

  // === EXCHANGE DETECTION ===
  for (const exchange of EXCHANGES) {
    if (upperText.includes(exchange)) {
      trade.exchange = exchange.charAt(0) + exchange.slice(1).toLowerCase();
      break;
    }
  }

  // === TIMEFRAME DETECTION ===
  for (const [variant, canonical] of TIMEFRAME_VARIANTS) {
    if (upperText.includes(variant)) {
      trade.timeframe = canonical;
      break;
    }
  }

  // === INDICATOR DETECTION ===
  for (const indicator of INDICATORS) {
    // Match whole words or specific patterns like "RSI", "MACD", "EMA 20"
    const indicatorPattern = new RegExp(`\\b${indicator.replace(/\./g, '\\.')}\\b`, 'i');
    if (indicatorPattern.test(text)) {
      // Apply corrections for Whisper mishearings (MHCD → MACD, etc.)
      let normalizedIndicator = indicator.split(' ')[0]; // "BOLLINGER BANDS" → "BOLLINGER"
      normalizedIndicator = INDICATOR_CORRECTIONS[normalizedIndicator] || normalizedIndicator;
      if (!trade.indicators.includes(normalizedIndicator)) {
        trade.indicators.push(normalizedIndicator);
      }
    }
  }

  // === LEVERAGE DETECTION ===
  const leveragePatterns = [
    /(\d+)X\s*LEVERAGE/i,
    /LEVERAGE\s*(?:OF\s*)?(\d+)X?/i,
    /\b(?:WITH|USING)\s+(\d+)X\b/i,
    /\b(\d+)X\s+(?:LONG|SHORT|POSITION)/i,
  ];
  for (const pattern of leveragePatterns) {
    const match = text.match(pattern);
    if (match) {
      const lev = parseInt(match[1], 10);
      if (lev >= 1 && lev <= 125) {
        trade.leverage = lev;
        break;
      }
    }
  }

  // === CRYPTO PAIR DETECTION ===

  // First check spoken pair variants (e.g., "bitcoin tether" → "BTC/USDT")
  for (const [spokenVariant, canonicalPair] of Object.entries(SPOKEN_PAIR_VARIANTS)) {
    if (upperText.includes(spokenVariant)) {
      trade.ticker = canonicalPair;
      break;
    }
  }

  // If no spoken variant matched, check crypto name to ticker mapping
  if (!trade.ticker) {
    for (const [cryptoName, ticker] of Object.entries(CRYPTO_NAME_TO_TICKER)) {
      // Match "Buy Bitcoin" or "Bitcoin USDT"
      const namePattern = new RegExp(`\\b${cryptoName}(?:\\s+(USDT|USDC|USD|BUSD|EUR|BTC|ETH))?\\b`, 'i');
      const match = upperText.match(namePattern);
      if (match) {
        if (match[1]) {
          // "Bitcoin USDT" → "BTC/USDT"
          trade.ticker = `${ticker}/${match[1].toUpperCase()}`;
        } else {
          // Just "Bitcoin" without a quote currency, check if there's a standalone quote currency nearby
          const quotePattern = /\b(USDT|USDC|USD|BUSD|EUR)\b/i;
          const quoteMatch = upperText.match(quotePattern);
          if (quoteMatch) {
            trade.ticker = `${ticker}/${quoteMatch[1].toUpperCase()}`;
          } else {
            trade.ticker = ticker; // Just the ticker
          }
        }
        break;
      }
    }
  }

  // Match patterns like "BTC USDT", "BTC/USDT", "BTCUSDT", "BTC-USDT"
  if (!trade.ticker) {
    const cryptoPairPatterns = [
      // "BTC USDT", "BTC / USDT", "BTC-USDT"
      new RegExp(`\\b(${CRYPTO_TOKENS.join('|')})\\s*[/\\-]?\\s*(USDT|USDC|USD|BUSD|EUR|BTC|ETH)\\b`, 'i'),
      // "BTCUSDT" (combined)
      new RegExp(`\\b(${CRYPTO_TOKENS.join('|')})(USDT|USDC|USD|BUSD|EUR|BTC|ETH)\\b`, 'i'),
    ];

    for (const pattern of cryptoPairPatterns) {
      const match = upperText.match(pattern);
      if (match) {
        trade.ticker = `${match[1]}/${match[2]}`.toUpperCase();
        break;
      }
    }
  }

  // === STOCK TICKER DETECTION (if no crypto found) ===
  if (!trade.ticker) {
    // First try known stock tickers
    const stockPattern = new RegExp(`\\b(${STOCK_TICKERS.join('|')})\\b`, 'i');
    const stockMatch = upperText.match(stockPattern);
    if (stockMatch) {
      trade.ticker = stockMatch[1].toUpperCase();
    }
  }

  // === GENERIC TICKER DETECTION (if nothing found yet) ===
  if (!trade.ticker) {
    // Look for ticker-like patterns: 1-5 uppercase letters that aren't common words
    // Must be near trading context words
    const contextPatterns = [
      /\b(BUY|SELL|LONG|SHORT|TRADE|TRADING)\s+([A-Z]{2,5})\b/i,
      /\b([A-Z]{2,5})\s+(?:AT|@|\$|PRICE)/i,
      /\bTICKER\s+([A-Z]{2,5})\b/i,
    ];

    for (const pattern of contextPatterns) {
      const match = upperText.match(pattern);
      if (match) {
        const candidate = (match[2] || match[1]).toUpperCase();
        if (!EXCLUDED_WORDS.has(candidate)) {
          trade.ticker = candidate;
          break;
        }
      }
    }
  }

  // === PRICE EXTRACTION ===
  // Look for explicit price mentions (not stop loss or take profit)
  const pricePatterns = [
    /(?:PRICE|ENTRY|ENTER|AT)\s+(?:OF\s+)?(?:IS\s+)?\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:EACH|PER|ENTRY)?/i,
    /(?:BUY|SELL|LONG|SHORT)\s+(?:AT\s+)?\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  // But NOT if it's preceded by stop loss or take profit keywords (within 20 chars)
  const priceExcludeBefore = /(?:STOP\s*LOSS|SL|TARGET|TAKE\s*PROFIT|TP)\b/i;

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Only check the 20 chars BEFORE the match for exclusion keywords
      const beforeText = text.substring(Math.max(0, match.index - 20), match.index);
      if (!priceExcludeBefore.test(beforeText)) {
        const price = parseNumber(match[1]);
        if (price !== null) {
          trade.price = price;
          break;
        }
      }
    }
  }

  // === QUANTITY / SHARES ===
  const quantityPatterns = [
    /([\d,]+)\s*(?:SHARES|CONTRACTS|LOTS|UNITS)/i,
    /(?:BUY|SELL|LONG|SHORT)\s+([\d,]+)\s+(?!USD|USDT|DOLLAR)/i,
    /QUANTITY\s+(?:OF\s+)?([\d,]+)/i,
  ];

  for (const pattern of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const qty = parseNumber(match[1]);
      if (qty !== null && qty > 0 && qty < 1000000) {
        trade.quantity = qty;
        break;
      }
    }
  }

  // === POSITION SIZE (in USD) ===
  const positionSizePatterns = [
    /([\d,]+)\s*(?:USD|USDT|DOLLARS?|BUCKS)\s*(?:POSITION|SIZE|WORTH)?/i,
    /POSITION\s*(?:SIZE)?\s*(?:OF\s*)?([\d,]+)\s*(?:USD|USDT|DOLLARS?)?/i,
    /SIZE\s+(?:OF\s+)?([\d,]+)\s*(?:USD|USDT|DOLLARS?)?/i,
  ];

  for (const pattern of positionSizePatterns) {
    const match = text.match(pattern);
    if (match) {
      const size = parseNumber(match[1]);
      // Position sizes are typically 100-1,000,000
      if (size !== null && size >= 10 && size <= 10000000) {
        trade.positionSize = size;
        break;
      }
    }
  }

  // === STOP LOSS ===
  // First, normalize common Whisper mishearings in the text
  let normalizedText = upperText;
  for (const variant of STOP_LOSS_VARIANTS) {
    if (normalizedText.includes(variant)) {
      normalizedText = normalizedText.replace(new RegExp(variant, 'gi'), 'STOP LOSS');
    }
  }

  const stopLossPatterns = [
    /STOP\s*LOSS\s*(?:AT|@|IS|OF)?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /STOP\s+(?:AT|@)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /SL\s*(?:AT|@|IS)?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:SET|PUT)\s+(?:A\s+)?STOP\s+(?:AT\s+)?\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of stopLossPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const sl = parseNumber(match[1]);
      if (sl !== null) {
        trade.stopLoss = sl;
        break;
      }
    }
  }

  // === TAKE PROFIT ===
  const takeProfitPatterns = [
    /(?:TAKE\s*PROFIT|TP)\s*(?:AT|@|IS)?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /TARGET\s*(?:AT|@|IS|OF)?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /PROFIT\s*(?:AT|@)?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of takeProfitPatterns) {
    const match = text.match(pattern);
    if (match) {
      const tp = parseNumber(match[1]);
      if (tp !== null) {
        trade.takeProfit = tp;
        break;
      }
    }
  }

  // === BREAK EVEN ===
  const breakEvenPatterns = [
    /(?:BREAK\s*EVEN|BREAKEVEN|B\s*E)\s*(?:AT|@|IS)?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:MOVE|MOVED|MOVING)\s+(?:STOP\s+)?(?:TO\s+)?(?:BREAK\s*EVEN|BREAKEVEN|B\s*E)/i,
  ];

  for (const pattern of breakEvenPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1]) {
        const be = parseNumber(match[1]);
        if (be !== null) {
          trade.breakEven = be;
          break;
        }
      } else {
        // Just mentioned "move to break even" without a specific price
        trade.breakEven = true;
        break;
      }
    }
  }

  // === VALIDATION ===
  // Only return if we found meaningful trade info
  const hasTradeInfo = trade.ticker || trade.action || trade.price ||
                       trade.quantity || trade.stopLoss || trade.takeProfit || trade.positionSize;

  if (!hasTradeInfo) return null;

  // Clean up null values and empty arrays for cleaner output
  Object.keys(trade).forEach(key => {
    if (trade[key] === null || (Array.isArray(trade[key]) && trade[key].length === 0)) {
      delete trade[key];
    }
  });

  return trade;
}

/**
 * Format a number for display (with commas for thousands)
 */
function formatNumber(num) {
  if (num >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return num.toFixed(2);
}

/**
 * Generate natural language summary from trade info
 * @param {Object} trade - The extracted trade information
 * @returns {string} - Human-readable summary
 */
export function generateTradeSummary(trade) {
  const parts = [];

  // Main action and ticker
  if (trade.action && trade.ticker) {
    let actionText = trade.action === 'buy' ? 'Buy' : 'Sell';
    if (trade.tradeType) {
      actionText = trade.tradeType === 'long' ? 'Long' : 'Short';
    }
    parts.push(`${actionText} ${trade.ticker}`);
  } else if (trade.ticker) {
    parts.push(`Trade ${trade.ticker}`);
  } else if (trade.action) {
    parts.push(trade.action === 'buy' ? 'Buy' : 'Sell');
  }

  // Exchange
  if (trade.exchange) {
    parts.push(`on ${trade.exchange}`);
  }

  // Timeframe
  if (trade.timeframe) {
    parts.push(`(${trade.timeframe})`);
  }

  if (trade.quantity) {
    parts.push(`${trade.quantity} shares`);
  }

  if (trade.positionSize) {
    parts.push(`$${formatNumber(trade.positionSize)} position`);
  }

  // Leverage
  if (trade.leverage) {
    parts.push(`${trade.leverage}x`);
  }

  if (trade.price) {
    parts.push(`at $${formatNumber(trade.price)}`);
  }

  // Additional info
  const extras = [];

  if (trade.stopLoss) {
    extras.push(`Stop loss: $${formatNumber(trade.stopLoss)}`);
  }

  if (trade.takeProfit) {
    extras.push(`Target: $${formatNumber(trade.takeProfit)}`);
  }

  if (trade.breakEven !== undefined) {
    if (typeof trade.breakEven === 'number') {
      extras.push(`Break even: $${formatNumber(trade.breakEven)}`);
    } else if (trade.breakEven === true) {
      extras.push(`Move to break even`);
    }
  }

  if (trade.indicators && trade.indicators.length > 0) {
    extras.push(`Indicators: ${trade.indicators.join(', ')}`);
  }

  if (extras.length > 0) {
    parts.push('• ' + extras.join(' • '));
  }

  return parts.join(' ');
}
