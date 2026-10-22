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
            playsinline: 1
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
            } else if (state === 'paused') {
              onPause?.();
            }
          });

          // Update progress every 500ms for smoother updates
          progressIntervalRef.current = setInterval(() => {
            if (youtubeService.player && youtubeService.isReady) {
              const ct = youtubeService.getCurrentTime();
              const dur = youtubeService.getDuration();
              setCurrentTime(ct);
              setDuration(dur);
            }
          }, 500);
        }
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    initializePlayer();

    return () => {
      mounted = false;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlayerReady || !currentSong) return;

    const videoId = currentSong.videoId || currentSong.video_id;
    if (!videoId) return;

    loadedVideoIdRef.current = videoId;
    youtubeService.playVideo(videoId);
    setCurrentTime(0);
    setDuration(0);
    youtubeService.setVolume(isMuted ? 0 : volume);
  }, [currentSong, isPlayerReady]);

  useEffect(() => {
    if (!isPlayerReady || !youtubeService.player) return;

    if (isPlaying) {
      youtubeService.playVideo();
    } else {
      youtubeService.player.pauseVideo();
    }
  }, [isPlaying, isPlayerReady]);

  const handlePlayPause = () => {
    if (!currentSong) return;

    if (isPlaying) {
      onPause?.();
    } else {
      youtubeService.playVideo();
      onPlay?.();
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
    const newTime = (e.target.value / 100) * duration;
    setCurrentTime(newTime);
    if (youtubeService.player && youtubeService.isReady) {
      youtubeService.player.seekTo(newTime, true);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* YouTube Player iframe container - kept in DOM with minimal footprint so browser never freezes audio */}
      <div
        id="youtube-player"
        style={{
          position: 'fixed',
          bottom: '0px',
          right: '0px',
          width: '2px',
          height: '2px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -1
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

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={duration > 0 ? (currentTime / duration) * 100 : 0}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
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
          width: 12px;
          height: 12px;
          background: #0ea5e9;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #0ea5e9;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
