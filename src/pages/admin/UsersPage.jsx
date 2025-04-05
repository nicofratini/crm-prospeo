import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

export default function UsersPage() {
  // State for users list and pagination
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for AI agent assignment modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState(null);
  const [availableAgentConfigs, setAvailableAgentConfigs] = useState([]);
  const [selectedSourceConfigId, setSelectedSourceConfigId] = useState('');
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);

  // Fetch users data
  const fetchUsers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_user_list', {
        param_limit: itemsPerPage,
        param_offset: (page - 1) * itemsPerPage
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setUsers(data || []);
      setTotalUsers(data?.length || 0);
      setCurrentPage(page);

    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage]);

  // Fetch available agent configurations
  const fetchAvailableAgentConfigs = async () => {
    setIsLoadingSources(true);
    setAssignError(null);

    try {
      const { data: agents, error: configError } = await supabase
        .from('ai_agents')
        .select(`
          id,
          agent_name,
          user:users (
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (configError) throw configError;

      setAvailableAgentConfigs(agents || []);
    } catch (err) {
      console.error('Error fetching agent configs:', err);
      setAssignError('Could not load source configurations');
      setAvailableAgentConfigs([]);
    } finally {
      setIsLoadingSources(false);
    }
  };

  // Open assignment modal
  const openAssignModal = (user) => {
    setSelectedUserForAssignment(user);
    setSelectedSourceConfigId('');
    setAssignError(null);
    setIsAssignModalOpen(true);
    fetchAvailableAgentConfigs();
  };

  // Handle assignment confirmation
  const confirmAssignment = async () => {
    if (!selectedUserForAssignment || !selectedSourceConfigId) {
      setAssignError('Please select a source configuration');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      const { error: assignError } = await supabase.rpc('assign_agent_config', {
        target_user_id: selectedUserForAssignment.id,
        source_config_id: selectedSourceConfigId
      });

      if (assignError) throw assignError;

      toast.success('Configuration assigned successfully');
      setIsAssignModalOpen(false);
      fetchUsers(currentPage); // Refresh the list

    } catch (err) {
      console.error('Error assigning config:', err);
      setAssignError(err.message);
      toast.error('Failed to assign configuration');
    } finally {
      setIsAssigning(false);
    }
  };

  // Load initial data
  React.useEffect(() => {
    fetchUsers(currentPage);
  }, [fetchUsers, currentPage]);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button 
            onClick={() => fetchUsers(currentPage)}
            className="mt-2 text-sm text-red-700 dark:text-red-300 hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Onboarding</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Properties</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contacts</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">AI Agent</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
                        <p className="text-xs text-gray-500">{user.name || 'No name set'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.onboarding_completed
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {user.onboarding_completed ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.property_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.contact_count}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.has_ai_agent
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {user.has_ai_agent ? 'Configured' : 'Not Configured'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => openAssignModal(user)}
                      >
                        Assign Config
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {totalUsers} user{totalUsers !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * itemsPerPage >= totalUsers}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign AI Agent Config to ${selectedUserForAssignment?.email}`}
      >
        <div className="space-y-4">
          {isLoadingSources ? (
            <p className="text-center text-gray-500">Loading configurations...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source Configuration
                </label>
                <select
                  value={selectedSourceConfigId}
                  onChange={(e) => setSelectedSourceConfigId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select a configuration</option>
                  {availableAgentConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.agent_name} ({config.user?.email})
                    </option>
                  ))}
                </select>
              </div>

              {assignError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {assignError}
                </p>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isAssigning}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAssignment}
                  disabled={!selectedSourceConfigId || isAssigning}
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}