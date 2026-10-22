import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import youtubeService from '../services/youtube';

const MusicPlayer = ({ currentSong, isPlaying, onPlay, onPause, onNext, onPrevious, onSongEnd }) => {
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const loadedVideoIdRef = useRef(null);
  const onSongEndRef = useRef(onSongEnd);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    onSongEndRef.current = onSongEnd;
  }, [onSongEnd]);

  useEffect(() => {
    let mounted = true;

    const initializePlayer = async () => {
      try {
        await youtubeService.createPlayer('youtube-player', {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            playsinline: 1,
            origin: window.location.origin
          }
        });

        if (mounted) {
          setIsPlayerReady(true);

          youtubeService.onStateChangeCallbacks = [];
          youtubeService.onStateChange((state) => {
            if (state === 'ended') {
              onSongEndRef.current?.();
            } else if (state === 'playing') {
              onPlay?.();
              const dur = youtubeService.getDuration();
              if (dur > 0) setDuration(dur);
            } else if (state === 'paused') {
              onPause?.();
            }
          });
        }
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    initializePlayer();

    return () => {
      mounted = false;
    };
  }, []);

  // Active playback ticker: advances currentTime every 250ms when song is playing,
  // prioritizing actual youtube player time whenever available, and estimating smoothly if iframe lags
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const ytTime = youtubeService.getCurrentTime();
      const ytDur = youtubeService.getDuration();

      if (ytDur > 0) {
        setDuration(ytDur);
      }

      if (ytTime > 0) {
        setCurrentTime(ytTime);
      } else {
        // Fallback ticker if iframe postMessage is throttled by browser
        setCurrentTime(prev => {
          const next = prev + 0.25;
          return duration > 0 && next >= duration ? duration : next;
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  useEffect(() => {
    if (!currentSong) return;

    const videoId = currentSong.videoId || currentSong.video_id;
    if (!videoId) return;

    // Load new video if different
    if (videoId !== loadedVideoIdRef.current) {
      loadedVideoIdRef.current = videoId;
      youtubeService.playVideo(videoId);
      setCurrentTime(0);
      setDuration(currentSong.duration || 0);
      onPlay?.();
      // Ensure player state is active
      setTimeout(() => {
        if (youtubeService.player && typeof youtubeService.player.playVideo === 'function') {
          youtubeService.player.playVideo();
        }
      }, 100);
    } else if (isPlaying) {
      youtubeService.playVideo();
    }
  }, [currentSong, isPlayerReady]);

  useEffect(() => {
    if (!isPlayerReady || !youtubeService.player) return;

    if (isPlaying) {
      youtubeService.playVideo();
    } else {
      youtubeService.pauseVideo();
    }
  }, [isPlaying, isPlayerReady]);

  const handlePlayPause = () => {
    if (!currentSong) return;

    if (isPlaying) {
      onPause?.();
      youtubeService.pauseVideo();
    } else {
      onPlay?.();
      const videoId = currentSong.videoId || currentSong.video_id;
      // If this video is already loaded, simply resume playback where it paused
      if (loadedVideoIdRef.current === videoId && youtubeService.player) {
        youtubeService.playVideo();
      } else {
        loadedVideoIdRef.current = videoId;
        youtubeService.playVideo(videoId);
      }
    }
  };

  const handleNext = () => {
    onNext?.();
  };

  const handlePrevious = () => {
    onPrevious?.();
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (youtubeService.player && youtubeService.isReady) {
      youtubeService.player.setVolume(newVolume);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (youtubeService.player && youtubeService.isReady) {
      youtubeService.player.setVolume(newMutedState ? 0 : volume);
    }
  };

  const handleSeek = (e) => {
    const percent = parseFloat(e.target.value);
    const newTime = (percent / 100) * (duration || 1);
    setCurrentTime(newTime);
    youtubeService.seekTo(newTime, true);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Active YouTube iframe container kept in viewport to ensure uninterrupted timer events */}
      <div
        id="youtube-player"
        style={{
          position: 'fixed',
          bottom: '0px',
          right: '0px',
          width: '200px',
          height: '200px',
          pointerEvents: 'none',
          opacity: 0.0001,
          zIndex: -9999
        }}
      ></div>

      {/* Current Song Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 truncate">
          {currentSong?.title || 'No song selected'}
        </h3>
        <p className="text-sm text-gray-600 truncate">
          {currentSong?.artist || 'Select a song to play'}
        </p>
      </div>

      {/* Progress Bar with clickable track */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div
          className="relative w-full py-2 cursor-pointer flex items-center"
          onClick={(e) => {
            if (!currentSong) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newTime = clickPos * (duration || 180);
            setCurrentTime(newTime);
            youtubeService.seekTo(newTime, true);
          }}
        >
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={(duration > 0 ? (currentTime / duration) : (currentTime / 180)) * 100}
            onInput={handleSeek}
            onChange={handleSeek}
            disabled={!currentSong}
            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center space-x-6">
          <button
            onClick={handlePrevious}
            className="p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={!currentSong}
          >
            <SkipBack className="w-6 h-6 text-gray-700" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={!currentSong}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-gray-700" />
            ) : (
              <Play className="w-6 h-6 text-gray-700" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={!currentSong}
          >
            <SkipForward className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-2">
        <button
          onClick={toggleMute}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-gray-600" />
          ) : (
            <Volume2 className="w-4 h-4 text-gray-600" />
          )}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />

        <span className="text-xs text-gray-500 w-8">
          {isMuted ? 0 : volume}%
        </span>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: #0ea5e9;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: transform 0.1s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        .slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #0ea5e9;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: transform 0.1s ease;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
