/**
 * Traders Voice - Main Application
 *
 * Local speech-to-text using Whisper AI.
 * All processing happens in-browser, nothing leaves your machine.
 */

import { pipeline, env } from '@huggingface/transformers';
import { extractTradeInfo, generateTradeSummary } from './tradeExtractor.js';
import { createPriceLevelChart } from './priceLevelChart.js';

// Disable local model loading (use Hugging Face CDN)
env.allowLocalModels = false;

// DOM Elements
const recordBtn = document.getElementById('recordBtn');
const statusText = document.getElementById('statusText');
const duration = document.getElementById('duration');
const progressSection = document.getElementById('progressSection');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const resultSection = document.getElementById('resultSection');
const transcription = document.getElementById('transcription');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const modelSelect = document.getElementById('modelSelect');
const modelInfo = document.getElementById('modelInfo');
const tradeCard = document.getElementById('tradeCard');
const errorMsg = document.getElementById('errorMsg');
const recordSection = document.querySelector('.record-section');
const saveBtn = document.getElementById('saveBtn');
const savedNotesSection = document.getElementById('savedNotesSection');
const savedNotesList = document.getElementById('savedNotesList');
const clearAllNotesBtn = document.getElementById('clearAllNotesBtn');

// Constants
const MAX_SAVED_NOTES = 10;
const STORAGE_KEY = 'traders-voice-notes';

// Load saved model preference
const savedModel = localStorage.getItem('traders-voice-model');
if (savedModel && modelSelect.querySelector(`option[value="${savedModel}"]`)) {
  modelSelect.value = savedModel;
}

// Application State
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let durationInterval = null;
let transcriber = null;
let isProcessing = false;
let currentModel = modelSelect.value;
let currentTradeInfo = null;
let currentAudioBlob = null; // Store audio for replay
let currentlyPlayingAudio = null; // Track playing audio element

// Audio visualization state
let audioContext = null;
let analyser = null;
let waveformCanvas = null;
let waveformCtx = null;
let animationId = null;

/**
 * Update model info display
 */
function updateModelInfo() {
  const isEnglish = modelSelect.value.includes('.en');
  modelInfo.textContent = isEnglish ? 'English only' : 'Multilingual';
}

// Initialize model info
updateModelInfo();

/**
 * Format seconds as M:SS
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format number with commas for display
 */
function formatNumber(num) {
  if (num >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return num.toFixed(2);
}

/**
 * Show error message temporarily
 */
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
  setTimeout(() => errorMsg.classList.remove('visible'), 5000);
}

/**
 * Create waveform canvas for audio visualization
 */
function createWaveformCanvas() {
  if (waveformCanvas) return;

  waveformCanvas = document.createElement('canvas');
  waveformCanvas.className = 'waveform-canvas';
  waveformCanvas.width = 200;
  waveformCanvas.height = 60;
  waveformCtx = waveformCanvas.getContext('2d');
}

/**
 * Draw waveform visualization
 */
function drawWaveform() {
  if (!analyser || !waveformCtx) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  // Clear canvas
  waveformCtx.fillStyle = 'transparent';
  waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);

  // Draw waveform
  waveformCtx.lineWidth = 2;
  waveformCtx.strokeStyle = '#ef4444';
  waveformCtx.beginPath();

  const sliceWidth = waveformCanvas.width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * waveformCanvas.height) / 2;

    if (i === 0) {
      waveformCtx.moveTo(x, y);
    } else {
      waveformCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  waveformCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
  waveformCtx.stroke();

  // Draw glow effect
  waveformCtx.shadowBlur = 10;
  waveformCtx.shadowColor = '#ef4444';

  animationId = requestAnimationFrame(drawWaveform);
}

/**
 * Start waveform visualization
 */
function startWaveformVisualization(stream) {
  createWaveformCanvas();

  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  // Insert canvas after duration
  const existingCanvas = recordSection.querySelector('.waveform-canvas');
  if (!existingCanvas) {
    duration.insertAdjacentElement('afterend', waveformCanvas);
  }
  waveformCanvas.style.display = 'block';

  drawWaveform();
}

/**
 * Stop waveform visualization
 */
function stopWaveformVisualization() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  if (waveformCanvas) {
    waveformCanvas.style.display = 'none';
  }

  analyser = null;
}

