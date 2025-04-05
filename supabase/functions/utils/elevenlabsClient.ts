const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export async function getElevenLabsVoices() {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data.voices)) {
      throw new Error('Invalid response format from ElevenLabs API');
    }

    return data.voices;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request to ElevenLabs API timed out');
    }
    throw error;
  }
}