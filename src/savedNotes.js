/**
 * Saved Notes Utilities
 *
 * Functions for managing saved trade notes including storage,
 * formatting, and serialization.
 */

import { createPriceLevelChart } from './priceLevelChart.js';

// Constants
export const MAX_SAVED_NOTES = 10;
export const STORAGE_KEY = 'traders-voice-notes';
export const MAX_AUDIO_SIZE = 500 * 1024; // 500KB limit for audio storage

/**
 * Convert Blob to base64 data URL
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} - Base64 data URL
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 data URL back to Blob
 * @param {string} base64 - Base64 data URL
 * @returns {Blob} - Reconstructed blob
 */
export function base64ToBlob(base64) {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Format timestamp for display
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {Date} [now] - Optional current date for testing
 * @returns {string} - Formatted date string
 */
export function formatTimestamp(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format number with commas for display
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export function formatNumber(num) {
  if (num >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return num.toFixed(2);
}

/**
 * Format note for clipboard copy
 * @param {Object} note - Note object with text and trade info
 * @returns {string} - Formatted text for clipboard
 */
export function formatNoteForClipboard(note) {
  if (!note) return '';

  let copyText = note.text || '';

  if (note.trade) {
    copyText += '\n\n--- Trade Info ---\n';
    if (note.trade.ticker) copyText += `Ticker: ${note.trade.ticker}\n`;
    if (note.trade.action) copyText += `Action: ${note.trade.action.toUpperCase()}\n`;
    if (note.trade.positionSize) copyText += `Position Size: $${formatNumber(note.trade.positionSize)}\n`;
    if (note.trade.quantity) copyText += `Quantity: ${note.trade.quantity}\n`;
    if (note.trade.price) copyText += `Price: $${formatNumber(note.trade.price)}\n`;
    if (note.trade.stopLoss) copyText += `Stop Loss: $${formatNumber(note.trade.stopLoss)}\n`;
    if (note.trade.takeProfit) copyText += `Take Profit: $${formatNumber(note.trade.takeProfit)}\n`;
  }

  return copyText;
}

/**
 * Render a single saved note's trade info as HTML
 * @param {Object} trade - Trade info object
 * @returns {string} - HTML string
 */
export function renderSavedNoteTrade(trade) {
  if (!trade) return '';

  const actionClass = trade.action || '';
  const actionText = trade.action ? trade.action.toUpperCase() : '';

  let detailsHtml = '';

  const addDetail = (label, value) => {
    detailsHtml += `
      <div class="saved-note-trade-detail">
        <span class="saved-note-trade-detail-label">${label}:</span>
        <span class="saved-note-trade-detail-value">${value}</span>
      </div>`;
  };

  if (trade.positionSize) addDetail('Size', `$${formatNumber(trade.positionSize)}`);
  if (trade.quantity) addDetail('Qty', trade.quantity.toLocaleString());
  if (trade.price) addDetail('Price', `$${formatNumber(trade.price)}`);
  if (trade.stopLoss) addDetail('SL', `$${formatNumber(trade.stopLoss)}`);
  if (trade.takeProfit) addDetail('TP', `$${formatNumber(trade.takeProfit)}`);

  // Generate price chart for saved notes
  let chartHtml = '';
  if (trade.price && trade.stopLoss && trade.takeProfit && trade.action) {
    const chartSvg = createPriceLevelChart(trade);
    if (chartSvg) {
      chartHtml = `<div class="price-chart-container">${chartSvg}</div>`;
    }
  }

  return `
    <div class="saved-note-trade">
      <div class="saved-note-trade-header">
        ${trade.ticker ? `<span class="saved-note-trade-ticker">${trade.ticker}</span>` : '<span></span>'}
        ${actionText ? `<span class="saved-note-trade-action ${actionClass}">${actionText}</span>` : ''}
      </div>
      ${detailsHtml ? `<div class="saved-note-trade-details">${detailsHtml}</div>` : ''}
      ${chartHtml}
    </div>
  `;
}

/**
 * Load saved notes from localStorage
 * @param {Storage} [storage] - Storage interface (default: localStorage)
 * @returns {Array} - Array of saved notes
 */
export function loadSavedNotes(storage = localStorage) {
  try {
    const notes = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}

/**
 * Save notes to localStorage
 * @param {Array} notes - Notes to save
 * @param {Storage} [storage] - Storage interface (default: localStorage)
 */
export function saveSavedNotes(notes, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/**
 * Validate if a note can be saved (not exceeding limit)
 * @param {Array} currentNotes - Current notes array
 * @returns {{ valid: boolean, error?: string }}
 */
export function canSaveNote(currentNotes) {
  if (currentNotes.length >= MAX_SAVED_NOTES) {
    return {
      valid: false,
      error: `Maximum ${MAX_SAVED_NOTES} notes reached. Delete some to save more.`,
    };
  }
  return { valid: true };
}

/**
 * Create a new note object
 * @param {Object} params - Note parameters
 * @param {string} params.text - Note text
 * @param {Object} [params.trade] - Trade info
 * @param {string} [params.audioData] - Base64 audio data
 * @param {number} [params.timestamp] - Timestamp (default: now)
 * @returns {Object} - Note object
 */
export function createNote({ text, trade = null, audioData = null, timestamp = Date.now() }) {
  return {
    id: timestamp,
    timestamp,
    text,
    trade,
    audioData,
  };
}

/**
 * Filter notes by search query
 * @param {Array} notes - Array of notes to filter
 * @param {string} query - Search query (case-insensitive)
 * @returns {Array} - Filtered notes
 */
export function filterNotes(notes, query) {
  if (!query || !query.trim()) {
    return notes;
  }

  const searchTerm = query.toLowerCase().trim();

  return notes.filter((note) => {
    // Search in transcription text
    if (note.text?.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in trade info
    if (!note.trade) {
      return false;
    }

    const trade = note.trade;
    const tradeFields = [
      trade.ticker,
      trade.action,
      trade.timeframe
    ];

    // Check simple string fields
    if (tradeFields.some(field => field?.toLowerCase().includes(searchTerm))) {
      return true;
    }

    // Check indicators array
    if (Array.isArray(trade.indicators)) {
      return trade.indicators.some(ind => ind.toLowerCase().includes(searchTerm));
    }

    return false;
  });
}
