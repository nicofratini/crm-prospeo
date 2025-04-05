```vue
<template>
  <div class="p-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Gestion des Utilisateurs</h1>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="text-center py-8">
      <p class="text-gray-500">Chargement des utilisateurs...</p>
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
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Confirmation</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Dernière Connexion</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Admin</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Agent IA</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 dark:hover:bg-dark-hover">
              <td class="px-4 py-3 text-sm">{{ user.email }}</td>
              <td class="px-4 py-3 text-sm">
                <span v-if="user.email_confirmed_at" class="text-green-600 dark:text-green-400">
                  {{ formatDate(user.email_confirmed_at) }}
                </span>
                <span v-else class="text-gray-400">Non confirmé</span>
              </td>
              <td class="px-4 py-3 text-sm">
                {{ user.last_login ? formatDate(user.last_login) : 'Jamais' }}
              </td>
              <td class="px-4 py-3 text-sm">
                <span :class="user.is_admin ? 'text-primary' : 'text-gray-500'">
                  {{ user.is_admin ? 'Oui' : 'Non' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">
                <span :class="user.has_ai_agent ? 'text-green-600 dark:text-green-400' : 'text-gray-500'">
                  {{ user.has_ai_agent ? 'Configuré' : 'Non configuré' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button 
                  class="text-primary hover:text-primary-light text-sm font-medium"
                  @click="openAssignModal(user)"
                >
                  Assigner Config Agent
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          {{ totalUsers }} utilisateur{{ totalUsers > 1 ? 's' : '' }}
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
            :disabled="currentPage >= Math.ceil(totalUsers / itemsPerPage)"
            @click="goToPage(currentPage + 1)"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>

    <!-- Assignment Modal -->
    <UiModal v-model="isAssignModalOpen">
      <template #title>
        Assigner une Configuration Agent à {{ selectedUserForAssignment?.email }}
      </template>

      <div class="space-y-4">
        <!-- Loading State -->
        <div v-if="isLoadingSources" class="py-4 text-center text-gray-500">
          Chargement des configurations disponibles...
        </div>

        <!-- Error State -->
        <div v-if="assignError" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p class="text-red-600 dark:text-red-400">{{ assignError }}</p>
        </div>

        <!-- Source Selection -->
        <div v-if="!isLoadingSources">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Configuration Source
          </label>
          <select
            v-model="selectedSourceConfigId"
            class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Sélectionner une configuration</option>
            <option 
              v-for="config in availableAgentConfigs" 
              :key="config.id" 
              :value="config.id"
            >
              {{ config.agent_name }} ({{ config.user?.email }})
            </option>
          </select>
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover rounded-lg transition-colors"
          @click="isAssignModalOpen = false"
        >
          Annuler
        </button>
        <button
          class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light rounded-lg transition-colors disabled:opacity-50"
          :disabled="!selectedSourceConfigId || isAssigning"
          @click="confirmAssignment"
        >
          {{ isAssigning ? 'Assignation...' : 'Confirmer l\'Assignation' }}
        </button>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/composables/useToast';

// Types
interface AdminUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_login: string | null;
  is_admin: boolean;
  has_ai_agent: boolean;
}

interface AiAgent {
  id: string;
  agent_name: string;
  user?: {
    email: string | null;
  };
}

interface UsersApiResponse {
  users: AdminUser[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
}

// State
const currentPage = ref(1);
const itemsPerPage = ref(15);
const toast = useToast();

// Modal State
const isAssignModalOpen = ref(false);
const selectedUserForAssignment = ref<AdminUser | null>(null);
const selectedSourceConfigId = ref<string | null>(null);
const availableAgentConfigs = ref<AiAgent[]>([]);
const isLoadingSources = ref(false);
const isAssigning = ref(false);
const assignError = ref<string | null>(null);

// Computed
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: itemsPerPage.value
}));

// Data Fetching
const { data: usersData, pending, error, refresh } = await useFetch<UsersApiResponse>('/api/admin/users', {
  query: queryParams,
  watch: [queryParams],
  lazy: false,
  server: false
});

const users = computed(() => usersData.value?.users || []);
const totalUsers = computed(() => usersData.value?.totalItems || 0);

// Methods
function formatDate(date: string) {
  return format(new Date(date), 'dd MMM yyyy', { locale: fr });
}

function goToPage(newPage: number) {
  currentPage.value = newPage;
}

async function fetchAvailableAgentConfigs() {
  isLoadingSources.value = true;
  assignError.value = null;

  try {
    const response = await $fetch('/api/admin/ai-agents');
    availableAgentConfigs.value = response.agents;
  } catch (error: any) {
    console.error('Error fetching agent configs:', error);
    assignError.value = 'Erreur lors du chargement des configurations disponibles';
    toast.error('Erreur lors du chargement des configurations');
  } finally {
    isLoadingSources.value = false;
  }
}

function openAssignModal(user: AdminUser) {
  selectedUserForAssignment.value = user;
  selectedSourceConfigId.value = null;
  assignError.value = null;
  isAssignModalOpen.value = true;
  fetchAvailableAgentConfigs();
}

async function confirmAssignment() {
  if (!selectedUserForAssignment.value || !selectedSourceConfigId.value) {
    return;
  }

  isAssigning.value = true;
  assignError.value = null;

  try {
    await $fetch('/api/admin/assign-agent-config', {
      method: 'POST',
      body: {
        targetUserId: selectedUserForAssignment.value.id,
        sourceAgentConfigId: selectedSourceConfigId.value
      }
    });

    toast.success('Configuration assignée avec succès');
    isAssignModalOpen.value = false;
    refresh(); // Refresh user list to update status

  } catch (error: any) {
    console.error('Error assigning config:', error);
    assignError.value = error.data?.message || 'Erreur lors de l\'assignation de la configuration';
    toast.error('Erreur lors de l\'assignation');
  } finally {
    isAssigning.value = false;
  }
}
</script>
```