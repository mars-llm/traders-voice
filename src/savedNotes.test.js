import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MAX_SAVED_NOTES,
  STORAGE_KEY,
  blobToBase64,
  base64ToBlob,
  formatTimestamp,
  escapeHtml,
  formatNumber,
  formatNoteForClipboard,
  renderSavedNoteTrade,
  loadSavedNotes,
  saveSavedNotes,
  canSaveNote,
  createNote,
  filterNotes,
} from './savedNotes.js';

describe('Constants', () => {
  it('MAX_SAVED_NOTES is 10', () => {
    expect(MAX_SAVED_NOTES).toBe(10);
  });

  it('STORAGE_KEY is traders-voice-notes', () => {
    expect(STORAGE_KEY).toBe('traders-voice-notes');
  });
});

describe('blobToBase64', () => {
  it('converts a text blob to base64', async () => {
    const blob = new Blob(['Hello World'], { type: 'text/plain' });
    const result = await blobToBase64(blob);

    expect(result).toContain('data:text/plain;base64,');
    expect(result).toContain('SGVsbG8gV29ybGQ='); // "Hello World" in base64
  });

  it('converts an audio blob to base64', async () => {
    // Create a simple audio-like blob
    const audioData = new Uint8Array([0, 1, 2, 3, 4, 5]);
    const blob = new Blob([audioData], { type: 'audio/webm' });
    const result = await blobToBase64(blob);

    expect(result).toContain('data:audio/webm;base64,');
  });

  it('preserves the mime type', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    const result = await blobToBase64(blob);

    expect(result.startsWith('data:application/json;base64,')).toBe(true);
  });
});

describe('base64ToBlob', () => {
  it('converts base64 back to blob with correct mime type', () => {
    const base64 = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
    const blob = base64ToBlob(base64);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
  });

  it('preserves audio mime type', () => {
    const base64 = 'data:audio/webm;base64,AAECAwQF';
    const blob = base64ToBlob(base64);

    expect(blob.type).toBe('audio/webm');
  });

  it('round-trips text data correctly', async () => {
    const originalText = 'Test message 123';
    const originalBlob = new Blob([originalText], { type: 'text/plain' });

    const base64 = await blobToBase64(originalBlob);
    const recoveredBlob = base64ToBlob(base64);

    // Use FileReader to read blob text (jsdom Blob doesn't have .text())
    const recoveredText = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsText(recoveredBlob);
    });
    expect(recoveredText).toBe(originalText);
  });

  it('round-trips binary data correctly', async () => {
    const originalData = new Uint8Array([0, 127, 255, 42, 100]);
    const originalBlob = new Blob([originalData], { type: 'application/octet-stream' });

    const base64 = await blobToBase64(originalBlob);
    const recoveredBlob = base64ToBlob(base64);

    // Use FileReader to read blob as array buffer (jsdom Blob doesn't have .arrayBuffer())
    const recoveredBuffer = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsArrayBuffer(recoveredBlob);
    });
    const recoveredData = new Uint8Array(recoveredBuffer);

    expect(Array.from(recoveredData)).toEqual(Array.from(originalData));
  });
});

describe('formatTimestamp', () => {
  it('shows "Today at" for timestamps from today', () => {
    const now = new Date('2024-03-15T14:30:00');
    const timestamp = new Date('2024-03-15T10:30:00').getTime();

    const result = formatTimestamp(timestamp, now);

    expect(result).toContain('Today at');
    expect(result).toContain('10:30');
  });

  it('shows date for timestamps from other days', () => {
    const now = new Date('2024-03-15T14:30:00');
    const timestamp = new Date('2024-03-10T10:30:00').getTime();

    const result = formatTimestamp(timestamp, now);

    expect(result).toContain('Mar 10');
    expect(result).toContain('at');
  });

  it('formats morning time correctly', () => {
    const now = new Date('2024-03-15T08:00:00');
    const timestamp = new Date('2024-03-15T09:15:00').getTime();

    const result = formatTimestamp(timestamp, now);

    expect(result).toMatch(/Today at 9:15\s*AM/);
  });

  it('formats evening time correctly', () => {
    const now = new Date('2024-03-15T20:00:00');
    const timestamp = new Date('2024-03-15T20:45:00').getTime();

    const result = formatTimestamp(timestamp, now);

    expect(result).toMatch(/Today at 8:45\s*PM/);
  });

  it('handles midnight correctly', () => {
    const now = new Date('2024-03-15T01:00:00');
    const timestamp = new Date('2024-03-15T00:00:00').getTime();

    const result = formatTimestamp(timestamp, now);

    expect(result).toMatch(/Today at 12:00\s*AM/);
  });

  it('handles noon correctly', () => {
    const now = new Date('2024-03-15T14:00:00');
    const timestamp = new Date('2024-03-15T12:00:00').getTime();

    const result = formatTimestamp(timestamp, now);

    expect(result).toMatch(/Today at 12:00\s*PM/);
  });
});

