import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import toast from 'react-hot-toast';

const VoiceCard = ({ voice, selected, onSelect }) => (
  <div 
    className={`p-4 rounded-lg border transition-all cursor-pointer ${
      selected 
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
      <div className="flex items-center gap-2">
        {voice.preview_url && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const audio = new Audio(voice.preview_url);
              audio.play().catch(error => {
                console.error('Failed to play audio:', error);
                toast.error('Failed to play voice preview');
              });
            }}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
            </svg>
          </button>
        )}
      </div>
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
);

export function AiVoiceSelector({ selectedVoiceId, onVoiceSelect }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    accent: '',
    gender: ''
  });

  useEffect(() => {
    const fetchVoices = async () => {
      console.log('[AiVoiceSelector] Fetching voices via proxy API...');
      try {
        const response = await fetch('/api/elevenlabs/voices');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data?.voices || !Array.isArray(data.voices)) {
          throw new Error('Invalid response format from server');
        }

        console.log('[AiVoiceSelector] Successfully fetched voices:', data.voices.length);
        setVoices(data.voices);
        setError(null);

      } catch (err) {
        console.error('[AiVoiceSelector] Error fetching voices:', err);
        setError(err.message);
        toast.error('Failed to load voice list');
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  // Get unique accents and genders for filters
  const accents = [...new Set(voices.map(voice => voice.accent).filter(Boolean))];
  const genders = [...new Set(voices.map(voice => voice.labels?.gender).filter(Boolean))];

  // Filter voices based on search and filters
  const filteredVoices = voices.filter(voice => {
    if (filters.search && !voice.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.accent && voice.accent !== filters.accent) {
      return false;
    }
    if (filters.gender && voice.labels?.gender !== filters.gender) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        Loading voices...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search voices..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          
          <select
            value={filters.accent}
            onChange={(e) => setFilters({ ...filters, accent: e.target.value })}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Accents</option>
            {accents.map(accent => (
              <option key={accent} value={accent}>{accent}</option>
            ))}
          </select>

          <select
            value={filters.gender}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Genders</option>
            {genders.map(gender => (
              <option key={gender} value={gender}>{gender}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVoices.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              selected={voice.voice_id === selectedVoiceId}
              onSelect={onVoiceSelect}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}