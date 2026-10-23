import { useState, useEffect } from 'react';
import { Keyboard, X, RotateCcw, Check, Volume2, SkipForward, SkipBack, Play, Pause } from 'lucide-react';

const DEFAULT_HOTKEYS = {
  playPause: 'Space',
  nextTrack: 'KeyN',
  prevTrack: 'KeyP',
  volumeUp: 'ArrowUp',
  volumeDown: 'ArrowDown',
  mute: 'KeyM'
};

const formatKeyDisplay = (code) => {
  if (!code) return 'None';
  if (code === 'Space') return 'Spacebar';
  if (code.startsWith('Key')) return code.replace('Key', '');
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code === 'ArrowUp') return '↑ Arrow Up';
  if (code === 'ArrowDown') return '↓ Arrow Down';
  if (code === 'ArrowLeft') return '← Arrow Left';
  if (code === 'ArrowRight') return '→ Arrow Right';
  return code;
};

const HotkeysModal = ({ isOpen, onClose, hotkeys, onSaveHotkeys }) => {
  const [currentHotkeys, setCurrentHotkeys] = useState(hotkeys || DEFAULT_HOTKEYS);
  const [listeningAction, setListeningAction] = useState(null);

  useEffect(() => {
    if (hotkeys) setCurrentHotkeys(hotkeys);
  }, [hotkeys]);

  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't bind Escape as a hotkey (use it to cancel recording)
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }

      setCurrentHotkeys(prev => ({
        ...prev,
        [listeningAction]: e.code
      }));
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [listeningAction]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('hotkeys_config', JSON.stringify(currentHotkeys));
    onSaveHotkeys?.(currentHotkeys, true);
    onClose();
  };

  const handleResetDefaults = () => {
    setCurrentHotkeys(DEFAULT_HOTKEYS);
    setListeningAction(null);
  };

  const actions = [
    { id: 'playPause', label: 'Play / Pause', icon: <Play className="w-4 h-4 text-blue-600" /> },
    { id: 'nextTrack', label: 'Next Track', icon: <SkipForward className="w-4 h-4 text-gray-600" /> },
    { id: 'prevTrack', label: 'Previous Track', icon: <SkipBack className="w-4 h-4 text-gray-600" /> },
    { id: 'volumeUp', label: 'Volume Up', icon: <Volume2 className="w-4 h-4 text-green-600" /> },
    { id: 'volumeDown', label: 'Volume Down', icon: <Volume2 className="w-4 h-4 text-green-600" /> },
    { id: 'mute', label: 'Mute / Unmute', icon: <Volume2 className="w-4 h-4 text-red-500" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Keyboard Hotkeys</h2>
              <p className="text-xs text-gray-500">Customize keyboard shortcuts for quick audio control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {listeningAction && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between animate-pulse">
              <span>Press any key on your keyboard to set shortcut for <strong>{actions.find(a => a.id === listeningAction)?.label}</strong>...</span>
              <button
                onClick={() => setListeningAction(null)}
                className="ml-2 font-medium underline text-amber-900"
              >
                Cancel (Esc)
              </button>
            </div>
          )}

          {/* Hotkey List */}
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
            {actions.map((act) => {
              const isRecordingThis = listeningAction === act.id;
              const currentKey = currentHotkeys[act.id];

              return (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-3.5 hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {act.icon}
                    <span className="text-sm font-medium text-gray-700">{act.label}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setListeningAction(act.id)}
                      className={`min-w-[90px] px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-all ${
                        isRecordingThis
                          ? 'border-blue-500 bg-blue-50 text-blue-600 animate-pulse ring-2 ring-blue-400/30'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 shadow-sm'
                      }`}
                      title="Click to change key"
                    >
                      {isRecordingThis ? 'Press key...' : formatKeyDisplay(currentKey)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-200/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save Shortcuts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotkeysModal;