describe('escapeHtml', () => {
  it('escapes < and > characters', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('escapes & character', () => {
    const result = escapeHtml('Tom & Jerry');
    expect(result).toContain('&amp;');
  });

  it('preserves quotes (not in attribute context)', () => {
    // Note: textContent/innerHTML escapes <, >, & but not quotes
    // Quotes only need escaping in attribute contexts
    const result = escapeHtml('He said "hello"');
    expect(result).toBe('He said "hello"');
  });

  it('leaves plain text unchanged', () => {
    const result = escapeHtml('Hello World');
    expect(result).toBe('Hello World');
  });

  it('handles empty string', () => {
    const result = escapeHtml('');
    expect(result).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats small numbers with 2 decimal places', () => {
    expect(formatNumber(1.5)).toBe('1.50');
    expect(formatNumber(99.99)).toBe('99.99');
  });

  it('formats thousands with commas', () => {
    const result = formatNumber(1000);
    expect(result).toBe('1,000');
  });

  it('formats large numbers with commas', () => {
    const result = formatNumber(95000);
    expect(result).toBe('95,000');
  });

  it('formats decimals in large numbers', () => {
    const result = formatNumber(1234.56);
    expect(result).toBe('1,234.56');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0.00');
  });
});

describe('formatNoteForClipboard', () => {
  it('returns empty string for null note', () => {
    expect(formatNoteForClipboard(null)).toBe('');
  });

  it('returns just text when no trade info', () => {
    const note = { text: 'Buy Bitcoin at support' };
    const result = formatNoteForClipboard(note);

    expect(result).toBe('Buy Bitcoin at support');
  });

  it('includes trade info header when trade exists', () => {
    const note = {
      text: 'Trade idea',
      trade: { ticker: 'BTC' },
    };
    const result = formatNoteForClipboard(note);

    expect(result).toContain('--- Trade Info ---');
    expect(result).toContain('Ticker: BTC');
  });

  it('formats complete trade info', () => {
    const note = {
      text: 'Buy Bitcoin',
      trade: {
        ticker: 'BTC',
        action: 'buy',
        positionSize: 5000,
        quantity: 0.05,
        price: 95000,
        stopLoss: 92000,
        takeProfit: 105000,
      },
    };
    const result = formatNoteForClipboard(note);

    expect(result).toContain('Buy Bitcoin');
    expect(result).toContain('Ticker: BTC');
    expect(result).toContain('Action: BUY');
    expect(result).toContain('Position Size: $5,000');
    expect(result).toContain('Quantity: 0.05');
    expect(result).toContain('Price: $95,000');
    expect(result).toContain('Stop Loss: $92,000');
    expect(result).toContain('Take Profit: $105,000');
  });

  it('only includes fields that exist', () => {
    const note = {
      text: 'Simple trade',
      trade: {
        ticker: 'ETH',
        action: 'sell',
      },
    };
    const result = formatNoteForClipboard(note);

    expect(result).toContain('Ticker: ETH');
    expect(result).toContain('Action: SELL');
    expect(result).not.toContain('Position Size');
    expect(result).not.toContain('Stop Loss');
  });

  it('uppercases action', () => {
    const note = {
      text: 'Test',
      trade: { action: 'buy' },
    };
    const result = formatNoteForClipboard(note);

    expect(result).toContain('Action: BUY');
  });
});

describe('renderSavedNoteTrade', () => {
  it('returns empty string for null trade', () => {
    expect(renderSavedNoteTrade(null)).toBe('');
  });

  it('returns empty string for undefined trade', () => {
    expect(renderSavedNoteTrade(undefined)).toBe('');
  });

  it('includes trade wrapper div', () => {
    const trade = { ticker: 'BTC' };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('<div class="saved-note-trade">');
    expect(result).toContain('</div>');
  });

  it('renders ticker', () => {
    const trade = { ticker: 'BTC' };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('saved-note-trade-ticker');
    expect(result).toContain('BTC');
  });

  it('renders action with correct class', () => {
    const trade = { action: 'buy' };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('saved-note-trade-action');
    expect(result).toContain('buy'); // class
    expect(result).toContain('BUY'); // text
  });

  it('renders sell action', () => {
    const trade = { action: 'sell' };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('sell'); // class
    expect(result).toContain('SELL'); // text
  });

  it('renders position size with dollar sign', () => {
    const trade = { positionSize: 5000 };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('Size:');
    expect(result).toContain('$5,000');
  });

  it('renders quantity with locale formatting', () => {
    const trade = { quantity: 1000 };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('Qty:');
    expect(result).toContain('1,000');
  });

  it('renders price', () => {
    const trade = { price: 95000 };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('Price:');
    expect(result).toContain('$95,000');
  });

  it('renders stop loss', () => {
    const trade = { stopLoss: 92000 };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('SL:');
    expect(result).toContain('$92,000');
  });

  it('renders take profit', () => {
    const trade = { takeProfit: 105000 };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('TP:');
    expect(result).toContain('$105,000');
  });

  it('includes price chart when all fields present', () => {
    const trade = {
      price: 100,
      stopLoss: 90,
      takeProfit: 120,
      action: 'buy',
    };
    const result = renderSavedNoteTrade(trade);

    expect(result).toContain('price-chart-container');
    expect(result).toContain('<svg');
  });

  it('omits price chart when fields missing', () => {
    const trade = {
      price: 100,
      stopLoss: 90,
      // No takeProfit
      action: 'buy',
    };
    const result = renderSavedNoteTrade(trade);

    expect(result).not.toContain('price-chart-container');
  });
});

describe('loadSavedNotes', () => {
  it('returns empty array when storage is empty', () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
    };
    const result = loadSavedNotes(mockStorage);

    expect(result).toEqual([]);
  });

  it('parses stored JSON', () => {
    const notes = [{ id: 1, text: 'Test' }];
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify(notes)),
    };
    const result = loadSavedNotes(mockStorage);

    expect(result).toEqual(notes);
  });

  it('returns empty array for invalid JSON', () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue('not valid json'),
    };
    const result = loadSavedNotes(mockStorage);

    expect(result).toEqual([]);
  });

  it('returns empty array if stored value is not an array', () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ not: 'an array' })),
    };
    const result = loadSavedNotes(mockStorage);

    expect(result).toEqual([]);
  });

  it('uses correct storage key', () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue('[]'),
    };
    loadSavedNotes(mockStorage);

    expect(mockStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

describe('saveSavedNotes', () => {
  it('stores notes as JSON', () => {
    const mockStorage = {
      setItem: vi.fn(),
    };
    const notes = [{ id: 1, text: 'Test' }];

    saveSavedNotes(notes, mockStorage);

    expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(notes));
  });

  it('stores empty array', () => {
    const mockStorage = {
      setItem: vi.fn(),
    };

    saveSavedNotes([], mockStorage);

    expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, '[]');
  });

  it('preserves note structure', () => {
    const mockStorage = {
      setItem: vi.fn(),
    };
    const note = {
      id: 123,
      timestamp: 1234567890,
      text: 'Buy BTC',
      trade: { ticker: 'BTC', action: 'buy' },
      audioData: 'data:audio/webm;base64,abc',
    };

    saveSavedNotes([note], mockStorage);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0]).toEqual(note);
  });
});

