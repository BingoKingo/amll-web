import type { PlayerState } from "../../../app/types";
import type { LyricPlayer } from "../../../lyrics/lyrics";

/**
 * AudioController handles audio-related logic:
 * - sets up audio events
 * - toggles play/pause
 * - updates play button visuals
 * - manages MediaSession
 *
 * NOTE:
 * This code is extracted from main.ts. You must provide:
 *   1) a reference to the HTMLAudioElement
 *   2) a reference to your PlayerState object
 *   3) a reference to your LyricPlayer instance
 *   4) any needed UI update functions (e.g. updateProgress, updateTimeDisplay, etc.)
 *
 * For now, we'll keep them as placeholders like onUpdatePlayButton, onUpdateProgress, etc.
 * Then from main.ts, you'll instantiate AudioController with the required references.
 */

export class AudioController {
  private audio: HTMLAudioElement;
  private state: PlayerState;
  private lyricPlayer: LyricPlayer;
  private mediaSessionRefreshTimeout: number | null = null;

  // Provide optional callbacks for UI updates
  private onUpdatePlayButton?: () => void;
  private onUpdateProgress?: () => void;
  private onUpdateTimeDisplay?: () => void;
  private onRefeshMediaSessionUI?: () => void;

  constructor(options: {
    audio: HTMLAudioElement;
    state: PlayerState;
    lyricPlayer: LyricPlayer;
    updatePlayButton?: () => void;
    updateProgress?: () => void;
    updateTimeDisplay?: () => void;
    refreshMediaSessionUI?: () => void;
  }) {
    this.audio = options.audio;
    this.state = options.state;
    this.lyricPlayer = options.lyricPlayer;
    this.onUpdatePlayButton = options.updatePlayButton;
    this.onUpdateProgress = options.updateProgress;
    this.onUpdateTimeDisplay = options.updateTimeDisplay;
    this.onRefeshMediaSessionUI = options.refreshMediaSessionUI;
  }

