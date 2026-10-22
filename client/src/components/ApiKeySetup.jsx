import { useState, useEffect } from 'react';
import { Key, AlertCircle, Check } from 'lucide-react';
import youtubeDataAPI from '../services/youtubeDataAPI';

const ApiKeySetup = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('youtubeApiKey') : '') || 'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g';
  });
  const [isSaved, setIsSaved] = useState(() => {
    return Boolean(typeof window !== 'undefined' && (localStorage.getItem('youtubeApiKey') || 'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g'));
  });
  // Initialize to false if key exists so there is zero initial flicker
  const [showSetup, setShowSetup] = useState(() => {
    const existing = typeof window !== 'undefined' ? (localStorage.getItem('youtubeApiKey') || 'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g') : null;
    return !existing;
  });

  useEffect(() => {
    const savedKey = (typeof window !== 'undefined' ? localStorage.getItem('youtubeApiKey') : null) || 'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g';
    if (savedKey) {
      youtubeDataAPI.setApiKey(savedKey);
      onApiKeySet?.(true);
    }
  }, [onApiKeySet]);

  const handleSaveApiKey = async () => {
    if (apiKey.trim()) {
      const trimmed = apiKey.trim();
      localStorage.setItem('youtubeApiKey', trimmed);
      youtubeDataAPI.setApiKey(trimmed);
      try {
        const { config } = await import('../services/api');
        await config.setYoutubeKey(trimmed);
      } catch (err) {
        console.error('Error persisting key to SQLite:', err);
      }
      setIsSaved(true);
      setShowSetup(false);
      onApiKeySet?.(true);
    }
  };

  const handleSkipSetup = () => {
    setShowSetup(false);
    onApiKeySet?.(false);
  };

  if (!showSetup) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <Key className="w-6 h-6 text-primary-500 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">YouTube API Setup</h2>
        </div>

        <div className="mb-4">
          <div className="flex items-start mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                To search for real YouTube music, you need a YouTube Data API v3 key.
              </p>
              <p className="mb-2">
                You can get a free API key from the{' '}
                <a 
                  href="https://console.developers.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Google Cloud Console
                </a>.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Create a new project or select existing one</li>
                <li>Enable "YouTube Data API v3"</li>
                <li>Create credentials (API Key)</li>
                <li>Copy and paste the key below</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube Data API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim()}
            className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              'Save API Key'
            )}
          </button>
          <button
            onClick={handleSkipSetup}
            className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Use Demo Mode
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Without an API key, you'll only see demo music results. 
            The app will still work for playlist management and YouTube IFrame playback.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;
