import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabaseClient';

/**
 * @typedef {Object} AiAgentConfig
 * @property {string} id - Unique identifier for the AI agent
 * @property {string} [agent_name] - Name of the AI agent
 * @property {string} [elevenlabs_voice_id] - ElevenLabs voice ID
 * @property {string} [system_prompt] - System prompt for the AI
 * @property {string} [created_at] - Creation timestamp
 * @property {string} [updated_at] - Last update timestamp
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} id - User's unique identifier
 * @property {string} [email] - User's email address
 * @property {string} [name] - User's full name
 * @property {string} [avatar_url] - URL to user's avatar image
 * @property {boolean} [onboarding_completed] - Whether onboarding is complete
 * @property {string} [created_at] - Account creation timestamp
 * @property {string} [updated_at] - Last update timestamp
 * @property {string} [last_login] - Last login timestamp
 * @property {AiAgentConfig|null} ai_agent - Associated AI agent configuration
 */

/**
 * Hook to fetch and manage user profile data
 * @returns {Object} Profile data and management functions
 * @property {UserProfile|null} profile - The user's profile data
 * @property {AiAgentConfig|null} aiAgentConfig - The user's AI agent configuration
 * @property {boolean} loading - Whether profile data is being loaded
 * @property {string|null} error - Error message if fetch failed
 * @property {Function} refreshProfile - Function to manually refresh profile data
 */
export function useUserProfile() {
  const { session, status } = useAuth();
  const [profile, setProfile] = useState(null);
  const [aiAgentConfig, setAiAgentConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (status === 'authenticated' && session?.access_token) {
      setLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          'get-user-profile',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        );

        if (functionError) throw functionError;

        if (data?.profile) {
          setProfile(data.profile);
          setAiAgentConfig(data.profile.ai_agent);
        } else {
          setProfile(null);
          setAiAgentConfig(null);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err.message || 'Failed to fetch profile');
        setProfile(null);
        setAiAgentConfig(null);
      } finally {
        setLoading(false);
      }
    } else {
      setProfile(null);
      setAiAgentConfig(null);
      setLoading(false);
      setError(null);
    }
  }, [session, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    } else if (status === 'unauthenticated') {
      setProfile(null);
      setAiAgentConfig(null);
      setLoading(false);
      setError(null);
    }
  }, [status, fetchProfile]);

  return {
    profile,
    aiAgentConfig,
    loading,
    error,
    refreshProfile: fetchProfile
  };
}