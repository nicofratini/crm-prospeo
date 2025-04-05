import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';

function TestInvokeButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTestInvoke = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    console.log('[TestInvokeButton] Attempting to invoke Edge Function: hello-world');
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('hello-world');

      if (invokeError) {
        console.error('[TestInvokeButton] Invoke error:', invokeError);
        throw invokeError;
      }

      console.log('[TestInvokeButton] Response from hello-world:', data);
      setResult(data);

    } catch (err) {
      console.error('[TestInvokeButton] Error invoking hello-world:', err);
      setError(err.message || 'Failed to invoke hello function');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Test Edge Function
        </h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={handleTestInvoke}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Invoke "hello-world" Function'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400">Error: {error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-gray-50 dark:bg-dark-hover rounded-lg">
              <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TestInvokeButton;