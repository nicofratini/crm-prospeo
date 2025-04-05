import { corsHeaders } from '../_shared/cors.ts';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  labels?: Record<string, string>;
  description?: string;
  accent?: string;
}

export async function getElevenLabsVoices(): Promise<Voice[]> {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
        'User-Agent': 'Prospeo/1.0'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `Failed to fetch voices: ${response.status} ${response.statusText}`);
    }

    const data = await response.json().catch(() => {
      throw new Error('Invalid JSON response from ElevenLabs API');
    });

    if (!data.voices || !Array.isArray(data.voices)) {
      throw new Error('Invalid response format from ElevenLabs API');
    }

    return data.voices.map((voice: any) => ({
      voice_id: voice.voice_id,
      name: voice.name,
      preview_url: voice.preview_url,
      labels: voice.labels || {},
      description: voice.description,
      accent: voice.labels?.accent
    }));

  } catch (error) {
    console.error('ElevenLabs API Error:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

export async function generateSpeech(
  text: string,
  voiceId: string,
  options: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  } = {}
): Promise<ArrayBuffer> {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          'User-Agent': 'Prospeo/1.0'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: options.stability ?? 0.75,
            similarity_boost: options.similarity_boost ?? 0.75,
            style: options.style,
            use_speaker_boost: options.use_speaker_boost ?? true
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `Failed to generate speech: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();

  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}