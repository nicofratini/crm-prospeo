import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { AiVoiceSelector } from './AiVoiceSelector';
import toast from 'react-hot-toast';

export function AiAgentPage() {
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSaveVoice = async (voiceId) => {
    setSaving(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-ai-agent`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ elevenlabs_voice_id: voiceId })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update voice');
      }

      toast.success('Voice updated successfully');
      setSelectedVoiceId(voiceId);

    } catch (error) {
      console.error('Error updating voice:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
            Agent IA
          </h1>
        </div>
        
        <div className="p-4">
          <Card className="mb-4">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configuration de l'Agent
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom de l'Agent
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sarah"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prompt Système
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Instructions pour l'agent..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="flex justify-end">
                  <Button>
                    Sauvegarder la Configuration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Voix de l'Agent
            </h2>
            <AiVoiceSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceSelect={handleSaveVoice}
            />
          </div>
        </div>
      </div>
    </main>
  );
}