describe('canSaveNote', () => {
  it('returns valid: true when under limit', () => {
    const notes = new Array(5).fill({ id: 1 });
    const result = canSaveNote(notes);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid: true when at limit - 1', () => {
    const notes = new Array(9).fill({ id: 1 });
    const result = canSaveNote(notes);

    expect(result.valid).toBe(true);
  });

  it('returns valid: false when at limit', () => {
    const notes = new Array(10).fill({ id: 1 });
    const result = canSaveNote(notes);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum');
    expect(result.error).toContain('10');
  });

  it('returns valid: false when over limit', () => {
    const notes = new Array(15).fill({ id: 1 });
    const result = canSaveNote(notes);

    expect(result.valid).toBe(false);
  });

  it('returns valid: true for empty array', () => {
    const result = canSaveNote([]);

    expect(result.valid).toBe(true);
  });
});

describe('createNote', () => {
  it('creates note with required text', () => {
    const note = createNote({ text: 'Buy Bitcoin' });

    expect(note.text).toBe('Buy Bitcoin');
    expect(note.id).toBeDefined();
    expect(note.timestamp).toBeDefined();
  });

  it('includes trade info when provided', () => {
    const trade = { ticker: 'BTC', action: 'buy' };
    const note = createNote({ text: 'Trade', trade });

    expect(note.trade).toEqual(trade);
  });

  it('includes audio data when provided', () => {
    const audioData = 'data:audio/webm;base64,abc';
    const note = createNote({ text: 'Trade', audioData });

    expect(note.audioData).toBe(audioData);
  });

  it('uses provided timestamp', () => {
    const timestamp = 1234567890;
    const note = createNote({ text: 'Trade', timestamp });

    expect(note.timestamp).toBe(timestamp);
    expect(note.id).toBe(timestamp);
  });

  it('defaults trade to null', () => {
    const note = createNote({ text: 'Simple note' });

    expect(note.trade).toBeNull();
  });

  it('defaults audioData to null', () => {
    const note = createNote({ text: 'Simple note' });

    expect(note.audioData).toBeNull();
  });

  it('creates unique ids from timestamp', () => {
    const note1 = createNote({ text: 'First', timestamp: 1000 });
    const note2 = createNote({ text: 'Second', timestamp: 2000 });

    expect(note1.id).not.toBe(note2.id);
  });
});