  public initAudioEvents() {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    this.mediaSessionRefreshTimeout = null;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.refreshMediaSession();
      }
    });
    window.addEventListener("pageshow", () => {
      this.refreshMediaSession();
    });
    window.addEventListener("focus", () => {
      this.refreshMediaSession();
    });
    if (isIOS) {
      document.addEventListener(
        "touchstart",
        () => {
          if (!this.mediaSessionRefreshTimeout) {
            this.mediaSessionRefreshTimeout = window.setTimeout(() => {
              this.refreshMediaSession();
              this.mediaSessionRefreshTimeout = null;
            }, 100);
          }
        },
        { passive: true }
      );
    }

    // loadedmetadata
    this.audio.addEventListener("loadedmetadata", () => {
      this.state.duration = this.audio.duration;
      if (this.onUpdateTimeDisplay) this.onUpdateTimeDisplay();
      this.updateMediaSessionMetadata();

      if (
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as any).MSStream
      ) {
        setTimeout(() => {
          this.updateMediaSessionMetadata();
        }, 100);
      }
    });

    // timeupdate
    this.audio.addEventListener("timeupdate", () => {
      this.state.currentTime = this.audio.currentTime;
      if (
        this.state.isRangeMode &&
        this.state.rangeEndTime > this.state.rangeStartTime
      ) {
        if (this.audio.currentTime >= this.state.rangeEndTime) {
          this.audio.currentTime = this.state.rangeStartTime;
          this.state.currentTime = this.state.rangeStartTime;
        }
      }
      if (this.onUpdateProgress) this.onUpdateProgress();
      if (this.onUpdateTimeDisplay) this.onUpdateTimeDisplay();

      const adjustedTime =
        this.audio.currentTime * 1000 + this.state.lyricDelay;
      this.lyricPlayer.setCurrentTime(adjustedTime);
    });

    // play
    this.audio.addEventListener("play", () => {
      this.state.isPlaying = true;
      if (this.onUpdatePlayButton) this.onUpdatePlayButton();
      this.lyricPlayer.resume();

      if ("mediaSession" in navigator) {
        (navigator as any).mediaSession.playbackState = "playing";
      }
    });

    // pause
    this.audio.addEventListener("pause", () => {
      this.state.isPlaying = false;
      if (this.onUpdatePlayButton) this.onUpdatePlayButton();
      this.lyricPlayer.pause();

      if ("mediaSession" in navigator) {
        (navigator as any).mediaSession.playbackState = "paused";
      }
    });

    // ended
    this.audio.addEventListener("ended", () => {
      this.state.isPlaying = false;
      if (this.onUpdatePlayButton) this.onUpdatePlayButton();
      if (this.state.loopPlay) {
        this.audio.currentTime = 0;
        // main.ts references processedLyricLines
        this.audio.play();
      }
      if ("mediaSession" in navigator) {
        (navigator as any).mediaSession.playbackState = "none";
      }
    });

    this.setupMediaSessionHandlers();
  }

  public togglePlayPause() {
    if (this.audio.paused) {
      this.state.isPlaying = true;
      if (this.onUpdatePlayButton) this.onUpdatePlayButton();
      this.audio.play().catch((error: any) => {
        console.error("Playback failed:", error);
        this.state.isPlaying = false;
        if (this.onUpdatePlayButton) this.onUpdatePlayButton();
      });
    } else {
      this.state.isPlaying = false;
      if (this.onUpdatePlayButton) this.onUpdatePlayButton();
      this.audio.pause();
    }
  }

  public setPlaybackRate(rate: number) {
    this.audio.playbackRate = rate;
  }

  public seek(time: number) {
    this.audio.currentTime = time;
  }

  public setVolume(volume: number) {
    this.audio.volume = volume;
  }

  public toggleMute() {
    this.audio.muted = !this.audio.muted;
  }

  public setupMediaSessionHandlers() {
    if ("mediaSession" in navigator) {
      (navigator as any).mediaSession.setActionHandler("play", () => {
        this.audio.play();
      });
      (navigator as any).mediaSession.setActionHandler("pause", () => {
        this.audio.pause();
      });
      (navigator as any).mediaSession.setActionHandler(
        "seekbackward",
        (details: any) => {
          const skipTime = details.seekOffset || 10;
          let newTime = Math.max(this.audio.currentTime - skipTime, 0);
          if (
            this.state.isRangeMode &&
            this.state.rangeStartTime !== undefined &&
            this.state.rangeEndTime !== undefined
          ) {
            newTime = Math.max(
              this.state.rangeStartTime,
              Math.min(this.state.rangeEndTime, newTime)
            );
          }
          this.audio.currentTime = newTime;
          const adjustedTime = newTime * 1000 + this.state.lyricDelay;
          this.lyricPlayer.setCurrentTime(adjustedTime);
        }
      );
      (navigator as any).mediaSession.setActionHandler(
        "seekforward",
        (details: any) => {
          const skipTime = details.seekOffset || 10;
          let newTime = Math.min(
            this.audio.currentTime + skipTime,
            this.audio.duration
          );
          if (
            this.state.isRangeMode &&
            this.state.rangeStartTime !== undefined &&
            this.state.rangeEndTime !== undefined
          ) {
            newTime = Math.max(
              this.state.rangeStartTime,
              Math.min(this.state.rangeEndTime, newTime)
            );
          }
          this.audio.currentTime = newTime;
          const adjustedTime = newTime * 1000 + this.state.lyricDelay;
          this.lyricPlayer.setCurrentTime(adjustedTime);
        }
      );
      (navigator as any).mediaSession.setActionHandler(
        "seekto",
        (details: any) => {
          if (details.seekTime !== undefined) {
            let newTime = details.seekTime;
            if (
              this.state.isRangeMode &&
              this.state.rangeStartTime !== undefined &&
              this.state.rangeEndTime !== undefined
            ) {
              newTime = Math.max(
                this.state.rangeStartTime,
                Math.min(this.state.rangeEndTime, newTime)
              );
            }
            this.audio.currentTime = newTime;
            const adjustedTime = newTime * 1000 + this.state.lyricDelay;
            this.lyricPlayer.setCurrentTime(adjustedTime);
          }
        }
      );
      (navigator as any).mediaSession.setActionHandler("previoustrack", () => {
        const newTime =
          this.state.isRangeMode && this.state.rangeStartTime !== undefined
            ? this.state.rangeStartTime
            : 0;
        this.audio.currentTime = newTime;
        const adjustedTime = newTime * 1000 + this.state.lyricDelay;
        this.lyricPlayer.setCurrentTime(adjustedTime);
      });
      (navigator as any).mediaSession.setActionHandler("nexttrack", null);
    }
  }

  public updateMediaSessionMetadata() {
    if ("mediaSession" in navigator) {
      const coverUrl = this.state.coverUrl || "./assets/icon-512x512.png";
      (navigator as any).mediaSession.metadata = new (
        window as any
      ).MediaMetadata({
        title: this.state.songTitle || "Song Title",
        artist: this.state.songArtist || "Artist",
        album: "",
        artwork: [
          { src: coverUrl, sizes: "96x96", type: "image/png" },
          { src: coverUrl, sizes: "128x128", type: "image/png" },
          { src: coverUrl, sizes: "192x192", type: "image/png" },
          { src: coverUrl, sizes: "256x256", type: "image/png" },
          { src: coverUrl, sizes: "384x384", type: "image/png" },
          { src: coverUrl, sizes: "512x512", type: "image/png" },
        ],
      });
    }
  }

  public refreshMediaSession() {
    if ("mediaSession" in navigator) {
      (navigator as any).mediaSession.setActionHandler("play", null);
      (navigator as any).mediaSession.setActionHandler("pause", null);
      (navigator as any).mediaSession.setActionHandler("seekbackward", null);
      (navigator as any).mediaSession.setActionHandler("seekforward", null);
      (navigator as any).mediaSession.setActionHandler("seekto", null);
      (navigator as any).mediaSession.setActionHandler("previoustrack", null);
      (navigator as any).mediaSession.setActionHandler("nexttrack", null);
      (navigator as any).mediaSession.metadata = null;
      setTimeout(() => {
        this.updateMediaSessionMetadata();
        if ("mediaSession" in navigator) {
          (navigator as any).mediaSession.playbackState = this.state.isPlaying
            ? "playing"
            : "paused";
        }
      }, 50);
      setTimeout(() => {
        this.setupMediaSessionHandlers();
      }, 100);
    }
  }
}