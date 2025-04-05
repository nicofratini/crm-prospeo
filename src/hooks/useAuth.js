import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[useAuth] Setting up auth listeners...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[useAuth] Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check admin status if user is logged in
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] Auth state change:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check admin status if user is logged in
      if (session?.user) {
        await checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId) => {
    try {
      if (!userId) {
        console.warn('[useAuth] No user ID provided for admin check');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('[useAuth] Checking admin status for user:', userId);

      // First check if the user exists in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          // User not found in users table, they need to complete registration
          console.log('[useAuth] User not found in users table, waiting for registration completion');
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        throw userError;
      }

      // Now check admin status
      const { data: adminData, error: adminError } = await supabase
        .rpc('is_admin', { user_id: userId });

      if (adminError) {
        console.error('[useAuth] Error checking admin status:', adminError);
        setIsAdmin(false);
      } else {
        const adminStatus = Boolean(adminData);
        console.log('[useAuth] Admin status result:', adminStatus);
        setIsAdmin(adminStatus);
      }

    } catch (err) {
      console.error('[useAuth] Error in checkAdminStatus:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    try {
      setError(null);
      setLoading(true);

      console.log('[useAuth] Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[useAuth] Login error:', error);
        switch (error.message) {
          case 'Email not confirmed':
            toast.error(
              'Please confirm your email address before logging in. Check your inbox for the confirmation email.',
              { duration: 6000 }
            );
            break;
          case 'Invalid login credentials':
            toast.error(
              'Invalid email or password. Please check your credentials and try again.',
              { duration: 4000 }
            );
            break;
          default:
            toast.error(error.message);
        }
        throw error;
      }

      console.log('[useAuth] Login successful:', data.user?.email);
      toast.success('Logged in successfully');
      navigate('/dashboard');
      return true;

    } catch (err) {
      console.error('[useAuth] Login error:', err);
      setError(err.message);
      return false;

    } finally {
      setLoading(false);
    }
  };

  const register = async ({ email, password }) => {
    try {
      setError(null);
      setLoading(true);

      console.log('[useAuth] Attempting registration for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      console.log('[useAuth] Registration successful:', data.user?.email);
      toast.success('Registration successful! Please check your email to confirm your account.');
      navigate('/auth/login');
      return true;

    } catch (err) {
      console.error('[useAuth] Registration error:', err);
      setError(err.message);
      toast.error(err.message);
      return false;

    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      console.log('[useAuth] Logging out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success('Logged out successfully');
      navigate('/auth/login');

    } catch (err) {
      console.error('[useAuth] Logout error:', err);
      setError(err.message);
      toast.error(err.message);
    }
  };

  return {
    user,
    session,
    loading,
    error,
    isAdmin,
    login,
    register,
    logout
  };
}