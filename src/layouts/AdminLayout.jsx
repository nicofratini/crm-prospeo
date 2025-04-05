import React from 'react';
import { Outlet, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function AdminLayout() {
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          setLoading(false);
          return;
        }

        // Get user details including admin status
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        if (userError) throw userError;

        setUser(session.user);
        setIsAdmin(userData?.is_admin || false);

      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-white dark:bg-dark-card border-r border-gray-100 dark:border-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Admin Panel
          </h2>
        </div>
        <nav className="p-4 space-y-1">
          <Link
            to="/admin/users"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176Z" />
            </svg>
            Users
          </Link>
          <Link
            to="/admin/ai-agents"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M168,128a8,8,0,1,1-8-8A8,8,0,0,1,168,128ZM96,120a8,8,0,1,0,8,8A8,8,0,0,0,96,120Zm128,8c0,39.7-35.89,72-80,72s-80-32.3-80-72c0-26.26,15.93-49.48,40-62.59V56a24,24,0,0,1,24-24h32a24,24,0,0,1,24,24v9.41C208.07,78.52,224,101.74,224,128ZM160,56a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8V74.25a115.46,115.46,0,0,1,32-4.25,115.46,115.46,0,0,1,32,4.25Zm48,72c0-30.88-30.06-56-64-56S80,97.12,80,128s30.06,56,64,56S208,158.88,208,128Z" />
            </svg>
            AI Agents
          </Link>
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M224,115.55V208a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V168a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v40a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V115.55a16,16,0,0,1,5.17-11.78l80-75.48.11-.11a16,16,0,0,1,21.53,0,1.14,1.14,0,0,0,.11.11l80,75.48A16,16,0,0,1,224,115.55Z" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;