describe('Integration: save and load round-trip', () => {
  it('saves and loads notes correctly', () => {
    const storage = new Map();
    const mockStorage = {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    };

    const note1 = createNote({ text: 'First note', timestamp: 1000 });
    const note2 = createNote({
      text: 'Second note',
      trade: { ticker: 'ETH', action: 'sell' },
      timestamp: 2000,
    });

    saveSavedNotes([note1, note2], mockStorage);
    const loaded = loadSavedNotes(mockStorage);

    expect(loaded).toHaveLength(2);
    expect(loaded[0].text).toBe('First note');
    expect(loaded[1].text).toBe('Second note');
    expect(loaded[1].trade.ticker).toBe('ETH');
  });

  it('handles empty notes list', () => {
    const storage = new Map();
    const mockStorage = {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    };

    saveSavedNotes([], mockStorage);
    const loaded = loadSavedNotes(mockStorage);

    expect(loaded).toEqual([]);
  });
});

describe('filterNotes', () => {
  const createTestNote = (text, trade = null) => ({
    id: Date.now(),
    timestamp: Date.now(),
    text,
    trade,
    audioData: null,
  });

  it('returns all notes when query is empty', () => {
    const notes = [
      createTestNote('Buy Bitcoin at 95k'),
      createTestNote('Sell Ethereum at 3500'),
    ];

    const result = filterNotes(notes, '');

    expect(result).toEqual(notes);
  });

  it('returns all notes when query is null', () => {
    const notes = [createTestNote('Test note')];

    const result = filterNotes(notes, null);

    expect(result).toEqual(notes);
  });

  it('returns all notes when query is only whitespace', () => {
    const notes = [createTestNote('Test note')];

    const result = filterNotes(notes, '   ');

    expect(result).toEqual(notes);
  });

  it('filters by transcription text (case-insensitive)', () => {
    const notes = [
      createTestNote('Buy Bitcoin at support'),
      createTestNote('Sell Ethereum at resistance'),
      createTestNote('Long Gold on breakout'),
    ];

    const result = filterNotes(notes, 'bitcoin');

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Buy Bitcoin at support');
  });

  it('filters by transcription text (uppercase query)', () => {
    const notes = [
      createTestNote('Buy bitcoin at support'),
      createTestNote('Sell ethereum at resistance'),
    ];

    const result = filterNotes(notes, 'BITCOIN');

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('bitcoin');
  });

  it('filters by ticker symbol', () => {
    const notes = [
      createTestNote('Trade idea', { ticker: 'BTC' }),
      createTestNote('Another trade', { ticker: 'ETH' }),
      createTestNote('Third trade', { ticker: 'EURUSD' }),
    ];

    const result = filterNotes(notes, 'btc');

    expect(result).toHaveLength(1);
    expect(result[0].trade.ticker).toBe('BTC');
  });

  it('filters by action (buy/sell)', () => {
    const notes = [
      createTestNote('Trade 1', { action: 'buy' }),
      createTestNote('Trade 2', { action: 'sell' }),
      createTestNote('Trade 3', { action: 'buy' }),
    ];

    const result = filterNotes(notes, 'buy');

    expect(result).toHaveLength(2);
    expect(result.every((n) => n.trade.action === 'buy')).toBe(true);
  });

  it('filters by action (long/short)', () => {
    const notes = [
      createTestNote('Trade 1', { action: 'long' }),
      createTestNote('Trade 2', { action: 'short' }),
    ];

    const result = filterNotes(notes, 'short');

    expect(result).toHaveLength(1);
    expect(result[0].trade.action).toBe('short');
  });

  it('filters by timeframe', () => {
    const notes = [
      createTestNote('Trade 1', { timeframe: '4-hour' }),
      createTestNote('Trade 2', { timeframe: 'daily' }),
      createTestNote('Trade 3', { timeframe: '15-minute' }),
    ];

    const result = filterNotes(notes, '4-hour');

    expect(result).toHaveLength(1);
    expect(result[0].trade.timeframe).toBe('4-hour');
  });

  it('filters by indicators', () => {
    const notes = [
      createTestNote('Trade 1', { indicators: ['RSI', 'MACD'] }),
      createTestNote('Trade 2', { indicators: ['EMA', 'VWAP'] }),
      createTestNote('Trade 3', { indicators: ['Bollinger Bands', 'RSI'] }),
    ];

    const result = filterNotes(notes, 'rsi');

    expect(result).toHaveLength(2);
    expect(result.every((n) => n.trade.indicators.some((i) => i.toLowerCase().includes('rsi')))).toBe(true);
  });

  it('matches partial strings', () => {
    const notes = [
      createTestNote('Buy Bitcoin at support level'),
      createTestNote('Sell Ethereum'),
    ];

    const result = filterNotes(notes, 'bit');

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('Bitcoin');
  });

  it('trims whitespace from query', () => {
    const notes = [createTestNote('Buy Bitcoin')];

    const result = filterNotes(notes, '  bitcoin  ');

    expect(result).toHaveLength(1);
  });

  it('returns empty array when no matches', () => {
    const notes = [
      createTestNote('Buy Bitcoin'),
      createTestNote('Sell Ethereum'),
    ];

    const result = filterNotes(notes, 'gold');

    expect(result).toEqual([]);
  });

  it('searches across multiple fields', () => {
    const note1 = createTestNote('Random text', {
      ticker: 'BTC',
      action: 'buy',
      timeframe: 'daily',
    });
    const note2 = createTestNote('Different text', {
      ticker: 'ETH',
      action: 'sell',
    });

    // Should match note1 by ticker
    const result1 = filterNotes([note1, note2], 'btc');
    expect(result1).toHaveLength(1);
    expect(result1[0].trade.ticker).toBe('BTC');

    // Should match note1 by action
    const result2 = filterNotes([note1, note2], 'buy');
    expect(result2).toHaveLength(1);
    expect(result2[0].trade.action).toBe('buy');

    // Should match note1 by timeframe
    const result3 = filterNotes([note1, note2], 'daily');
    expect(result3).toHaveLength(1);
    expect(result3[0].trade.timeframe).toBe('daily');
  });

  it('handles notes without trade info', () => {
    const notes = [
      createTestNote('Simple note without trade'),
      createTestNote('Trade note', { ticker: 'BTC' }),
    ];

    const result = filterNotes(notes, 'simple');

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Simple note without trade');
  });

  it('handles undefined trade fields gracefully', () => {
    const notes = [
      createTestNote('Note 1', { ticker: 'BTC' }), // No action
      createTestNote('Note 2', { action: 'buy' }), // No ticker
    ];

    // Should not throw errors
    expect(() => filterNotes(notes, 'btc')).not.toThrow();
    expect(() => filterNotes(notes, 'buy')).not.toThrow();

    const result1 = filterNotes(notes, 'btc');
    expect(result1).toHaveLength(1);

    const result2 = filterNotes(notes, 'buy');
    expect(result2).toHaveLength(1);
  });
});
