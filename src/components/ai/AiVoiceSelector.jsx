import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export function AiVoiceSelector({ selectedVoiceId, onSelect }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVoices = async () => {
    setLoading(true);
    setError(null);
    console.log('[AiVoiceSelector] Fetching voices via proxy...');
    
    try {
      const response = await fetch('/api/elevenlabs/voices', {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch voices (${response.status})`);
      }

      const data = await response.json();
      console.log('[AiVoiceSelector] Received response:', data);
      
      if (!data?.voices || !Array.isArray(data.voices)) {
        throw new Error('Invalid response format from voice service');
      }

      setVoices(data.voices);
      setError(null);

    } catch (err) {
      console.error('[AiVoiceSelector] Error fetching voices:', err);
      setError(err.message || 'Failed to load voices');
      toast.error('Failed to load voice list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const playPreview = (previewUrl) => {
    try {
      const audio = new Audio(previewUrl);
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        toast.error('Failed to play voice preview');
      });
    } catch (error) {
      console.error('Error creating audio player:', error);
      toast.error('Failed to play voice preview');
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        Loading voices...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchVoices}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {voices.map((voice) => (
        <div
          key={voice.voice_id}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            selectedVoiceId === voice.voice_id
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
          }`}
          onClick={() => onSelect(voice.voice_id)}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {voice.name}
              </h3>
              {voice.labels && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(voice.labels).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {voice.preview_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playPreview(voice.preview_url);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
                </svg>
              </button>
            )}
          </div>

          {voice.description && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {voice.description}
            </p>
          )}

          {voice.accent && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Accent: {voice.accent}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}