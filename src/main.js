/**
 * Traders Voice - Main Application
 *
 * Local speech-to-text using Whisper AI.
 * All processing happens in-browser, nothing leaves your machine.
 */

import { pipeline, env } from '@huggingface/transformers';
import { extractTradeInfo, generateTradeSummary } from './tradeExtractor.js';

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
 * Show error message temporarily
 */
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
  setTimeout(() => errorMsg.classList.remove('visible'), 5000);
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
      break;
  }
}

/**
 * Resample audio to 16kHz mono (required by Whisper)
 */
async function resampleTo16kMono(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const targetSampleRate = 16000;
  const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate);

  const offlineContext = new OfflineAudioContext(1, numSamples, targetSampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  const resampled = await offlineContext.startRendering();
  await audioContext.close();

  return resampled.getChannelData(0);
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
  progressText.textContent = 'Loading model...';
  progressFill.style.width = '0%';

  transcriber = await pipeline('automatic-speech-recognition', selectedModel, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (progress) => {
      if (progress.status === 'downloading' || progress.status === 'progress') {
        const pct = progress.progress || 0;
        progressFill.style.width = `${pct}%`;
        progressText.textContent = `Loading model... ${Math.round(pct)}%`;
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
      renderTradeCard(tradeInfo);
    } else {
      showError('No speech detected. Try speaking louder or longer.');
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
 * Render trade card with extracted info
 */
function renderTradeCard(trade) {
  if (!trade) {
    tradeCard.classList.remove('visible');
    tradeCard.innerHTML = '';
    return;
  }

  const actionClass = trade.action || '';
  const actionText = trade.action ? trade.action.toUpperCase() : '';

  let detailsHtml = '';

  if (trade.quantity) {
    detailsHtml += `
      <div class="trade-detail">
        <span class="trade-detail-label">Quantity</span>
        <span class="trade-detail-value">${trade.quantity}</span>
      </div>`;
  }

  if (trade.price) {
    detailsHtml += `
      <div class="trade-detail">
        <span class="trade-detail-label">Price</span>
        <span class="trade-detail-value">$${trade.price.toFixed(2)}</span>
      </div>`;
  }

  if (trade.stopLoss) {
    detailsHtml += `
      <div class="trade-detail">
        <span class="trade-detail-label">Stop Loss</span>
        <span class="trade-detail-value">$${trade.stopLoss.toFixed(2)}</span>
      </div>`;
  }

  if (trade.takeProfit) {
    detailsHtml += `
      <div class="trade-detail">
        <span class="trade-detail-label">Take Profit</span>
        <span class="trade-detail-value">$${trade.takeProfit.toFixed(2)}</span>
      </div>`;
  }

  tradeCard.innerHTML = `
    <div class="trade-card-content">
      <div class="trade-card-header">
        <span class="trade-card-title">Trade Detected</span>
        ${actionText ? `<span class="trade-card-action ${actionClass}">${actionText}</span>` : ''}
      </div>
      ${trade.ticker ? `<div class="trade-card-ticker">${trade.ticker}</div>` : ''}
      ${detailsHtml ? `<div class="trade-card-details">${detailsHtml}</div>` : ''}
      <div class="trade-summary">${generateTradeSummary(trade)}</div>
    </div>
  `;

  tradeCard.classList.add('visible');
}
