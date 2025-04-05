import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';

export function AiVoiceSelector({ selectedVoiceId, onSelect }) {
  const [allVoices, setAllVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    language: '',
    accent: '',
    gender: '',
    age: '',
    category: '',
    voice_type: '',
    sort: 'created_at_unix',
    sort_direction: 'desc'
  });

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  const fetchVoices = async (retry = false) => {
    if (retry) {
      setRetryCount(prev => prev + 1);
    } else {
      setRetryCount(0);
    }

    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page_size: '100',
        include_total_count: 'true'
      });

      // Add filters if they have values
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
      
      // Update the URL to use the correct endpoint
      const url = `${import.meta.env.VITE_API_URL}/api/elevenlabs/voices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include credentials for cross-origin requests
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch voices (${response.status})`);
      }

      const data = await response.json();
      
      if (!data?.voices || !Array.isArray(data.voices)) {
        throw new Error('Invalid response format from voice service');
      }

      setAllVoices(data.voices);
      setError(null);

    } catch (err) {
      console.error('Error fetching voices:', err);
      setError(err.message || 'Failed to load voices');

      if (retryCount < MAX_RETRIES) {
        setTimeout(() => fetchVoices(true), RETRY_DELAY);
      } else {
        toast.error('Failed to load voice list after multiple attempts');
      }
    } finally {
      setLoading(false);
    }
  };

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const options = {
      categories: new Set(),
      voice_types: new Set(),
      languages: new Set(),
      accents: new Set(),
      ages: new Set(),
      genders: new Set()
    };

    allVoices.forEach(voice => {
      if (voice.category) options.categories.add(voice.category);
      if (voice.voice_type) options.voice_types.add(voice.voice_type);
      
      if (voice.verified_languages?.length > 0) {
        voice.verified_languages.forEach(lang => {
          if (lang.language) options.languages.add(lang.language);
          if (lang.accent) options.accents.add(lang.accent);
        });
      }

      const labels = voice.labels || {};
      if (labels.age) options.ages.add(labels.age);
      if (labels.gender) options.genders.add(labels.gender);
    });

    return {
      categories: Array.from(options.categories).sort(),
      voice_types: Array.from(options.voice_types).sort(),
      languages: Array.from(options.languages).sort(),
      accents: Array.from(options.accents).sort(),
      ages: Array.from(options.ages).sort(),
      genders: Array.from(options.genders).sort()
    };
  }, [allVoices]);

  useEffect(() => {
    fetchVoices();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
          onClick={() => fetchVoices()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search voices..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <svg 
            className="absolute left-3 top-2.5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            fill="currentColor" 
            viewBox="0 0 256 256"
          >
            <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>
          </svg>
        </div>

        {/* Primary Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <select
            value={filters.language}
            onChange={(e) => handleFilterChange('language', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Languages</option>
            {filterOptions.languages.map(lang => (
              <option key={lang} value={lang}>
                {new Intl.DisplayNames(['en'], {type: 'language'}).of(lang)}
              </option>
            ))}
          </select>

          <select
            value={filters.accent}
            onChange={(e) => handleFilterChange('accent', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Accents</option>
            {filterOptions.accents.map(accent => (
              <option key={accent} value={accent}>{accent}</option>
            ))}
          </select>

          <select
            value={filters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Genders</option>
            {filterOptions.genders.map(gender => (
              <option key={gender} value={gender}>{gender}</option>
            ))}
          </select>

          <select
            value={filters.age}
            onChange={(e) => handleFilterChange('age', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Ages</option>
            {filterOptions.ages.map(age => (
              <option key={age} value={age}>{age}</option>
            ))}
          </select>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={filters.voice_type}
            onChange={(e) => handleFilterChange('voice_type', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Voice Types</option>
            {filterOptions.voice_types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="created_at_unix">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Active Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(filters).map(([key, value]) => {
          if (value && key !== 'sort' && key !== 'sort_direction' && key !== 'search') {
            return (
              <span 
                key={key}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
              >
                {key}: {value}
                <button
                  onClick={() => handleFilterChange(key, '')}
                  className="ml-1 hover:text-primary-dark"
                >
                  ×
                </button>
              </span>
            );
          }
          return null;
        })}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {allVoices.length} voices
      </div>

      {/* Voice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allVoices.map((voice) => (
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {voice.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      {voice.category}
                    </span>
                  )}
                  {voice.verified_languages?.map((lang, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {lang.language} ({lang.accent})
                    </span>
                  ))}
                </div>
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
          </div>
        ))}
      </div>
    </div>
  );
}