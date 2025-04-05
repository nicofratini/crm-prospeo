<template>
  <div class="p-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Configurations Agents IA</h1>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="text-center py-8">
      <p class="text-gray-500">Chargement des configurations...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
      <p class="text-red-600 dark:text-red-400">{{ error.message }}</p>
      <button 
        class="mt-2 text-sm text-red-700 dark:text-red-300 hover:underline"
        @click="refresh"
      >
        Réessayer
      </button>
    </div>

    <!-- Data Table -->
    <div v-if="!pending && !error" class="bg-white dark:bg-dark-card rounded-lg shadow">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Nom Agent</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">ID Voix</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">ID Agent EL</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Propriétaire</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Dernière MàJ</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="agent in agents" :key="agent.id" class="hover:bg-gray-50 dark:hover:bg-dark-hover">
              <td class="px-4 py-3 text-sm">{{ agent.agent_name }}</td>
              <td class="px-4 py-3 text-sm font-mono text-xs">{{ agent.elevenlabs_voice_id }}</td>
              <td class="px-4 py-3 text-sm font-mono text-xs">{{ agent.elevenlabs_agent_id || '-' }}</td>
              <td class="px-4 py-3 text-sm">{{ agent.user?.email }}</td>
              <td class="px-4 py-3 text-sm">{{ formatDate(agent.updated_at) }}</td>
              <td class="px-4 py-3 text-right">
                <button 
                  class="text-primary hover:text-primary-light text-sm font-medium"
                  @click="useAsSource(agent)"
                >
                  Utiliser comme Source
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          {{ totalAgents }} configuration{{ totalAgents > 1 ? 's' : '' }}
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover disabled:opacity-50"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            Précédent
          </button>
          <button
            class="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover disabled:opacity-50"
            :disabled="currentPage >= Math.ceil(totalAgents / itemsPerPage)"
            @click="goToPage(currentPage + 1)"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types
interface AiAgent {
  id: string;
  agent_name: string;
  elevenlabs_voice_id: string;
  elevenlabs_agent_id: string | null;
  system_prompt: string | null;
  updated_at: string;
  user?: {
    email: string;
  };
}

interface AgentsApiResponse {
  agents: AiAgent[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
}

// State
const currentPage = ref(1);
const itemsPerPage = ref(15);

// Computed
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: itemsPerPage.value
}));

// Data Fetching
const { data: agentsData, pending, error, refresh } = await useFetch<AgentsApiResponse>('/api/admin/ai-agents', {
  query: queryParams,
  watch: [queryParams],
  lazy: false,
  server: false
});

const agents = computed(() => agentsData.value?.agents || []);
const totalAgents = computed(() => agentsData.value?.totalItems || 0);

// Methods
function formatDate(date: string) {
  return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: fr });
}

function goToPage(newPage: number) {
  currentPage.value = newPage;
}

function useAsSource(agent: AiAgent) {
  // TODO: Implement source selection
  console.log('Use agent as source:', agent.id);
}
</script>
```