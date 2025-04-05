import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

function AgentCard({ agent, onSelect, isSelected }) {
  return (
    <div 
      className={`p-6 rounded-lg border transition-all ${
        isSelected 
          ? 'border-primary bg-primary/5 dark:bg-primary/10' 
          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {agent.agent_name}
          </h3>
          {agent.owner_email && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created by {agent.owner_email}
            </p>
          )}
        </div>
        <Button
          variant={isSelected ? "secondary" : "primary"}
          onClick={() => onSelect(agent)}
          disabled={isSelected}
        >
          {isSelected ? 'Selected' : 'Select Agent'}
        </Button>
      </div>

      {agent.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {agent.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {agent.is_shared && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Shared
          </span>
        )}
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Voice ID: {agent.elevenlabs_voice_id}
        </span>
      </div>
    </div>
  );
}

export function AiAgentPage() {
  const [sharedAgents, setSharedAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchSharedAgents();
  }, []);

  const fetchSharedAgents = async () => {
    try {
      // Get current session for auth header
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Not authenticated');

      console.log('[AiAgentPage] Fetching shared agents...');
      
      // Use Supabase query instead of REST API call
      const { data, error: fetchError } = await supabase
        .from('ai_agents')
        .select(`
          id,
          agent_name,
          description,
          elevenlabs_voice_id,
          is_shared,
          owner_user_id,
          users:user_assigned_agents(user_id)
        `)
        .eq('is_shared', true);

      if (fetchError) throw fetchError;

      const agentsWithAssignment = data.map(agent => ({
        ...agent,
        is_assigned: agent.users && agent.users.length > 0
      }));

      console.log('[AiAgentPage] Received shared agents:', agentsWithAssignment);
      
      setSharedAgents(agentsWithAssignment);
      setError(null);

    } catch (err) {
      console.error('Error fetching shared agents:', err);
      setError(err.message || 'Failed to load available agents');
      toast.error(err.message || 'Failed to load available agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAgent = async (agent) => {
    if (agent.is_assigned) return;

    setAssigning(true);
    try {
      const { error: insertError } = await supabase
        .from('user_assigned_agents')
        .insert([
          { 
            user_id: (await supabase.auth.getUser()).data.user.id,
            assigned_agent_id: agent.id
          }
        ]);

      if (insertError) throw insertError;

      toast.success('Agent assigned successfully');
      fetchSharedAgents(); // Refresh the list to update assignments

    } catch (err) {
      console.error('Error assigning agent:', err);
      toast.error(err.message || 'Failed to assign agent');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
            AI Agent Selection
          </h1>
        </div>
        
        <div className="p-4">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Available Agents
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select an AI agent configuration to handle your calls and messages.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading available agents...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                  <Button onClick={fetchSharedAgents}>Retry</Button>
                </div>
              ) : sharedAgents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No agents available. Please contact your administrator.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sharedAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onSelect={handleSelectAgent}
                      isSelected={agent.is_assigned}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}