/**
 * Update UI to reflect current state
 */
function setState(state) {
  recordBtn.className = `record-btn ${state}`;

  switch (state) {
    case 'idle':
      statusText.textContent = 'Click to record';
      statusText.className = 'status-text';
      duration.style.display = 'none';
      progressSection.classList.remove('visible');
      stopWaveformVisualization();
      break;
    case 'recording':
      statusText.textContent = 'Recording...';
      statusText.className = 'status-text recording';
      duration.style.display = 'block';
      progressSection.classList.remove('visible');
      break;
    case 'processing':
      statusText.textContent = 'Processing...';
      statusText.className = 'status-text';
      duration.style.display = 'none';
      progressSection.classList.add('visible');
      stopWaveformVisualization();
      break;
  }
}

/**
 * Resample audio to 16kHz mono (required by Whisper)
 */
async function resampleTo16kMono(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const targetSampleRate = 16000;
  const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate);

  const offlineContext = new OfflineAudioContext(1, numSamples, targetSampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  const resampled = await offlineContext.startRendering();
  await ctx.close();

  return resampled.getChannelData(0);
}

// Progress tracking for model loading
let downloadProgress = {};
let totalFiles = 0;
let completedFiles = 0;

/**
 * Reset progress tracking
 */
function resetProgress() {
  downloadProgress = {};
  totalFiles = 0;
  completedFiles = 0;
}

/**
 * Calculate aggregate progress across all files
 */
function calculateAggregateProgress() {
  if (totalFiles === 0) return 0;

  let totalProgress = completedFiles * 100;
  for (const file in downloadProgress) {
    totalProgress += downloadProgress[file] || 0;
  }

  return Math.min(100, totalProgress / totalFiles);
}

/**
 * Load or retrieve cached Whisper transcriber
 */
async function getTranscriber() {
  const selectedModel = modelSelect.value;

  // Return cached if same model
  if (transcriber && currentModel === selectedModel) {
    return transcriber;
  }

  currentModel = selectedModel;
  resetProgress();
  progressText.textContent = 'Loading model...';
  progressFill.style.width = '0%';

  transcriber = await pipeline('automatic-speech-recognition', selectedModel, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (progress) => {
      const file = progress.file || 'main';

      if (progress.status === 'initiate') {
        totalFiles++;
        downloadProgress[file] = 0;
      } else if (progress.status === 'progress') {
        downloadProgress[file] = progress.progress || 0;
        const aggregate = calculateAggregateProgress();
        progressFill.style.width = `${aggregate}%`;
        progressText.textContent = `Loading model... ${Math.round(aggregate)}%`;
      } else if (progress.status === 'done') {
        completedFiles++;
        delete downloadProgress[file];
        const aggregate = calculateAggregateProgress();
        progressFill.style.width = `${aggregate}%`;
        progressText.textContent = `Loading model... ${Math.round(aggregate)}%`;
      } else if (progress.status === 'ready') {
        progressFill.style.width = '100%';
        progressText.textContent = 'Model ready';
      }
    },
  });

  return transcriber;
}

/**
 * Transcribe audio blob to text
 */
async function transcribe(audioBlob) {
  isProcessing = true;
  setState('processing');

  try {
    progressText.textContent = 'Loading model...';
    progressFill.style.width = '0%';

    const pipe = await getTranscriber();

    progressText.textContent = 'Resampling audio...';
    progressFill.style.width = '33%';

    const audioData = await resampleTo16kMono(audioBlob);

    progressText.textContent = 'Transcribing...';
    progressFill.style.width = '66%';

    const result = await pipe(audioData, {
      return_timestamps: false,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    progressFill.style.width = '100%';
    progressText.textContent = 'Done!';

    const text = result.text?.trim() || '';
    if (text) {
      transcription.textContent = text;
      resultSection.classList.add('visible');

      // Extract and display trade info
      const tradeInfo = extractTradeInfo(text);
      currentTradeInfo = tradeInfo;
      renderTradeCard(tradeInfo);
    } else {
      showError('No speech detected. Try speaking louder or longer.');
      currentTradeInfo = null;
      renderTradeCard(null);
    }
  } catch (err) {
    console.error('Transcription error:', err);
    showError(`Transcription failed: ${err.message}`);
  } finally {
    isProcessing = false;
    setState('idle');
  }
}

/**
 * Start recording from microphone
 */
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Start waveform visualization
    startWaveformVisualization(stream);

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });

    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());

      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        currentAudioBlob = audioBlob; // Store for replay
        await transcribe(audioBlob);
      }
    };

    mediaRecorder.start(100);
    recordingStartTime = Date.now();

    durationInterval = setInterval(() => {
      const elapsed = (Date.now() - recordingStartTime) / 1000;
      duration.textContent = formatDuration(elapsed);
    }, 100);

    setState('recording');
  } catch (err) {
    console.error('Recording error:', err);
    showError('Microphone access denied. Please allow microphone permission.');
  }
}

