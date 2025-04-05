import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

export default function AiAgentsAdminPage() {
  // State for agents list and pagination
  const [agents, setAgents] = useState([]);
  const [totalAgents, setTotalAgents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch agents data
  const fetchAgents = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: agentsData, error: fetchError, count } = await supabase
        .from('ai_agents')
        .select(`
          *,
          user:users (
            email
          )
        `, { count: 'exact' })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setAgents(agentsData || []);
      setTotalAgents(count || 0);
      setCurrentPage(page);

    } catch (err) {
      console.error('Error fetching AI agents:', err);
      setError(err.message);
      toast.error('Failed to load AI agent configurations');
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage]);

  // Load initial data
  React.useEffect(() => {
    fetchAgents(currentPage);
  }, [fetchAgents, currentPage]);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Loading AI agent configurations...</p>
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
            onClick={() => fetchAgents(currentPage)}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agent Configurations</h1>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Agent Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Voice ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">EL Agent ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Owner</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Updated</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {agent.agent_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-gray-500">
                        {agent.elevenlabs_voice_id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-gray-500">
                        {agent.elevenlabs_agent_id || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-500">
                        {agent.user?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-500">
                        {format(new Date(agent.updated_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          toast.success('Source selection coming soon!');
                        }}
                      >
                        Use as Source
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
              {totalAgents} configuration{totalAgents !== 1 ? 's' : ''}
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
                disabled={currentPage * itemsPerPage >= totalAgents}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}