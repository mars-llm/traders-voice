/**
 * Traders Voice - Main Application
 *
 * Local speech-to-text using Whisper AI.
 * All processing happens in-browser, nothing leaves your machine.
 */

import { pipeline, env } from '@huggingface/transformers';
import { extractTradeInfo, generateTradeSummary } from './tradeExtractor.js';
import { createPriceLevelChart, calculateRiskReward } from './priceLevelChart.js';
import {
  MAX_SAVED_NOTES,
  STORAGE_KEY,
  blobToBase64,
  base64ToBlob,
  formatTimestamp,
  escapeHtml,
  formatNumber as formatSavedNoteNumber,
  formatNoteForClipboard,
  renderSavedNoteTrade,
  loadSavedNotes,
  saveSavedNotes,
  canSaveNote,
  createNote,
} from './savedNotes.js';
import { getNextDemo, resetDemoCycle } from './demoData.js';

// Disable local model loading (use Hugging Face CDN)
env.allowLocalModels = false;

// Audio visualization constants
const WAVEFORM_WIDTH = 200;
const WAVEFORM_HEIGHT = 60;
const ANALYZER_FFT_SIZE = 256;

// Whisper transcription settings
const WHISPER_CHUNK_LENGTH = 30;
const WHISPER_STRIDE_LENGTH = 5;

// UI constants
const TOOLTIP_OFFSET = 30;

// Check for SharedArrayBuffer availability (required for ONNX/Whisper)
// Use crossOriginIsolated which is the proper check for COOP/COEP headers
// Don't show error immediately - give service worker time to set up and reload
if (!window.crossOriginIsolated) {
  // Only show error after a delay to allow service worker to reload the page
  // If the SW reloads us, this timeout won't fire
  setTimeout(() => {
    // Double-check after delay - SW might have fixed it
    if (!window.crossOriginIsolated && typeof SharedArrayBuffer === 'undefined') {
      console.error('SharedArrayBuffer not available. COOP/COEP headers may not be set.');
      const errorEl = document.getElementById('errorMsg');
      if (errorEl) {
        errorEl.textContent = 'Browser security headers not configured. Try reloading the page.';
        errorEl.classList.add('visible');
      }
    }
  }, 2000);
}

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

// Note: MAX_SAVED_NOTES and STORAGE_KEY are imported from savedNotes.js

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
let currentAudioURL = null; // Track blob URL to prevent memory leaks
let tradeCardCollapsed = false; // Track collapsed state

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
  const isEnglishOnly = modelSelect.value.includes('.en');
  const infoText = modelInfo.querySelector('.model-info-text');
  if (infoText) {
    infoText.textContent = isEnglishOnly ? 'English only' : 'Multilingual';
  }
}

// Initialize model info
updateModelInfo();

// Model info button - show tooltip with model details
const modelInfoBtn = document.getElementById('modelInfoBtn');
if (modelInfoBtn) {
  modelInfoBtn.addEventListener('click', () => {
    const selectedOption = modelSelect.options[modelSelect.selectedIndex];
    const modelName = selectedOption.dataset.model || selectedOption.value;
    const isEnglishOnly = modelSelect.value.includes('.en');

    alert(
      `Model: ${modelName}\n\n` +
      `• Fast: Starts quickest, good for short notes\n` +
      `• Balanced: Good speed and accuracy (recommended)\n` +
      `• Best accuracy: Most accurate, larger download\n\n` +
      `${isEnglishOnly ? 'English optimized' : 'Supports multiple languages'}\n` +
      `Downloaded once, then cached for offline use.`
    );
  });
}

/**
 * Format seconds as M:SS
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
 * Update .has-content class on right panel (fallback for browsers without :has() support)
 */
function updateRightPanelContent() {
  const rightPanel = document.querySelector('.right-panel');
  if (!rightPanel) return;

  const hasContent = progressSection.classList.contains('visible') ||
                     resultSection.classList.contains('visible') ||
                     tradeCard.classList.contains('visible');

  rightPanel.classList.toggle('has-content', hasContent);
}

/**
 * Create waveform canvas for audio visualization
 */
