# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the AMLL Web Player, a web-based music player with Apple Music-like lyrics animation. It features a dynamic background, album cover display, and synchronized lyric display with word-by-word animation.

## Technology Stack

- **Frontend**: TypeScript, HTML, CSS
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Core Dependencies**:
  - `@applemusic-like-lyrics/core` and `@applemusic-like-lyrics/lyric` for lyric rendering
  - Pixi.js for background rendering
  - lil-gui for UI controls
  - stats.js for performance monitoring

## Project Structure

```
amll-web/
├── src/
│   ├── main.ts               # Main application entry point
│   ├── i18n.ts               # Internationalization support
│   └── lyric/                # Lyric parsing utilities
├── public/                   # Static assets
│   ├── icons/                # Application icons
│   └── jsmediatags.min.js    # Audio metadata parsing library
├── index.html                # Main HTML entry point
├── vite.config.ts            # Vite build configuration
└── package.json              # Project dependencies and scripts
```

## Development Commands

### Install Dependencies
```bash
# If you encounter "packages field missing or empty" error, first remove pnpm-workspace.yaml:
rm pnpm-workspace.yaml

# Then install dependencies:
pnpm install
```

### Run Development Server
```bash
# Start the development server (will automatically use another port if 5173 is in use)
pnpm dev
```

### Build for Production
```bash
pnpm build
```

### Preview Production Build
```bash
pnpm preview
```

## Troubleshooting

### Common Issues and Solutions

1. **"packages field missing or empty" error during pnpm install**:
   - This is often caused by an incorrectly configured `pnpm-workspace.yaml` file
   - Solution: Remove the `pnpm-workspace.yaml` file and run `pnpm install` again

2. **Port 5173 is in use**:
   - Vite will automatically try another port (typically 5174)
   - Check the terminal output for the actual URL where the server is running

3. **Module not found errors**:
   - Ensure all dependencies are properly installed with `pnpm install`
   - Restart the development server after installing dependencies

## Code Architecture

### Main Components

1. **WebLyricsPlayer Class** (`src/main.ts`)
   - Core application class managing all player functionality
   - Handles audio playback, lyric rendering, and UI interactions
   - Manages state for music, lyrics, cover art, and player settings

2. **Background Rendering**
   - Uses `@applemusic-like-lyrics/core` for fluid gradient backgrounds
   - Supports album-based backgrounds with blur and color mask effects
   - Configurable animation speed and quality settings

3. **Lyric Display**
   - Renders synchronized lyrics with word-by-word animations
   - Supports multiple lyric formats (LRC, YRC, LYS, TTML, ASS, etc.)
   - Configurable alignment, positioning, and animation effects

4. **UI Controls**
   - Interactive player controls (play/pause, seek, volume, etc.)
   - Configurable settings panel with real-time preview
   - Responsive design for both portrait and landscape orientations

### Key Features

- **Multiple Input Methods**: Local file upload or URL parameters
- **Hotkeys**: Space (play/pause), Arrow keys (seek), F (fullscreen), H (toggle control panel)
- **Dynamic Backgrounds**: Fluid animations or album-based covers
- **Advanced Lyric Effects**: Word fading, spring animations, blur effects
- **Customization**: Extensive settings for appearance and behavior
- **Responsive Design**: Adapts to different screen orientations and sizes

### State Management

The application uses a single `PlayerState` object to manage all application state:
- Music and lyric URLs
- Playback state (playing, current time, duration)
- UI settings (background style, lyric appearance, etc.)
- User preferences (volume, playback speed, etc.)

### Event Handling

- Audio events (play, pause, timeupdate, etc.)
- UI interactions (clicks, drag and drop, keyboard)
- Media session integration for system media controls
- Touch events for mobile devices

## Development Notes

1. **Lyric Parsing**: The application supports multiple lyric formats through format-specific parsers
2. **Background Rendering**: Uses WebGL via Pixi.js for efficient background animations
3. **Performance Monitoring**: Stats.js integration for FPS monitoring (activate by tapping 5 times in bottom-right corner)
4. **Responsive Design**: Adjusts layout based on screen orientation and size
5. **Accessibility**: Media session API integration for system integration