/**
 * Stop current recording
 */
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    clearInterval(durationInterval);
  }
}

/**
 * Toggle recording state
 */
function toggleRecording() {
  if (isProcessing) return;

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
}

// Event Listeners
recordBtn.addEventListener('click', toggleRecording);

copyBtn.addEventListener('click', async () => {
  const text = transcription.textContent;
  if (text) {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
  }
});

clearBtn.addEventListener('click', () => {
  transcription.textContent = '';
  resultSection.classList.remove('visible');
  renderTradeCard(null);
});

// Keyboard shortcut: Space to toggle recording
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    toggleRecording();
  }
});

// Clear cached transcriber when model changes
modelSelect.addEventListener('change', () => {
  transcriber = null;
  localStorage.setItem('traders-voice-model', modelSelect.value);
  updateModelInfo();
});

/**
 * Calculate percentage change between two prices
 */
function calculatePercentChange(from, to) {
  if (!from || !to) return null;
  return ((to - from) / from) * 100;
}

/**
 * Format percentage with sign
 */
function formatPercent(value) {
  if (value === null || value === undefined) return '';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Calculate risk-reward ratio
 */
function calculateRiskReward(entry, stopLoss, takeProfit) {
  if (!entry || !stopLoss || !takeProfit) return null;
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  if (risk === 0) return null;
  return reward / risk;
}

/**
 * Render trade card with extracted info
 */
function renderTradeCard(trade) {
  if (!trade) {
    tradeCard.classList.remove('visible');
    tradeCard.innerHTML = '';
    return;
  }

  // Determine trade direction
  // Prefer tradeType (long/short) over action (buy/sell) for display
  const displayAction = trade.tradeType || trade.action || '';
  const directionClass = trade.action === 'buy' ? 'long' : trade.action === 'sell' ? 'short' : displayAction.toLowerCase();
  const directionText = displayAction.toUpperCase();

  // Build header with ticker, exchange, and timeframe
  let metaBadges = '';
  if (trade.exchange) {
    metaBadges += `<span class="trade-card-badge">${trade.exchange}</span>`;
  }
  if (trade.timeframe) {
    metaBadges += `<span class="trade-card-badge">${trade.timeframe}</span>`;
  }

  // Build price levels grid
  let pricesHtml = '';

  if (trade.price) {
    pricesHtml += `
      <div class="trade-price-item entry">
        <span class="trade-price-label">Entry</span>
        <span class="trade-price-value">$${formatNumber(trade.price)}</span>
      </div>`;
  }

  if (trade.stopLoss) {
    const slChange = calculatePercentChange(trade.price, trade.stopLoss);
    pricesHtml += `
      <div class="trade-price-item stop-loss">
        <span class="trade-price-label">Stop Loss</span>
        <span class="trade-price-value">$${formatNumber(trade.stopLoss)}</span>
        ${slChange !== null ? `<span class="trade-price-change negative">${formatPercent(slChange)}</span>` : ''}
      </div>`;
  }

  if (trade.takeProfit) {
    const tpChange = calculatePercentChange(trade.price, trade.takeProfit);
    pricesHtml += `
      <div class="trade-price-item take-profit">
        <span class="trade-price-label">Take Profit</span>
        <span class="trade-price-value">$${formatNumber(trade.takeProfit)}</span>
        ${tpChange !== null ? `<span class="trade-price-change positive">${formatPercent(tpChange)}</span>` : ''}
      </div>`;
  }

  // Calculate and display R:R ratio
  const rrRatio = calculateRiskReward(trade.price, trade.stopLoss, trade.takeProfit);
  if (rrRatio !== null) {
    pricesHtml += `
      <div class="trade-price-item">
        <span class="trade-price-label">R:R Ratio</span>
        <span class="trade-price-value">1:${rrRatio.toFixed(2)}</span>
      </div>`;
  }

  // Build position details section
  let positionHtml = '';

  if (trade.positionSize) {
    positionHtml += `
      <div class="trade-position-item">
        <span class="trade-position-label">Position Size</span>
        <span class="trade-position-value">$${formatNumber(trade.positionSize)}</span>
      </div>`;
  }

  if (trade.quantity) {
    const ticker = trade.ticker ? trade.ticker.split('/')[0] : '';
    positionHtml += `
      <div class="trade-position-item">
        <span class="trade-position-label">Quantity</span>
        <span class="trade-position-value">${formatNumber(trade.quantity)} ${ticker}</span>
      </div>`;
  }

  if (trade.leverage) {
    positionHtml += `
      <div class="trade-position-item">
        <span class="trade-position-label">Leverage</span>
        <span class="trade-position-value">${trade.leverage}x</span>
      </div>`;
  }

  // Build indicators section
  let indicatorsHtml = '';
  if (trade.indicators && Array.isArray(trade.indicators) && trade.indicators.length > 0) {
    const indicatorBadges = trade.indicators
      .map(ind => `<span class="trade-indicator-badge">${ind}</span>`)
      .join('');
    indicatorsHtml = `
      <div class="trade-card-indicators">
        <div class="trade-indicators-label">Indicators</div>
        <div class="trade-indicators-list">${indicatorBadges}</div>
      </div>`;
  }

  // Generate price chart if we have the necessary data
  let chartHtml = '';
  if (trade.price && trade.stopLoss && trade.takeProfit && trade.action) {
    const chartSvg = createPriceLevelChart(trade);
    if (chartSvg) {
      chartHtml = `<div class="price-chart-container">${chartSvg}</div>`;
    }
  }

  // Build the complete trade card
  tradeCard.innerHTML = `
    <div class="trade-card-content">
      <div class="trade-card-header">
        <div class="trade-card-ticker-group">
          ${trade.ticker ? `<div class="trade-card-ticker">${trade.ticker}</div>` : '<div class="trade-card-ticker">Trade</div>'}
          ${metaBadges ? `<div class="trade-card-meta">${metaBadges}</div>` : ''}
        </div>
        ${directionText ? `<div class="trade-card-direction ${directionClass}">${directionText}</div>` : ''}
      </div>
      ${pricesHtml ? `<div class="trade-card-prices">${pricesHtml}</div>` : ''}
      ${positionHtml ? `<div class="trade-card-position">${positionHtml}</div>` : ''}
      ${indicatorsHtml}
      ${chartHtml}
      <div class="trade-summary">${generateTradeSummary(trade)}</div>
    </div>
  `;

  tradeCard.classList.add('visible');
}

// ============================================
// SAVED NOTES FUNCTIONALITY
// ============================================

/**
 * Convert a Blob to base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string back to Blob
 */
function base64ToBlob(base64) {
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
 * Play audio from a saved note
 */
function playNoteAudio(index) {
  const notes = loadSavedNotes();
  const note = notes[index];
  if (!note || !note.audioData) {
    showError('No audio available for this note');
    return;
  }

  // Stop any currently playing audio
  if (currentlyPlayingAudio) {
    currentlyPlayingAudio.pause();
    currentlyPlayingAudio = null;
    // Reset all play buttons
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.textContent = '▶';
      btn.classList.remove('playing');
    });
  }

  const blob = base64ToBlob(note.audioData);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  const playBtn = savedNotesList.querySelector(`[data-index="${index}"] .play-btn`);

  audio.onplay = () => {
    if (playBtn) {
      playBtn.textContent = '⏹';
      playBtn.classList.add('playing');
    }
  };

  audio.onended = () => {
    URL.revokeObjectURL(url);
    currentlyPlayingAudio = null;
    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
    }
  };

  audio.onerror = () => {
    URL.revokeObjectURL(url);
    currentlyPlayingAudio = null;
    showError('Failed to play audio');
    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
    }
  };

  currentlyPlayingAudio = audio;
  audio.play();
}

