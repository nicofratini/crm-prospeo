import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AiVoiceSelector } from '../ai/AiVoiceSelector';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

export function AiAgentStep({ onComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    agent_name: '',
    system_prompt: '',
    elevenlabs_voice_id: null
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-ai-agent');
        
        if (error) {
          throw error;
        }

        if (data.agent) {
          setConfig({
            agent_name: data.agent.agent_name || '',
            system_prompt: data.agent.system_prompt || '',
            elevenlabs_voice_id: data.agent.elevenlabs_voice_id || null
          });
        }

      } catch (error) {
        console.error('Error fetching agent config:', error);
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!config.agent_name || !config.elevenlabs_voice_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.functions.invoke('update-ai-agent', {
        body: config
      });

      if (error) throw error;

      toast.success('Agent configuration saved successfully');
      onComplete?.();

    } catch (error) {
      console.error('Error saving agent config:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Agent Configuration
          </h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Agent Name *
              </label>
              <input
                type="text"
                value={config.agent_name}
                onChange={(e) => setConfig({ ...config, agent_name: e.target.value })}
                placeholder="Ex: Sarah"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                System Prompt
              </label>
              <textarea
                value={config.system_prompt}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                rows={4}
                placeholder="Instructions for the agent..."
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent Voice *
              </label>
              <AiVoiceSelector
                selectedVoiceId={config.elevenlabs_voice_id}
                onSelect={(voiceId) => setConfig({ ...config, elevenlabs_voice_id: voiceId })}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={saving || !config.agent_name || !config.elevenlabs_voice_id}
              >
                {saving ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}