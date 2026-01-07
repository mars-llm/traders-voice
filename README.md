# Traders Voice

A minimal, fully-local speech-to-text tool for traders. Capture your trade thoughts instantly without typing.

## Why Traders Voice?

During active trades, typing notes breaks your focus. Traders Voice lets you speak your observations naturally:

> "Entered long on BTC at 42500, targeting 43200 with stop at 42100. Saw strong support bounce on the 4H chart with increasing volume."

One click to record. One click to copy. Paste into your journal. Done.

## Features

### Privacy First
- **100% Local** - All processing happens in your browser
- **No Cloud** - Your audio never leaves your machine
- **No Account** - No signup, no login, no tracking

### Fast & Simple
- **One-Click Recording** - Big red button, hard to miss
- **Keyboard Shortcut** - Press Space to start/stop
- **Instant Copy** - One click copies transcription to clipboard
- **Minimal UI** - Nothing to distract you from trading

### Accurate Transcription
- **Whisper AI** - OpenAI's speech recognition model
- **Two Models** - tiny.en (fast) or base.en (accurate)
- **English Optimized** - Models tuned for English speech

### Works Offline
- **One-Time Download** - Model cached after first use
- **No Internet Required** - Works completely offline after setup
- **Instant Subsequent Loads** - Cached model loads in <2 seconds

## Quick Start

### Option 1: Use Directly (No Build)

1. Open `src/index.html` in Chrome or Firefox
2. Allow microphone access when prompted
3. Click the red button or press Space
4. Speak your trade notes
5. Click Stop when done
6. Click Copy to paste into your journal

### Option 2: Development Server

```bash
npm install
npm run dev
```

Opens at http://localhost:5174

### Option 3: Build for Production

```bash
npm install
npm run build
npm run preview
```

## Requirements

- **Browser**: Chrome 89+ or Firefox 90+
- **Microphone**: Any working microphone
- **Storage**: ~50-100MB for model cache
- **First Load**: Internet connection to download model

## Models

| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| tiny.en | 41MB | Fast | Good | Quick notes, high-frequency trading |
| base.en | 77MB | Medium | Better | Detailed analysis, complex terminology |

Select model from dropdown in top-right corner. Model downloads on first use and is cached for instant future loads.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Start/Stop recording |

## Tips for Best Results

1. **Speak clearly** - Normal conversation pace works best
2. **Minimize background noise** - Close windows, mute notifications
3. **Keep it short** - 30-60 second clips transcribe fastest
4. **Use base.en for accuracy** - If tiny.en misses words, switch models

## Troubleshooting

### Microphone not working
- Check browser permissions (click lock icon in address bar)
- Ensure microphone is not muted in system settings
- Try a different browser

### Model loading slowly
- First download is ~40-80MB depending on model
- Subsequent loads are instant (cached)
- Check your internet connection

### Transcription is empty
- Speak louder or closer to microphone
- Record for at least 2-3 seconds
- Try the base.en model for better accuracy

### Page doesn't load
- Use Chrome 89+ or Firefox 90+
- Ensure JavaScript is enabled
- For production build, serve via HTTP server (not file://)

## Privacy

Traders Voice is designed with privacy as a core principle:

- **No data collection** - We don't collect anything
- **No analytics** - No tracking scripts
- **No network calls** - After model download, everything is local
- **Open source** - Review the code yourself

Your trading notes stay on your machine. Period.

## Technical Details

- Built with vanilla JavaScript (no frameworks)
- Uses [@huggingface/transformers](https://github.com/huggingface/transformers.js) for Whisper inference
- Audio resampled to 16kHz mono via Web Audio API
- Models run via ONNX Runtime WebAssembly

## License

MIT - Use it however you want.
