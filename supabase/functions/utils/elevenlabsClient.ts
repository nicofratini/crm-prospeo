const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Interfaces for ElevenLabs API
interface ProspeoAgentConfig {
  agent_name: string;
  elevenlabs_voice_id: string;
  system_prompt: string;
}

interface ElConvaiAgentCreateParams {
  name: string;
  conversation_config?: {
    tts?: { voice_id: string };
    agent?: { prompt?: { prompt: string } };
  };
}

type ElConvaiAgentUpdateParams = Partial<ElConvaiAgentCreateParams>;

interface ElConvaiAgentResponse {
  agent_id: string;
  name?: string;
  conversation_config?: any;
  [key: string]: any;
}

// Helper to get API key from environment
const getApiKey = () => {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }
  return apiKey;
};

/**
 * Creates a new agent on the ElevenLabs platform using the Convai API.
 */
export const createElevenLabsConvaiAgent = async (config: ProspeoAgentConfig): Promise<ElConvaiAgentResponse> => {
  console.log('Creating ElevenLabs CONVAI agent with config:', config);
  
  const elPayload: ElConvaiAgentCreateParams = {
    name: config.agent_name,
    conversation_config: {
      tts: { voice_id: config.elevenlabs_voice_id },
      agent: { prompt: { prompt: config.system_prompt || ' ' } }
    }
  };

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/v1/convai/agents`, {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(elPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { 
        status: response.status, 
        message: errorData.detail || `EL Create Agent API Error ${response.status}` 
      };
    }

    const newAgent = await response.json();
    console.log('ElevenLabs CONVAI agent created:', newAgent);

    if (!newAgent?.agent_id) {
      throw new Error('EL API did not return agent_id');
    }

    return newAgent as ElConvaiAgentResponse;
  } catch (error: any) {
    console.error('Error creating EL CONVAI agent:', error?.message || error);
    throw error;
  }
};

/**
 * Updates an existing agent on the ElevenLabs platform using the Convai API.
 */
export const updateElevenLabsConvaiAgent = async (
  agentId: string, 
  config: Partial<ProspeoAgentConfig>
): Promise<ElConvaiAgentResponse | null> => {
  const elPayload: ElConvaiAgentUpdateParams = {};
  
  if (config.agent_name !== undefined) {
    elPayload.name = config.agent_name;
  }
  
  if (config.elevenlabs_voice_id !== undefined) {
    elPayload.conversation_config = {
      ...elPayload.conversation_config,
      tts: { voice_id: config.elevenlabs_voice_id }
    };
  }
  
  if (config.system_prompt !== undefined) {
    elPayload.conversation_config = {
      ...elPayload.conversation_config,
      agent: { prompt: { prompt: config.system_prompt || ' ' } }
    };
  }

  if (Object.keys(elPayload).length === 0) {
    console.warn(`Update called for EL CONVAI agent ${agentId} with no changes.`);
    return getElevenLabsConvaiAgent(agentId);
  }

  console.log(`Updating ElevenLabs CONVAI agent ${agentId} with payload:`, elPayload);

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': getApiKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(elPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 404) return null;
      throw { 
        status: response.status, 
        message: errorData.detail || `EL Update Agent API Error ${response.status}` 
      };
    }

    return await getElevenLabsConvaiAgent(agentId);
  } catch (error: any) {
    console.error(`Error updating EL CONVAI agent ${agentId}:`, error?.message || error);
    if (error.status === 404) return null;
    throw error;
  }
};

/**
 * Gets details of a specific agent from the ElevenLabs platform.
 */
export const getElevenLabsConvaiAgent = async (agentId: string): Promise<ElConvaiAgentResponse | null> => {
  console.log(`Fetching ElevenLabs CONVAI agent ${agentId}`);
  
  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/v1/convai/agents/${agentId}`, {
      headers: {
        'xi-api-key': getApiKey()
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const errorData = await response.json().catch(() => ({}));
      throw { 
        status: response.status, 
        message: errorData.detail || `EL Get Agent API Error ${response.status}` 
      };
    }

    const agent = await response.json();
    return agent as ElConvaiAgentResponse;
  } catch (error: any) {
    console.error(`Error fetching EL CONVAI agent ${agentId}:`, error?.message || error);
    if (error.status === 404) return null;
    throw error;
  }
};

/**
 * Gets available voices from ElevenLabs.
 */
export const getElevenLabsVoices = async () => {
  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/v1/voices`, {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': getApiKey()
      }
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
};