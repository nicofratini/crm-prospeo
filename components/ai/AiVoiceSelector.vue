<template>
  <div class="space-y-4">
    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center text-gray-500 dark:text-gray-400">
      Chargement des voix...
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-8 text-center text-red-500">
      {{ error }}
    </div>

    <!-- Voice list -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="voice in filteredVoices"
        :key="voice.voice_id"
        :class="[
          'p-4 rounded-lg border transition-all cursor-pointer',
          selectedVoiceId === voice.voice_id
            ? 'border-primary bg-primary/5 dark:bg-primary/10'
            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
        ]"
        @click="$emit('select', voice.voice_id)"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">
              {{ voice.name }}
            </h3>
            <div v-if="voice.labels" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="(value, key) in voice.labels"
                :key="key"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              >
                {{ key }}: {{ value }}
              </span>
            </div>
          </div>

          <!-- Preview button -->
          <button
            v-if="voice.preview_url"
            @click.stop="playPreview(voice.preview_url)"
            class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
            </svg>
          </button>
        </div>

        <!-- Description -->
        <p v-if="voice.description" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {{ voice.description }}
        </p>

        <!-- Accent -->
        <p v-if="voice.accent" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Accent: {{ voice.accent }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSupabaseClient } from '#supabase/client';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  selectedVoiceId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['select']);
const toast = useToast();

// State
const voices = ref([]);
const loading = ref(true);
const error = ref(null);

// Computed
const filteredVoices = computed(() => voices.value);

// Methods
const fetchVoices = async () => {
  const supabase = useSupabaseClient();
  try {
    const { data, error: functionError } = await supabase.functions.invoke('list-elevenlabs-voices');

    if (functionError) {
      throw functionError;
    }

    if (!data?.voices || !Array.isArray(data.voices)) {
      throw new Error('Invalid response format from voice service');
    }

    voices.value = data.voices;
    error.value = null;

  } catch (err) {
    console.error('Error fetching voices:', err);
    error.value = err.message || 'Failed to load voices';
    toast.error('Failed to load voice list');
  } finally {
    loading.value = false;
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

// Lifecycle
onMounted(() => {
  fetchVoices();
});
</script>