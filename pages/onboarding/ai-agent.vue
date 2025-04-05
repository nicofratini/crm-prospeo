<script setup lang="ts">
import { ref, watch, inject } from 'vue';
import { useFetch } from '#imports';
import { z } from 'zod';
import type { Database } from '~/types/supabase';

type AiAgent = Database['public']['Tables']['ai_agents']['Row'];

// Schema for validation
const schema = z.object({
  agent_name: z.string().min(1, 'Agent name is required'),
  elevenlabs_voice_id: z.string().min(1, 'Voice selection is required'),
  system_prompt: z.string().optional(),
});

// Navigation control from onboarding layout
const { setCanProceed } = inject('onboardingNavigation') as {
  setCanProceed: (value: boolean) => void;
};

// Form state
const form = ref({
  agent_name: '',
  elevenlabs_voice_id: '',
  system_prompt: '',
});

// Loading and error states
const isLoadingConfig = ref(true);
const isSaving = ref(false);
const loadingError = ref<string | null>(null);
const saveError = ref<string | null>(null);

// Load initial configuration
const { data: initialConfig, error: fetchError } = await useFetch<AiAgent>('/api/ai/agent', {
  lazy: false,
  server: false,
  onResponseError({ error }) {
    loadingError.value = error.data?.message || 'Failed to load initial configuration.';
  }
});

// Watch for initial config load
watch(initialConfig, (config) => {
  if (config) {
    console.log('Loaded initial AI agent config:', config);
    form.value.agent_name = config.agent_name || '';
    form.value.elevenlabs_voice_id = config.elevenlabs_voice_id || '';
    form.value.system_prompt = config.system_prompt || '';
    validateAndSetCanProceed();
  }
  isLoadingConfig.value = false;
}, { immediate: true });

// Set loading to false if there's an error
if (fetchError.value) {
  isLoadingConfig.value = false;
}

// Validation and proceed state management
function validateAndSetCanProceed() {
  try {
    schema.parse(form.value);
    setCanProceed(true);
  } catch {
    setCanProceed(false);
  }
}

// Watch form changes for validation
watch(form, validateAndSetCanProceed, { deep: true });

// Save function exposed to layout
async function saveAgentConfiguration() {
  if (isSaving.value) return false;
  
  saveError.value = null;
  isSaving.value = true;
  
  try {
    schema.parse(form.value);
    if (!form.value.elevenlabs_voice_id) {
      throw new Error('Voice selection is required.');
    }

    await $fetch('/api/ai/agent', {
      method: 'PUT',
      body: {
        agent_name: form.value.agent_name,
        elevenlabs_voice_id: form.value.elevenlabs_voice_id,
        system_prompt: form.value.system_prompt,
      },
    });

    console.log('AI Agent configuration saved successfully');
    return true;

  } catch (err: any) {
    console.error('Error saving AI Agent configuration:', err);
    if (err instanceof z.ZodError) {
      saveError.value = 'Please check all required fields.';
    } else {
      saveError.value = err.data?.message || err.message || 'Failed to save configuration.';
    }
    return false;

  } finally {
    isSaving.value = false;
  }
}

// Expose save function to parent
defineExpose({ saveStep: saveAgentConfiguration });
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Loading State -->
    <div v-if="isLoadingConfig" class="flex items-center justify-center min-h-[400px]">
      <p class="text-gray-500">Loading configuration...</p>
    </div>

    <!-- Loading Error -->
    <div v-else-if="loadingError" class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
      <p class="text-red-600 dark:text-red-400">{{ loadingError }}</p>
      <button 
        class="mt-2 text-sm text-red-700 dark:text-red-300 hover:underline"
        @click="window.location.reload()"
      >
        Try Again
      </button>
    </div>

    <!-- Main Form -->
    <div v-else class="space-y-6">
      <!-- Save Error Alert -->
      <div 
        v-if="saveError"
        class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4"
      >
        <p class="text-red-600 dark:text-red-400">{{ saveError }}</p>
      </div>

      <!-- Agent Configuration Form -->
      <div class="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div class="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Configuration de l'Agent IA
          </h2>
        </div>

        <div class="p-6 space-y-6">
          <!-- Agent Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom de l'Agent *
            </label>
            <input
              v-model="form.agent_name"
              type="text"
              placeholder="Ex: Sarah"
              class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <!-- System Prompt -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt Système
            </label>
            <textarea
              v-model="form.system_prompt"
              rows="4"
              placeholder="Instructions pour l'agent..."
              class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <!-- Voice Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Voix de l'Agent *
            </label>
            <VoiceSelector
              :selected-voice-id="form.elevenlabs_voice_id"
              @select="(voiceId) => form.elevenlabs_voice_id = voiceId"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>