"use client";

import * as React from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui";

// --- Constants ---

// Percentage of video that must be watched to count as "completed"
const COMPLETION_THRESHOLD = 95;

// --- Types ---

interface YouTubePlayerProps {
  videoUrl: string;
  topicId: string;
  topicTitle: string;
  topicDescription?: string;
  courseSlug: string;
  enrollmentId?: string;
  initialProgress?: number;
  onProgressUpdate?: (progress: number) => void;
  onComplete?: () => void;
  disableProgressUpdate?: boolean; // If true, don't save progress updates (for completed topics)
}

interface TranscriptData {
  transcript: string;
  summary: string;
  keyPoints: string[];
  duration?: string;
}

interface YouTubePlayerConfig {
  videoId: string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    [key: string]: unknown;
  };
  events?: {
    onReady?: (event: { target: YouTubePlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
    [key: string]: unknown;
  };
}

interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
  [key: string]: unknown;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (elementId: string, config: YouTubePlayerConfig) => YouTubePlayerInstance;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
      };
    };
  }
}

// --- Helper Functions ---

function extractVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?\s]+)/
  );
  return match ? match[1] : null;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0)
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// --- Component ---

export function YouTubePlayer({
  videoUrl,
  topicId,
  topicTitle,
  topicDescription,
  courseSlug,
  enrollmentId,
  initialProgress = 0,
  onProgressUpdate,
  onComplete,
  disableProgressUpdate = false,
}: YouTubePlayerProps) {
  const videoId = extractVideoId(videoUrl);
  const playerRef = React.useRef<YouTubePlayerInstance | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const progressInterval = React.useRef<NodeJS.Timeout | null>(null);
  const lastSavedProgress = React.useRef<number>(initialProgress);
  const playerContainerId = `yt-player-${topicId.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Client-side only flag to prevent hydration issues
  const [isMounted, setIsMounted] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(100);
  const [isMuted, setIsMuted] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const [progress, setProgress] = React.useState(initialProgress);
  const [hasCompleted, setHasCompleted] = React.useState(initialProgress >= COMPLETION_THRESHOLD);
  // Track if video was already completed when loaded (to prevent progress updates on rewatch)
  const wasCompletedInitially = React.useRef(initialProgress >= COMPLETION_THRESHOLD);
  const savedCompletedProgress = React.useRef(
    initialProgress >= COMPLETION_THRESHOLD ? initialProgress : 0
  );

  // Transcript state
  const [transcript, setTranscript] = React.useState<TranscriptData | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = React.useState(false);
  const [showTranscript, setShowTranscript] = React.useState(false);
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null);

  // Video error state
  const [videoError, setVideoError] = React.useState<string | null>(null);

  // Reset all local state when the topic/video changes so progress from a
  // previous topic never "bleeds" into the next one.
  React.useEffect(() => {
    setIsReady(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setShowControls(true);

    // Reset progress/completion flags based on the new initialProgress
    setProgress(initialProgress);
    const completed = initialProgress >= COMPLETION_THRESHOLD;
    setHasCompleted(completed);
    wasCompletedInitially.current = completed;
    savedCompletedProgress.current = completed ? initialProgress : 0;
    lastSavedProgress.current = initialProgress;

    // Reset transcript-related state for the new topic
    setTranscript(null);
    setShowTranscript(false);
    setTranscriptError(null);
    setIsLoadingTranscript(false);

    // Reset video error state
    setVideoError(null);
  }, [topicId, videoUrl, initialProgress]);

  // Set mounted after hydration
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load YouTube API and initialize player
  React.useEffect(() => {
    if (!isMounted || !videoId) return;

    let player: YouTubePlayerInstance | null = null;

    const initPlayer = () => {
      const container = document.getElementById(playerContainerId);
      if (!container || playerRef.current) return;

      player = new window.YT.Player(playerContainerId, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          playsinline: 1,
          iv_load_policy: 3, // Hide annotations
        },
        events: {
          onReady: (event: { target: YouTubePlayerInstance }) => {
            console.log("[YouTubePlayer] Player ready");
            playerRef.current = event.target;
            setIsReady(true);
            setDuration(event.target.getDuration());
            setVolume(event.target.getVolume());

            // Seek to saved progress if any (only if not already completed)
            if (initialProgress > 0 && initialProgress < 100) {
              const seekTime = (initialProgress / 100) * event.target.getDuration();
              event.target.seekTo(seekTime, true);
            } else if (wasCompletedInitially.current && savedCompletedProgress.current > 0) {
              // If video was completed, seek to the saved completed progress
              const seekTime = (savedCompletedProgress.current / 100) * event.target.getDuration();
              event.target.seekTo(seekTime, true);
              setProgress(savedCompletedProgress.current);
            }
          },
          onStateChange: (event: { data: number; target: YouTubePlayerInstance }) => {
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsBuffering(false);
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (state === window.YT.PlayerState.BUFFERING) {
              setIsBuffering(true);
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              // Video ended - mark as complete with 100% progress
              if (playerRef.current) {
                try {
                  const dur = playerRef.current.getDuration();
                  const curr = playerRef.current.getCurrentTime();
                  const pct = dur > 0 ? (curr / dur) * 100 : 100;
                  handleVideoComplete(pct);
                } catch {
                  handleVideoComplete(100);
                }
              } else {
                handleVideoComplete(100);
              }
            }
          },
          onError: (event: { data: number }) => {
            const errorCode = event.data;
            console.error("[YouTubePlayer] Error:", errorCode);

            // YouTube error codes: https://developers.google.com/youtube/iframe_api_reference#Events
            let errorMessage = "Unable to play this video.";
            switch (errorCode) {
              case 2:
                errorMessage = "Invalid video URL or video not found.";
                break;
              case 5:
                errorMessage = "HTML5 player error. Please try refreshing the page.";
                break;
              case 100:
                errorMessage = "Video not found or has been removed.";
                break;
              case 101:
              case 150:
                errorMessage =
                  "This video cannot be played in embedded players. The video owner may have disabled embedding.";
                break;
              default:
                errorMessage = `Video playback error (Code: ${errorCode}). The video may have restrictions or be unavailable.`;
            }

            setVideoError(errorMessage);
            setIsReady(false);
          },
        },
      });
    };

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Load the API
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopProgressTracking();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [isMounted, videoId, playerContainerId, initialProgress]);

  // Progress tracking
  React.useEffect(() => {
    if (isPlaying) {
      startProgressTracking();
    } else {
      stopProgressTracking();
    }
    return () => stopProgressTracking();
  }, [isPlaying]);

  const startProgressTracking = () => {
    stopProgressTracking();
    progressInterval.current = setInterval(() => {
      if (playerRef.current) {
        try {
          const curr = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          setCurrentTime(curr);
          setDuration(dur);

          if (dur > 0) {
            const pct = (curr / dur) * 100;

            // If video was already completed, don't update saved progress - keep it at saved completed percentage
            if (wasCompletedInitially.current) {
              // Keep progress display at saved completed percentage, but allow video to play normally
              // Don't call onProgressUpdate or saveProgress to preserve the original completion percentage
              setProgress(savedCompletedProgress.current);
              return; // Don't save new progress or check completion
            }

            // Normal progress tracking for videos not yet completed
            setProgress(pct);
            if (!disableProgressUpdate) {
              onProgressUpdate?.(pct);
            }

            // Check for completion at threshold or higher
            // Also check if video has ended (currentTime very close to duration)
            const isNearEnd = dur > 0 && curr >= dur - 0.5; // Within 0.5 seconds of end
            if (
              (pct >= COMPLETION_THRESHOLD || isNearEnd) &&
              !hasCompleted &&
              !disableProgressUpdate
            ) {
              handleVideoComplete(100); // Mark as fully complete once threshold is reached
            }

            // Save progress every 5% change (only if not already completed and updates enabled)
            if (!disableProgressUpdate && Math.abs(pct - lastSavedProgress.current) >= 5) {
              saveProgress(pct);
              lastSavedProgress.current = pct;
            }
          }
        } catch (e) {
          console.error("[YouTubePlayer] Progress tracking error:", e);
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  // Player controls
  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const time = (pct / 100) * duration;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);

    // If video is completed, don't update progress display or save to backend
    // Keep the progress at the saved completion percentage
    if (hasCompleted || wasCompletedInitially.current || disableProgressUpdate) {
      // Don't update progress state - keep it at saved completion percentage
      return;
    }

    // Only update progress if video is not completed
    setProgress(pct);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;
    const vol = parseInt(e.target.value);
    setVolume(vol);
    playerRef.current.setVolume(vol);
    if (vol === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
      playerRef.current.unMute();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      if (volume === 0) {
        setVolume(50);
        playerRef.current.setVolume(50);
      }
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const skip = (sec: number) => {
    if (!playerRef.current) return;
    const newTime = Math.min(Math.max(currentTime + sec, 0), duration);
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Save progress to database
  const saveProgress = async (pct: number, forceComplete: boolean = false) => {
    // Don't save progress if disabled or if video was already completed
    if (disableProgressUpdate || wasCompletedInitially.current) {
      return;
    }

    try {
      const roundedPct = Math.round(pct);
      const isComplete = forceComplete || roundedPct >= COMPLETION_THRESHOLD;

      await fetch(`/api/courses/${courseSlug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          enrollmentId,
          videoProgress: isComplete ? 100 : roundedPct,
          videoWatched: isComplete,
        }),
      });
    } catch (e) {
      console.error("[YouTubePlayer] Failed to save progress:", e);
    }
  };

  const handleVideoComplete = (currentPct?: number) => {
    if (!hasCompleted) {
      setHasCompleted(true);
      // Always mark as 100% when video is considered complete
      const completionPct = 100;
      setProgress(completionPct);
      savedCompletedProgress.current = completionPct;
      wasCompletedInitially.current = true;

      // Don't pause the video - let it continue playing
      // User can continue watching if they want

      // Save progress to mark as completed (force complete flag)
      saveProgress(completionPct, true);
      onComplete?.();
    }
  };

  // Transcript
  const loadTranscript = async () => {
    if (!topicId) return;
    setIsLoadingTranscript(true);
    setTranscriptError(null);
    try {
      const res = await fetch(`/api/topics/${topicId}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, topicTitle, topicDescription }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTranscript(data.transcript);
      } else {
        // Show specific error message from API
        const errorMsg = data.error || "Failed to generate transcript";
        if (errorMsg.includes("captions") || errorMsg.includes("transcript")) {
          setTranscriptError(
            "This video doesn't have captions available on YouTube. Transcript cannot be generated."
          );
        } else {
          setTranscriptError(errorMsg);
        }
      }
    } catch (err) {
      console.error("[YouTubePlayer] Transcript error:", err);
      setTranscriptError("Network error - please try again");
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // --- Render ---

  if (!videoId) {
    return (
      <div className="bg-muted flex aspect-video items-center justify-center rounded-xl">
        <p className="text-muted-foreground">Invalid video URL</p>
      </div>
    );
  }

  // Show loading placeholder until mounted (prevents hydration mismatch)
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="flex aspect-video items-center justify-center rounded-xl bg-black">
          <Loader2 className="text-primary h-12 w-12 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Player Container */}
      <div
        ref={containerRef}
        className="group relative aspect-video overflow-hidden rounded-xl bg-black shadow-xl"
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* YouTube Iframe Container */}
        <div id={playerContainerId} className="absolute inset-0 h-full w-full" />

        {/* Video Error Overlay */}
        {videoError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 p-6">
            <div className="max-w-md space-y-4 text-center">
              <div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                <svg
                  className="text-destructive h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">Video Unavailable</h3>
                <p className="mb-4 text-sm text-white/80">{videoError}</p>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  Watch on YouTube
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Loading/Buffering Overlay - Only show when loading or actively buffering while playing */}
        {!videoError && (!isReady || (isBuffering && isPlaying)) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <Loader2 className="text-primary h-12 w-12 animate-spin" />
          </div>
        )}

        {/* Big Play Button (Center) - Only when paused, ready, and NOT completed */}
        {isReady && !isPlaying && !isBuffering && !hasCompleted && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
          >
            <div className="bg-primary/90 hover:bg-primary flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110">
              <Play className="ml-1 h-10 w-10 text-white" />
            </div>
          </button>
        )}

        {/* Click-to-pause Overlay (when playing) */}
        {isPlaying && (
          <div className="absolute inset-0 z-5 cursor-pointer" onClick={handlePlayPause} />
        )}

        {/* Custom Controls */}
        <div
          className={`absolute right-0 bottom-0 left-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-12 pb-4 transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {/* Progress Bar */}
          <div
            className="group/timeline relative mb-4 h-1.5 cursor-pointer rounded-full bg-white/30 transition-all hover:h-2.5"
            onClick={handleSeek}
          >
            {/* Progress fill */}
            <div
              className="bg-primary absolute top-0 left-0 h-full rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Scrubber dot */}
            <div
              className="bg-primary absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full opacity-0 shadow-lg transition-opacity group-hover/timeline:opacity-100"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button onClick={handlePlayPause} className="hover:text-primary transition-colors">
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>

              {/* Skip buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => skip(-10)}
                  className="hover:text-primary transition-colors"
                  title="Rewind 10s"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <button
                  onClick={() => skip(10)}
                  className="hover:text-primary transition-colors"
                  title="Forward 10s"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>

              {/* Volume */}
              <div className="group/volume flex items-center gap-2">
                <button onClick={toggleMute} className="hover:text-primary transition-colors">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/50 transition-all duration-300 group-hover/volume:w-20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              {/* Time display */}
              <span className="text-xs font-medium tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Completion badge */}
              {hasCompleted && (
                <span className="flex items-center gap-1.5 rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Complete
                </span>
              )}
              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="hover:text-primary transition-colors">
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Watch Progress Section */}
      <div className="bg-card border-border space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${isPlaying ? "animate-pulse bg-green-500" : hasCompleted ? "bg-green-500" : "bg-muted-foreground"}`}
            />
            <span className="text-sm font-medium">Watch Progress</span>
          </div>
          <span
            className={`text-sm font-semibold ${hasCompleted ? "text-green-600" : "text-primary"}`}
          >
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="bg-secondary h-2.5 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all duration-300 ${hasCompleted ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status message */}
        {hasCompleted ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <p className="text-sm font-medium">Video completed! You can now take the quiz.</p>
          </div>
        ) : progress > 0 ? (
          <p className="text-muted-foreground text-xs">
            Watch {Math.max(0, Math.round(COMPLETION_THRESHOLD - progress))}% more to unlock the
            quiz
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Watch at least {COMPLETION_THRESHOLD}% of the video to mark it as complete
          </p>
        )}
      </div>

      {/* Transcript Section */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <button
          onClick={() => {
            setShowTranscript(!showTranscript);
            if (!transcript && !isLoadingTranscript && !showTranscript) {
              loadTranscript();
            }
          }}
          className="hover:bg-muted/50 flex w-full items-center justify-between p-4 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
              <FileText className="text-primary h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Video Transcript</p>
              <p className="text-muted-foreground text-xs">
                {isLoadingTranscript
                  ? "Generating..."
                  : transcript
                    ? "Read along with the video"
                    : "Generate transcript"}
              </p>
            </div>
          </div>
          {isLoadingTranscript ? (
            <Loader2 className="text-primary h-4 w-4 animate-spin" />
          ) : showTranscript ? (
            <ChevronUp className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          )}
        </button>

        {showTranscript && (
          <div className="bg-muted/10 border-t p-4">
            {transcriptError ? (
              <div className="py-6 text-center">
                <div className="bg-destructive/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <FileText className="text-destructive h-6 w-6" />
                </div>
                <p className="text-destructive mb-2 text-sm font-medium">Transcript Unavailable</p>
                <p className="text-muted-foreground mx-auto mb-3 max-w-xs text-xs">
                  {transcriptError}
                </p>
                <Button
                  onClick={loadTranscript}
                  disabled={isLoadingTranscript}
                  size="sm"
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            ) : !transcript ? (
              <div className="py-6 text-center">
                <p className="text-muted-foreground mb-3 text-sm">
                  Generate a summary and transcript for this video.
                </p>
                <Button onClick={loadTranscript} disabled={isLoadingTranscript} size="sm">
                  {isLoadingTranscript && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoadingTranscript ? "Fetching from YouTube..." : "Generate Transcript"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/5 border-primary/10 rounded-lg border p-3">
                  <h4 className="text-primary mb-1 text-xs font-semibold">Summary</h4>
                  <p className="text-sm">{transcript.summary}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-muted-foreground text-xs font-semibold">Key Points</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {transcript.keyPoints.map((pt, i) => (
                      <li key={i} className="text-muted-foreground">
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t pt-2">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold">
                    Full Transcript
                  </p>
                  <div className="text-muted-foreground max-h-60 overflow-y-auto pr-2 text-sm leading-relaxed">
                    {transcript.transcript}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
