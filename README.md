 <img width="192" height="192" alt="logo" src="./public/icons/icon-192x192.png" />

# AMLL Web Player

## Quick Start

### Requirements

- **Node.js**: 18.0+
- **Browsers**: Chromium 120+, Firefox 100+ (Not Recommended), Safari 15.4+

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

1. **Local File Upload**
   - Audio File:
   - - Click (first time) or right click or long press (3s) the play button to select
   - - Drag and drop to the cover to select
   - Lyrics File:
   - - Right click or long press (3s) the fullscreen button to select
   - - Drag and drop to the right lyric player area to select
   - Cover Image (optional): Click (first time) or right click or long press (3s) drag and drop the cover to select
   - Artist: Click (first time) or right click or long press (3s) to edit
   - Title: Click (first time) or right click or long press (3s) to edit

   All the above options can be accessed by clicking on the song information to enter the control panel for initialization.

2. **URL Parameters (API)**

   Base URL: `https://amlw.vercel.app/`

   You can load music, lyrics, and cover image directly through URL parameters:

   ```
   https://amlw.vercel.app/?music=音乐链接&lyric=歌词链接&cover=封面链接&title=歌曲名&artist=艺术家
   ```

   | Parameter | Type | Range | Default | Description |
   | - | - | - | - | - |
   | `music` | String | URL | | Audio file |
   | `lyric` | String | URL | | Lyrics file |
   | `cover` | String | URL | | Cover image URL |
   | `title` | String | Text | `Unknown Song` | Song title |
   | `artist` | String | Text | `Unknown Artist` | Artist name |
   | `auto` | Boolean | 0 / 1 | `1` | Auto play when loaded (1 = enabled), may not work due to browser limitations |
   | `loop` | Boolean | 0 / 1 | `1` | Loop playback (1 = enabled) |
   | `x` | Number | 0.10-4.00 | `1` | Playback speed (x), may not work due to browser limitations |
   | `ms` | Number | ±Num | `0` | Lyric delay in milliseconds (ms) |
   | `vol` | Number | 0-100 / 0-1 | `50` /`0.5` | Volume level in percent (%)|
   | `t` | Number | Num | `0` | Start playback position in seconds (s) |
   | `te` | Number | Num | `0` | End playback position in seconds (s) |

### Hotkeys

- `Space`: Play/Pause
- `Left/Right Arrows`: Seek forward/backward (10s)
- `F`: Toggle fullscreen
- `H`: Toggle Control Panel

## License

This project is licensed under AGPL - see [LICENSE](LICENSE) for details.

## Acknowledgments
- [apoint123/lyrics_helper_rs](https://github.com/apoint123/lyrics_helper_rs)
- [fred913/justlyrics](https://github.com/fred913/justlyrics)
- [ionic-team/ionicons](https://github.com/ionic-team/ionicons)
- [Steve-xmh/applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)
- [tabler/tabler-icons](https://github.com/tabler/tabler-icons)

⭐ If you find this project useful, please give it a star!