/**
 * Stop currently playing audio
 */
function stopAudio() {
  if (currentlyPlayingAudio) {
    currentlyPlayingAudio.pause();
    currentlyPlayingAudio = null;
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.textContent = '▶';
      btn.classList.remove('playing');
    });
  }
}

/**
 * Load saved notes from localStorage
 */
function loadSavedNotes() {
  try {
    const notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}

/**
 * Save notes to localStorage
 */
function saveSavedNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
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
 * Render a single saved note's trade info
 */
function renderSavedNoteTrade(trade) {
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
 * Render all saved notes
 */
function renderSavedNotes() {
  const notes = loadSavedNotes();

  if (notes.length === 0) {
    savedNotesSection.classList.remove('visible');
    return;
  }

  savedNotesSection.classList.add('visible');

  savedNotesList.innerHTML = notes
    .map(
      (note, index) => `
      <div class="saved-note" data-index="${index}">
        <div class="saved-note-header">
          <span class="saved-note-time">${formatTimestamp(note.timestamp)}</span>
          <div class="saved-note-actions">
            ${note.audioData ? `<button class="saved-note-btn play-btn" title="Play audio">▶</button>` : ''}
            <button class="saved-note-btn copy" title="Copy to clipboard">Copy</button>
            <button class="saved-note-btn delete" title="Delete note">Delete</button>
          </div>
        </div>
        <div class="saved-note-text">${escapeHtml(note.text)}</div>
        ${renderSavedNoteTrade(note.trade)}
      </div>
    `
    )
    .join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Save current note with audio
 */
async function saveCurrentNote() {
  const text = transcription.textContent?.trim();
  if (!text) {
    showError('No transcription to save');
    return;
  }

  const notes = loadSavedNotes();

  // Check limit
  if (notes.length >= MAX_SAVED_NOTES) {
    showError(`Maximum ${MAX_SAVED_NOTES} notes reached. Delete some to save more.`);
    return;
  }

  // Convert audio blob to base64 if available
  let audioData = null;
  if (currentAudioBlob) {
    try {
      audioData = await blobToBase64(currentAudioBlob);
    } catch (err) {
      console.warn('Failed to save audio:', err);
    }
  }

  // Add new note at the beginning
  notes.unshift({
    id: Date.now(),
    timestamp: Date.now(),
    text: text,
    trade: currentTradeInfo,
    audioData: audioData,
  });

  saveSavedNotes(notes);
  renderSavedNotes();

  // Visual feedback
  saveBtn.textContent = 'Saved!';
  setTimeout(() => (saveBtn.textContent = 'Save Note'), 1500);
}

/**
 * Delete a saved note by index
 */
function deleteSavedNote(index) {
  const notes = loadSavedNotes();
  notes.splice(index, 1);
  saveSavedNotes(notes);
  renderSavedNotes();
}

/**
 * Copy a saved note to clipboard
 */
async function copySavedNote(index) {
  const notes = loadSavedNotes();
  const note = notes[index];
  if (!note) return;

  let copyText = note.text;

  // Add trade info if available
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

  await navigator.clipboard.writeText(copyText);

  // Visual feedback
  const noteEl = savedNotesList.querySelector(`[data-index="${index}"] .copy`);
  if (noteEl) {
    noteEl.textContent = 'Copied!';
    setTimeout(() => (noteEl.textContent = 'Copy'), 1500);
  }
}

/**
 * Clear all saved notes
 */
function clearAllNotes() {
  if (confirm('Delete all saved notes? This cannot be undone.')) {
    saveSavedNotes([]);
    renderSavedNotes();
  }
}

// Event listeners for saved notes
saveBtn.addEventListener('click', saveCurrentNote);

clearAllNotesBtn.addEventListener('click', clearAllNotes);

savedNotesList.addEventListener('click', (e) => {
  const noteEl = e.target.closest('.saved-note');
  if (!noteEl) return;

  const index = parseInt(noteEl.dataset.index, 10);

  if (e.target.classList.contains('delete')) {
    deleteSavedNote(index);
  } else if (e.target.classList.contains('copy')) {
    copySavedNote(index);
  } else if (e.target.classList.contains('play-btn')) {
    // Toggle play/stop
    if (e.target.classList.contains('playing')) {
      stopAudio();
    } else {
      playNoteAudio(index);
    }
  }
});

// Initialize saved notes on page load
renderSavedNotes();