function createWaveformCanvas() {
  if (waveformCanvas) return;

  waveformCanvas = document.createElement('canvas');
  waveformCanvas.className = 'waveform-canvas';
  waveformCanvas.width = WAVEFORM_WIDTH;
  waveformCanvas.height = WAVEFORM_HEIGHT;
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
  analyser.fftSize = ANALYZER_FFT_SIZE;

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
  updateRightPanelContent();
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
 * Show error with retry button in progress section
 */
function showModelError(message) {
  progressFill.style.width = '0%';
  progressText.innerHTML = `
    ${message}
    <button class="retry-btn" id="retryModelBtn">Retry</button>
  `;

  // Wire up retry handler (innerHTML creates fresh element, so no duplicate listeners)
  const retryBtn = document.getElementById('retryModelBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      transcriber = null;
      try {
        await getTranscriber();
      } catch (err) {
        console.error('Retry failed:', err);
        showModelError('Failed to download model. Check your connection and try again.');
      }
    });
  }
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
  progressText.textContent = 'Checking model cache...';
  progressFill.style.width = '0%';

  let isDownloading = false;

  try {
    transcriber = await pipeline('automatic-speech-recognition', selectedModel, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (progress) => {
        const file = progress.file || 'main';

        if (progress.status === 'initiate') {
          totalFiles++;
          downloadProgress[file] = 0;
          // If we see file initiation, we're downloading (not cached)
          if (!isDownloading) {
            isDownloading = true;
            progressText.textContent = 'Downloading model...';
          }
        } else if (progress.status === 'progress') {
          downloadProgress[file] = progress.progress || 0;
          const aggregate = calculateAggregateProgress();
          progressFill.style.width = `${aggregate}%`;
          progressText.textContent = `Downloading model... ${Math.round(aggregate)}%`;
        } else if (progress.status === 'done') {
          completedFiles++;
          delete downloadProgress[file];
          const aggregate = calculateAggregateProgress();
          progressFill.style.width = `${aggregate}%`;
          if (aggregate < 100) {
            progressText.textContent = `Downloading model... ${Math.round(aggregate)}%`;
          } else {
            progressText.textContent = 'Initializing...';
          }
        } else if (progress.status === 'ready') {
          progressFill.style.width = '100%';
          progressText.textContent = 'Ready · Cached for offline use';
        }
      },
    });

    return transcriber;
  } catch (err) {
    console.error('Model loading failed:', err);
    showModelError('Failed to download model. Check your connection and try again.');
    throw err;
  }
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
      chunk_length_s: WHISPER_CHUNK_LENGTH,
      stride_length_s: WHISPER_STRIDE_LENGTH,
    });

    progressFill.style.width = '100%';
    progressText.textContent = 'Done!';

    const text = result.text?.trim() || '';
    if (text) {
      transcription.textContent = text;
      resultSection.classList.add('visible');

      // Extract and display trade info (reset to expanded state)
      tradeCardCollapsed = false;
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
  resetDemoCycle();
});

