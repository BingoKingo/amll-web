 <img width="192" height="192" alt="logo" src="./public/icons/icon-192x192.png" />

# AMLL Web Lyrics Player

![Horizonal Layout](./public/screenshots/amll-web-player-horizonal-layout.png)
![Vertical Layout](./public/screenshots/amll-web-player-vertical-layout.png)
## Quick Start

### Requirements

- **Node.js**: 18.0+
- **Browsers**: Chromium 120+, Firefox 100+, Safari 15.4+

## Install & Run
```
pnpm install
pnpm dev
```

## Build & Preview

```
pnpm build
pnpm preview
```

## Usage Guide

### Input Methods

1. **Local File Upload （Horizonal Layout）**
   - Audio File: Right click or long press (3s) the play button to select
   - Lyrics File: Right click or long press (3s) the fullscreen button to select
   - Cover Image (optional): Click the cover to select
   - Artist: Click to edit
   - Title: Click to edit

   All the above options can be accessed by clicking on the song information in the vertical layout to enter the control panel for initialization.


2. **URL Parameters**
   ```
   https://amlw.vercel.app/?music=music_url&lyric=lyrics_url&cover=cover_url&title=song_title&artist=artist_name
   ```

### Hotkeys

- `Space`: Play/Pause
- `Left/Right Arrows`: Seek forward/backward (10s)
- `F`: Toggle fullscreen

## License

This project is licensed under AGPL - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Steve-xmh/applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)

⭐ If you find this project useful, please give it a star!