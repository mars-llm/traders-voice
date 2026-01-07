/**
 * Price Level Chart Component
 *
 * Generates an SVG-based visual chart showing entry, stop loss, and take profit levels.
 * Displays risk/reward ratio and percentage distances.
 */

/**
 * Calculate risk/reward ratio
 * @param {number} entry - Entry price
 * @param {number} stopLoss - Stop loss price
 * @param {number} takeProfit - Take profit price
 * @param {string} action - 'buy' or 'sell'
 * @returns {number} - R:R ratio
 */
function calculateRiskReward(entry, stopLoss, takeProfit, action) {
  const isBuy = action === 'buy';

  let risk, reward;

  if (isBuy) {
    risk = Math.abs(entry - stopLoss);
    reward = Math.abs(takeProfit - entry);
  } else {
    risk = Math.abs(stopLoss - entry);
    reward = Math.abs(entry - takeProfit);
  }

  if (risk === 0) return 0;
  return reward / risk;
}

/**
 * Calculate percentage distance from entry
 * @param {number} entry - Entry price
 * @param {number} level - Level price
 * @returns {string} - Formatted percentage
 */
function calculatePercentage(entry, level) {
  if (!entry || entry === 0) return '0%';
  const pct = ((level - entry) / entry) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
}

/**
 * Format price for display
 * @param {number} price - Price to format
 * @returns {string} - Formatted price
 */
function formatPrice(price) {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toFixed(2);
}

/**
 * Create price level chart SVG
 * @param {Object} tradeInfo - Trade information object
 * @param {number} tradeInfo.price - Entry price
 * @param {number} tradeInfo.stopLoss - Stop loss price
 * @param {number} tradeInfo.takeProfit - Take profit price
 * @param {string} tradeInfo.action - 'buy' or 'sell'
 * @param {number} [tradeInfo.currentPrice] - Optional current price
 * @returns {string} - SVG string
 */
export function createPriceLevelChart(tradeInfo) {
  const { price, stopLoss, takeProfit, action, currentPrice } = tradeInfo;

  // Validate required fields
  if (!price || !stopLoss || !takeProfit || !action) {
    return '';
  }

  const isBuy = action === 'buy';

  // Calculate R:R ratio
  const rrRatio = calculateRiskReward(price, stopLoss, takeProfit, action);

  // Calculate percentages
  const slPercentage = calculatePercentage(price, stopLoss);
  const tpPercentage = calculatePercentage(price, takeProfit);

  // Determine price range and levels
  const prices = [price, stopLoss, takeProfit];
  if (currentPrice) prices.push(currentPrice);

  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.15; // 15% padding

  const chartTop = maxPrice + padding;
  const chartBottom = minPrice - padding;
  const chartRange = chartTop - chartBottom;

  // SVG dimensions
  const width = 280; // Total width to fit chart + labels
  const height = 120;
  const leftMargin = 8;
  const rightMargin = 120; // Space for price labels
  const chartWidth = width - leftMargin - rightMargin;

  // Helper: Convert price to Y coordinate
  const priceToY = (p) => {
    const normalized = (chartTop - p) / chartRange;
    return 10 + normalized * (height - 20);
  };

  // Calculate Y positions
  const entryY = priceToY(price);
  const slY = priceToY(stopLoss);
  const tpY = priceToY(takeProfit);
  const currentY = currentPrice ? priceToY(currentPrice) : null;

  // Determine zones (profit zone is green, loss zone is red)
  let profitZoneTop, profitZoneBottom, lossZoneTop, lossZoneBottom;

  if (isBuy) {
    // For buys: profit is above entry, loss is below
    profitZoneTop = tpY;
    profitZoneBottom = entryY;
    lossZoneTop = entryY;
    lossZoneBottom = slY;
  } else {
    // For sells: profit is below entry, loss is above
    profitZoneTop = entryY;
    profitZoneBottom = tpY;
    lossZoneTop = slY;
    lossZoneBottom = entryY;
  }

  // Generate SVG
  const svg = `
    <svg class="price-chart" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Profit Zone Background -->
      <rect
        x="${leftMargin}"
        y="${profitZoneTop}"
        width="${chartWidth}"
        height="${Math.abs(profitZoneBottom - profitZoneTop)}"
        fill="rgba(34, 197, 94, 0.08)"
      />

      <!-- Loss Zone Background -->
      <rect
        x="${leftMargin}"
        y="${lossZoneTop}"
        width="${chartWidth}"
        height="${Math.abs(lossZoneBottom - lossZoneTop)}"
        fill="rgba(239, 68, 68, 0.08)"
      />

      <!-- Take Profit Line -->
      <line
        x1="${leftMargin}"
        y1="${tpY}"
        x2="${leftMargin + chartWidth}"
        y2="${tpY}"
        class="price-level price-level-tp"
      />
      <circle cx="${leftMargin}" cy="${tpY}" r="1.5" fill="var(--success)" />

      <!-- Entry Price Line -->
      <line
        x1="${leftMargin}"
        y1="${entryY}"
        x2="${leftMargin + chartWidth}"
        y2="${entryY}"
        class="price-level price-level-entry"
      />
      <circle cx="${leftMargin}" cy="${entryY}" r="1.5" fill="var(--accent)" />

      <!-- Stop Loss Line -->
      <line
        x1="${leftMargin}"
        y1="${slY}"
        x2="${leftMargin + chartWidth}"
        y2="${slY}"
        class="price-level price-level-sl"
      />
      <circle cx="${leftMargin}" cy="${slY}" r="1.5" fill="var(--error)" />

      <!-- Current Price Line (if provided) -->
      ${currentY !== null ? `
        <line
          x1="${leftMargin}"
          y1="${currentY}"
          x2="${leftMargin + chartWidth}"
          y2="${currentY}"
          class="price-level price-level-current"
        />
        <circle cx="${leftMargin}" cy="${currentY}" r="1.5" fill="var(--fg-muted)" />
      ` : ''}

      <!-- Price Labels -->
      <text x="${leftMargin + chartWidth + 4}" y="${tpY}" class="price-label price-label-tp">
        <tspan class="price-label-value">$${formatPrice(takeProfit)}</tspan>
        <tspan class="price-label-pct">${tpPercentage}</tspan>
      </text>

      <text x="${leftMargin + chartWidth + 4}" y="${entryY}" class="price-label price-label-entry">
        <tspan class="price-label-value">$${formatPrice(price)}</tspan>
        <tspan class="price-label-tag">ENTRY</tspan>
      </text>

      <text x="${leftMargin + chartWidth + 4}" y="${slY}" class="price-label price-label-sl">
        <tspan class="price-label-value">$${formatPrice(stopLoss)}</tspan>
        <tspan class="price-label-pct">${slPercentage}</tspan>
      </text>

      ${currentY !== null ? `
        <text x="${leftMargin + chartWidth + 4}" y="${currentY}" class="price-label price-label-current">
          <tspan class="price-label-value">$${formatPrice(currentPrice)}</tspan>
          <tspan class="price-label-tag">NOW</tspan>
        </text>
      ` : ''}

      <!-- R:R Ratio Badge -->
      <text x="${leftMargin + chartWidth / 2}" y="8" class="price-rr-badge">1:${rrRatio.toFixed(1)} R:R</text>
    </svg>
  `;

  return svg.trim();
}