// Try Demo button handler
const tryDemoBtn = document.getElementById('tryDemoBtn');
if (tryDemoBtn) {
  tryDemoBtn.addEventListener('click', () => {
    const demo = getNextDemo();

    transcription.textContent = demo.transcript;
    resultSection.classList.add('visible');

    currentTradeInfo = demo.trade;
    renderTradeCard(demo.trade);

    // Scroll to results on mobile
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

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
 * Build trade card header HTML with ticker, direction, and meta badges
 */
function buildTradeCardHeader(trade, collapsed) {
  // Determine trade direction
  // Prefer tradeType (long/short) over action (buy/sell) for display
  const displayAction = trade.tradeType || trade.action || '';
  const directionClass = trade.action === 'buy' ? 'long' : trade.action === 'sell' ? 'short' : displayAction.toLowerCase();
  const directionText = displayAction.toUpperCase();

  // Build meta badges for exchange and timeframe
  let metaBadges = '';
  if (trade.exchange) {
    metaBadges += `<span class="trade-card-badge">${trade.exchange}</span>`;
  }
  if (trade.timeframe) {
    metaBadges += `<span class="trade-card-badge">${trade.timeframe}</span>`;
  }

  return `
    <div class="trade-card-header">
      <div class="trade-card-ticker-group">
        ${trade.ticker ? `<div class="trade-card-ticker copyable-value" data-copy="${trade.ticker}">${trade.ticker}</div>` : '<div class="trade-card-ticker">Trade</div>'}
        ${metaBadges ? `<div class="trade-card-meta">${metaBadges}</div>` : ''}
      </div>
      <div class="trade-card-header-actions">
        ${directionText ? `<div class="trade-card-direction ${directionClass}">${directionText}</div>` : ''}
        <button class="trade-card-collapse-btn" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▶' : '▼'}</button>
      </div>
    </div>`;
}

/**
 * Build price levels section HTML (entry, stop loss, take profit, R:R)
 */
function buildPriceLevelsSection(trade) {
  let pricesHtml = '';

  if (trade.price) {
    pricesHtml += `
      <div class="trade-price-item entry">
        <span class="trade-price-label">Entry</span>
        <span class="trade-price-value copyable-value" data-copy="${trade.price}">$${formatSavedNoteNumber(trade.price)}</span>
      </div>`;
  }

  if (trade.stopLoss) {
    const slChange = calculatePercentChange(trade.price, trade.stopLoss);
    pricesHtml += `
      <div class="trade-price-item stop-loss">
        <span class="trade-price-label">Stop Loss</span>
        <span class="trade-price-value copyable-value" data-copy="${trade.stopLoss}">$${formatSavedNoteNumber(trade.stopLoss)}</span>
        ${slChange !== null ? `<span class="trade-price-change negative">${formatPercent(slChange)}</span>` : ''}
      </div>`;
  }

  if (trade.takeProfit) {
    const tpChange = calculatePercentChange(trade.price, trade.takeProfit);
    pricesHtml += `
      <div class="trade-price-item take-profit">
        <span class="trade-price-label">Take Profit</span>
        <span class="trade-price-value copyable-value" data-copy="${trade.takeProfit}">$${formatSavedNoteNumber(trade.takeProfit)}</span>
        ${tpChange !== null ? `<span class="trade-price-change positive">${formatPercent(tpChange)}</span>` : ''}
      </div>`;
  }

  // Calculate and display R:R ratio
  const rrRatio = calculateRiskReward(trade.price, trade.stopLoss, trade.takeProfit, trade.action);
  if (rrRatio !== null && rrRatio !== 0) {
    pricesHtml += `
      <div class="trade-price-item">
        <span class="trade-price-label">R:R Ratio</span>
        <span class="trade-price-value copyable-value" data-copy="${rrRatio.toFixed(2)}">1:${rrRatio.toFixed(2)}</span>
      </div>`;
  }

  return pricesHtml ? `<div class="trade-card-prices">${pricesHtml}</div>` : '';
}

/**
 * Build position details section HTML (position size, quantity, leverage)
 */
function buildPositionDetailsSection(trade) {
  let positionHtml = '';

  if (trade.positionSize) {
    positionHtml += `
      <div class="trade-position-item">
        <span class="trade-position-label">Position Size</span>
        <span class="trade-position-value copyable-value" data-copy="${trade.positionSize}">$${formatSavedNoteNumber(trade.positionSize)}</span>
      </div>`;
  }

  if (trade.quantity) {
    const ticker = trade.ticker ? trade.ticker.split('/')[0] : '';
    positionHtml += `
      <div class="trade-position-item">
        <span class="trade-position-label">Quantity</span>
        <span class="trade-position-value copyable-value" data-copy="${trade.quantity}">${formatSavedNoteNumber(trade.quantity)} ${ticker}</span>
      </div>`;
  }

  if (trade.leverage) {
    positionHtml += `
      <div class="trade-position-item">
        <span class="trade-position-label">Leverage</span>
        <span class="trade-position-value copyable-value" data-copy="${trade.leverage}">${trade.leverage}x</span>
      </div>`;
  }

  return positionHtml ? `<div class="trade-card-position">${positionHtml}</div>` : '';
}

/**
 * Build indicators section HTML
 */
function buildIndicatorsSection(trade) {
  if (!trade.indicators || !Array.isArray(trade.indicators) || trade.indicators.length === 0) {
    return '';
  }

  const indicatorBadges = trade.indicators
    .map(ind => `<span class="trade-indicator-badge">${ind}</span>`)
    .join('');

  return `
    <div class="trade-card-indicators">
      <div class="trade-indicators-label">Indicators</div>
      <div class="trade-indicators-list">${indicatorBadges}</div>
    </div>`;
}

/**
 * Build price chart section HTML
 */
function buildChartSection(trade) {
  if (!trade.price || !trade.stopLoss || !trade.takeProfit || !trade.action) {
    return '';
  }

  const chartSvg = createPriceLevelChart(trade);
  return chartSvg ? `<div class="price-chart-container">${chartSvg}</div>` : '';
}

/**
 * Render trade card with extracted info
 */
function renderTradeCard(trade) {
  if (!trade) {
    tradeCard.classList.remove('visible');
    tradeCard.innerHTML = '';
    updateRightPanelContent();
    return;
  }

  // Build each section using helper functions
  const headerHtml = buildTradeCardHeader(trade, tradeCardCollapsed);
  const pricesHtml = buildPriceLevelsSection(trade);
  const positionHtml = buildPositionDetailsSection(trade);
  const indicatorsHtml = buildIndicatorsSection(trade);
  const chartHtml = buildChartSection(trade);

  // Assemble the complete trade card
  tradeCard.innerHTML = `
    <div class="trade-card-content ${tradeCardCollapsed ? 'trade-card-collapsed' : ''}">
      ${headerHtml}
      <div class="trade-card-body">
        ${pricesHtml}
        ${positionHtml}
        ${indicatorsHtml}
        ${chartHtml}
        <div class="trade-summary">${generateTradeSummary(trade)}</div>
      </div>
    </div>
  `;

  tradeCard.classList.add('visible');
  updateRightPanelContent();
}

/**
 * Handle clicks on copyable values and collapse button in trade cards
 */
tradeCard.addEventListener('click', async (e) => {
  // Handle collapse button
  if (e.target.classList.contains('trade-card-collapse-btn')) {
    if (!currentTradeInfo) return;
    tradeCardCollapsed = !tradeCardCollapsed;
    renderTradeCard(currentTradeInfo);
    return;
  }

  // Handle copyable values
  const copyableEl = e.target.closest('.copyable-value');
  if (!copyableEl) return;

  const value = copyableEl.dataset.copy;
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);

    // Show visual feedback
    const originalText = copyableEl.textContent;
    copyableEl.style.opacity = '0.6';

    // Create a tooltip
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Copied!';
    tooltip.style.cssText = `
      position: fixed;
      background: var(--success);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      pointer-events: none;
      z-index: 1000;
      animation: fadeInOut 1s ease;
    `;

    // Position tooltip near the clicked element
    const rect = copyableEl.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - TOOLTIP_OFFSET}px`;
    tooltip.style.transform = 'translateX(-50%)';

    document.body.appendChild(tooltip);

    // Reset after delay
    setTimeout(() => {
      copyableEl.style.opacity = '';
      tooltip.remove();
    }, 1000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
});

// ============================================
// SAVED NOTES FUNCTIONALITY
// ============================================

// Note: blobToBase64 and base64ToBlob are imported from savedNotes.js

/**
 * Cleanup audio playback state and UI
 */
function cleanupAudio() {
  if (currentlyPlayingAudio) {
    currentlyPlayingAudio.pause();
    currentlyPlayingAudio = null;
  }
  if (currentAudioURL) {
    URL.revokeObjectURL(currentAudioURL);
    currentAudioURL = null;
  }
  // Reset all play buttons
  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.textContent = '▶';
    btn.classList.remove('playing');
  });
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

  // Stop any currently playing audio and revoke previous URL
  cleanupAudio();

  const blob = base64ToBlob(note.audioData);
  const url = URL.createObjectURL(blob);
  currentAudioURL = url; // Track for cleanup
  const audio = new Audio(url);

  const playBtn = savedNotesList.querySelector(`[data-index="${index}"] .play-btn`);

  audio.onplay = () => {
    if (playBtn) {
      playBtn.textContent = '⏹';
      playBtn.classList.add('playing');
    }
  };

  audio.onended = () => {
    cleanupAudio();
  };

  audio.onerror = () => {
    cleanupAudio();
    showError('Failed to play audio');
  };

  currentlyPlayingAudio = audio;
  audio.play();
}

/**
 * Stop currently playing audio
 */
function stopAudio() {
  cleanupAudio();
}

// Note: loadSavedNotes, saveSavedNotes, formatTimestamp, renderSavedNoteTrade
// are imported from savedNotes.js

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

// Note: escapeHtml is imported from savedNotes.js

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

  // Check limit using imported function
  const validation = canSaveNote(notes);
  if (!validation.valid) {
    showError(validation.error);
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

  // Create and add new note at the beginning
  const newNote = createNote({
    text,
    trade: currentTradeInfo,
    audioData,
  });
  notes.unshift(newNote);

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

  const copyText = formatNoteForClipboard(note);
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

// ============================================
// MODAL FUNCTIONALITY
// ============================================

/**
 * Create a modal element with given title and body content
 */
function createModal(id, title, bodyHtml) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = id;
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
    </div>
  `;
  document.body.appendChild(modal);

  // Wire up close handlers
  const closeBtn = modal.querySelector('.modal-close');
  const backdrop = modal.querySelector('.modal-backdrop');
  closeBtn.addEventListener('click', () => closeModal(modal));
  backdrop.addEventListener('click', () => closeModal(modal));

  return modal;
}

/**
 * Open a modal
 */
function openModal(modal) {
  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

/**
 * Close a modal
 */
function closeModal(modal) {
  modal.classList.remove('visible');
  document.body.style.overflow = '';
}

// Help modal content
const helpModalBody = `
  <p class="modal-intro">Speak naturally. Here are some example phrases that work well:</p>

  <div class="example-group">
    <h3>Crypto Trades</h3>
    <div class="example">"Long Bitcoin at 95,000, stop loss 92,000, take profit 105,000"</div>
    <div class="example">"Short Ethereum on Binance, entry 3,200, target 2,800"</div>
    <div class="example">"Buy Solana, watching the 4-hour chart, RSI oversold"</div>
  </div>

  <div class="example-group">
    <h3>Stock Trades</h3>
    <div class="example">"Buy 100 shares of Apple at 180, stop at 175"</div>
    <div class="example">"Sell Tesla, take profit at 250, MACD crossing down"</div>
  </div>

  <div class="example-group">
    <h3>Tips for Better Recognition</h3>
    <ul class="tips-list">
      <li>Speak clearly and at a moderate pace</li>
      <li>Say numbers digit by digit for prices (e.g., "ninety-five thousand")</li>
      <li>Use keywords: <strong>buy, sell, long, short, stop loss, take profit, target</strong></li>
      <li>Mention the exchange: <strong>Binance, Coinbase, Kraken</strong></li>
      <li>Include timeframes: <strong>1-hour, 4-hour, daily</strong></li>
      <li>Name indicators: <strong>RSI, MACD, EMA, VWAP</strong></li>
      <li>Foreign languages are supported — spoken content will be transcribed and translated to English</li>
      <li>The Space key starts/stops recording. If it doesn't respond, click elsewhere first to remove focus from dropdowns or buttons.</li>
    </ul>
  </div>
`;

// About modal content
const aboutModalBody = `
  <div class="about-section">
    <h3>What is this?</h3>
    <p>A voice-to-text tool designed for traders. Record your trade ideas, and the app automatically extracts key information like tickers, prices, stop losses, and indicators.</p>
  </div>

  <div class="about-section">
    <h3>How it works</h3>
    <p>Powered by <a href="https://openai.com/research/whisper" target="_blank" rel="noopener">OpenAI Whisper</a> running entirely in your browser via WebAssembly. The AI model is downloaded once and cached locally.</p>
    <ul class="tech-list">
      <li><a href="https://openai.com/research/whisper" target="_blank" rel="noopener">Whisper AI</a> - State-of-the-art speech recognition by OpenAI</li>
      <li><a href="https://huggingface.co/docs/transformers.js" target="_blank" rel="noopener">Transformers.js</a> - ML inference library by Hugging Face</li>
      <li><a href="https://onnxruntime.ai/" target="_blank" rel="noopener">ONNX Runtime</a> - Cross-platform ML inference via WebAssembly</li>
      <li><a href="https://vitejs.dev/" target="_blank" rel="noopener">Vite</a> - Fast build tool and development server</li>
    </ul>
  </div>

  <div class="about-section privacy-section">
    <h3>Privacy First</h3>
    <div class="privacy-badges">
      <div class="privacy-badge">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>100% Local Processing</span>
      </div>
      <div class="privacy-badge">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
        <span>No Data Sent to Servers</span>
      </div>
      <div class="privacy-badge">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>No Tracking or Analytics</span>
      </div>
      <div class="privacy-badge">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
        <span>No Cookies</span>
      </div>
    </div>
    <p class="privacy-note">Your audio never leaves your device. All speech recognition happens locally using your CPU/GPU.</p>
  </div>

`;

// Create modals on page load
const helpModal = createModal('helpModal', 'Examples & Tips', helpModalBody);
const aboutModal = createModal('aboutModal', 'About Traders Voice', aboutModalBody);

// Wire up trigger buttons
const helpBtn = document.getElementById('helpBtn');
const aboutBtn = document.getElementById('aboutBtn');

helpBtn.addEventListener('click', () => openModal(helpModal));
aboutBtn.addEventListener('click', () => openModal(aboutModal));

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (helpModal.classList.contains('visible')) {
      closeModal(helpModal);
    }
    if (aboutModal.classList.contains('visible')) {
      closeModal(aboutModal);
    }
  }
});

// ============================================================================
// PWA Installation Handling
// ============================================================================

let deferredPwaPrompt = null;

// Capture the PWA install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Store the event for later use
  deferredPwaPrompt = e;
  // Show install button/banner if desired
  console.log('PWA install prompt available');
});

// Handle successful installation
window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully');
  deferredPwaPrompt = null;
});

// Service Worker registration (handled by vite-plugin-pwa)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Service worker will be registered automatically by vite-plugin-pwa
    console.log('PWA ready');
  });
}
