# Traders Voice - Developer Instructions

## Project Overview

Traders Voice is a minimal, fully-local speech-to-text application for traders. It uses Whisper AI models running entirely in the browser via WebAssembly. No data leaves the user's machine.

## Architecture

```
src/
├── index.html    # Main HTML structure
├── styles.css    # All styling (dark theme)
└── main.js       # Application logic + Whisper integration
```

### Key Dependencies

- **@huggingface/transformers** - Whisper model inference in browser
- **vite** - Development server and build tool

### How It Works

1. User clicks record → `MediaRecorder` captures audio as webm/opus
2. User stops recording → audio blob is created
3. Audio is resampled to 16kHz mono via `OfflineAudioContext`
4. Resampled Float32Array is passed to Whisper pipeline
5. Transcription result is displayed with copy button

## Development

```bash
npm install
npm run dev      # Start dev server at http://localhost:5174
npm run build    # Build to dist/
npm run preview  # Preview production build
```

## Code Conventions

- **Keep it simple** - This is intentionally minimal. Resist adding features.
- **No frameworks** - Vanilla JS only. No React, Vue, etc.
- **Single responsibility** - Each function does one thing.
- **Descriptive names** - `resampleTo16kMono`, `toggleRecording`, not `process` or `handle`.

## Browser Requirements

- Chrome 89+ or Firefox 90+ (WASM SIMD support)
- SharedArrayBuffer (required for ONNX Runtime)
- Microphone permission

## Models

| Model | Hugging Face ID | Size | Use Case |
|-------|-----------------|------|----------|
| tiny.en | `Xenova/whisper-tiny.en` | ~41MB | Quick notes, faster |
| base.en | `Xenova/whisper-base.en` | ~77MB | Better accuracy |

Models are quantized (q8) and cached in browser Cache API after first download.

## Audio Pipeline Details

Whisper requires 16kHz mono audio. Browser audio is typically 44.1kHz or 48kHz stereo.

The `resampleTo16kMono` function:
1. Decodes the audio blob via `AudioContext.decodeAudioData`
2. Creates an `OfflineAudioContext` with 1 channel at 16000Hz
3. Renders the resampled buffer
4. Returns `Float32Array` from channel 0

## State Machine

```
IDLE ──[click/space]──► RECORDING
  ▲                         │
  │                      [stop]
  │                         ▼
  └────[done]────────── PROCESSING
```

## Testing Locally

The app works with `file://` protocol for the standalone HTML version, but the built version requires a server due to ES modules.

For quick testing:
```bash
npm run dev
# or
python3 -m http.server 8000 -d dist
```

## Common Issues

### "Microphone access denied"
- Check browser permissions
- HTTPS or localhost required for `getUserMedia`

### Model loading slow
- First load downloads from Hugging Face CDN
- Subsequent loads use browser cache
- Consider preloading model on page load for better UX

### SharedArrayBuffer error
- Requires secure context (HTTPS or localhost)
- Some browsers need specific headers for cross-origin isolation

## Future Considerations (Not Implemented)

These are explicitly out of scope to keep the app minimal:

- [ ] Streaming transcription (would require different approach)
- [ ] Multiple languages (currently English-only for better accuracy)
- [ ] History/persistence (users should paste to their journal)
- [ ] Larger models (small.en, medium.en - significant size increase)
