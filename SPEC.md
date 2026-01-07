# Traders Voice - Local Speech-to-Text for Traders

## Overview

Traders Voice is a minimal, fully-local speech-to-text tool for traders to capture spoken notes during active trades. No cloud services, no data leaves your machine.

## Goals

1. **Simple** - Single HTML file, opens instantly, works offline
2. **Accurate** - Uses Whisper AI model for high-quality transcription
3. **Local** - All processing happens in browser, no network calls
4. **Fast** - Optimized for quick trade thoughts (30-60 second clips)
5. **Copy-friendly** - One-click copy of transcription for pasting into journal

## Non-Goals

- Long-form transcription (podcasts, meetings)
- Real-time streaming transcription
- Multi-speaker detection
- Cloud backup or sync
- Mobile support (desktop-first)

## Technical Architecture

### Dependencies

- **@huggingface/transformers** - Whisper model inference in browser
- **ONNX Runtime Web** - Neural network execution (bundled with transformers)

### Models

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| `tiny.en` | ~41MB | Good for quick notes | Fast |
| `base.en` | ~77MB | Better accuracy | Slower |

Models are quantized (q8) for faster loading. Downloaded once, cached in browser.

### Audio Pipeline

```
Microphone → MediaRecorder → Blob → Resample (16kHz mono) → Whisper → Text
```

1. **Capture**: MediaRecorder API with opus/webm codec
2. **Resample**: OfflineAudioContext converts to 16kHz mono Float32Array
3. **Transcribe**: Whisper processes in Web Worker (non-blocking)

### Browser Requirements

- Chrome 89+ or Firefox 90+ (for WASM SIMD)
- SharedArrayBuffer support (required for ONNX)
- Microphone permission

## User Interface

### Layout

```
┌─────────────────────────────────────────────┐
│  Traders Voice                  [tiny.en ▼] │
├─────────────────────────────────────────────┤
│                                             │
│           ●  Recording... 0:23              │
│              [Stop]                         │
│                                             │
├─────────────────────────────────────────────┤
│  Loading model... 45%                       │
│  ████████████░░░░░░░░░░░░░░                │
├─────────────────────────────────────────────┤
│                                             │
│  "Entered long on BTC at 42500, targeting   │
│   43200 with stop at 42100. Saw strong      │
│   support bounce on the 4H chart."          │
│                                             │
│                              [Copy] [Clear] │
└─────────────────────────────────────────────┘
```

### States

1. **Idle** - Ready to record
2. **Recording** - Capturing audio, shows duration
3. **Processing** - Loading model / transcribing
4. **Result** - Shows transcription with copy button

### Interactions

- **Record**: Click or press Space to start/stop
- **Copy**: Copies transcription to clipboard
- **Clear**: Clears transcription, ready for next
- **Model select**: Switch between tiny.en and base.en

## Implementation Details

### Audio Resampling

Whisper requires 16kHz mono audio. Browser audio is typically 44.1kHz or 48kHz stereo.

```javascript
async function resampleTo16kMono(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const offlineContext = new OfflineAudioContext(
    1,                                    // mono
    audioBuffer.duration * 16000,         // samples at 16kHz
    16000                                 // sample rate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  const resampled = await offlineContext.startRendering();
  return resampled.getChannelData(0);     // Float32Array
}
```

### Web Worker Pattern

Whisper inference blocks the main thread. Use a Web Worker:

```javascript
// worker.js
import { pipeline } from '@huggingface/transformers';

let transcriber = null;

self.onmessage = async ({ data }) => {
  if (!transcriber) {
    transcriber = await pipeline('automatic-speech-recognition',
      'Xenova/whisper-tiny.en', { dtype: 'q8' });
  }

  const result = await transcriber(data.audio);
  self.postMessage({ text: result.text });
};
```

### Model Caching

Models are cached in browser Cache API automatically by transformers.js. First load downloads from Hugging Face CDN, subsequent loads are instant.

## File Structure

```
traders-voice/
├── src/
│   ├── index.html  # Main HTML structure
│   ├── styles.css  # All styling (dark theme)
│   └── main.js     # Application logic + Whisper integration
├── package.json    # Dependencies and scripts
├── vite.config.js  # Build configuration
├── CLAUDE.md       # Developer instructions
├── README.md       # User documentation
└── SPEC.md         # This specification
```

## Usage

1. Open `index.html` in Chrome or Firefox
2. Allow microphone access when prompted
3. Click Record or press Space
4. Speak your trade notes
5. Click Stop when done
6. Wait for transcription (first use downloads model)
7. Click Copy to clipboard
8. Paste into your trade journal

## Performance Targets

| Metric | Target |
|--------|--------|
| Model load (cached) | < 2 seconds |
| Model load (first) | < 30 seconds |
| Transcription (30s audio) | < 10 seconds |
| Memory usage | < 500MB |

## Known Limitations

1. **First load is slow** - Model download is ~40-80MB
2. **No streaming** - Must finish recording before transcription
3. **English only** - Using English-specific models for better accuracy
4. **Desktop only** - Mobile browsers have limited WASM support

## Future Enhancements (Maybe)

- [ ] Larger models (small.en, medium.en) for better accuracy
- [ ] Keyboard shortcuts customization
- [ ] Save transcription history locally
- [ ] Export to common formats
