import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorAuth, setErrorAuth] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[useAuth] Setting up auth state listener');
    setLoadingAuth(true);
    let mounted = true;

    // Handle initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      
      if (initialSession) {
        console.log('[useAuth] Initial session found:', initialSession.user.email);
        setSession(initialSession);
        setUser(initialSession.user);
        setIsAdmin(initialSession.user.user_metadata?.is_admin === true);
      } else {
        console.log('[useAuth] No initial session found');
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }
      
      setLoadingAuth(false);
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        console.log(`[useAuth] Auth state change: ${event}`, currentSession?.user?.email);

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          navigate('/auth/login', { replace: true });
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('[useAuth] Session token refreshed');
        }

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAdmin(currentSession.user.user_metadata?.is_admin === true);
          setErrorAuth(null);
        }
      }
    );

    return () => {
      console.log('[useAuth] Cleaning up auth state listener');
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const login = useCallback(async ({ email, password }) => {
    setActionLoading(true);
    setErrorAuth(null);
    console.log('[useAuth] Attempting login...');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      console.log('[useAuth] Login successful');
      toast.success('Connexion réussie !');
      return true;

    } catch (err) {
      console.error('[useAuth] Login error:', err);
      
      let message = err.message;
      if (message === 'Email not confirmed') {
        message = 'Veuillez confirmer votre email avant de vous connecter.';
      } else if (message === 'Invalid login credentials') {
        message = 'Email ou mot de passe invalide.';
      }

      setErrorAuth(message);
      toast.error(message);
      return false;

    } finally {
      setActionLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password }) => {
    setActionLoading(true);
    setErrorAuth(null);
    console.log('[useAuth] Attempting registration...');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      console.log('[useAuth] Registration successful');
      toast.success('Inscription réussie ! Vérifiez vos emails pour confirmer votre compte.');
      navigate('/auth/login');
      return true;

    } catch (err) {
      console.error('[useAuth] Registration error:', err);
      setErrorAuth(err.message);
      toast.error(err.message);
      return false;

    } finally {
      setActionLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    setActionLoading(true);
    setErrorAuth(null);
    console.log('[useAuth] Logging out...');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log('[useAuth] Logout successful');
      toast.success('Déconnexion réussie.');

      // Clear auth state
      setSession(null);
      setUser(null);
      setIsAdmin(false);

      // Navigate to login
      navigate('/auth/login', { replace: true });

    } catch (err) {
      console.error('[useAuth] Logout error:', err);
      setErrorAuth(err.message);
      toast.error('Erreur lors de la déconnexion.');

      // Clear auth state even on error
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      navigate('/auth/login', { replace: true });

    } finally {
      setActionLoading(false);
    }
  }, [navigate]);

  const authValue = useMemo(() => ({
    user,
    session,
    isAdmin,
    loading: loadingAuth,
    actionLoading,
    error: errorAuth,
    login,
    register,
    logout
  }), [
    user,
    session,
    isAdmin,
    loadingAuth,
    actionLoading,
    errorAuth,
    login,
    register,
    logout
  ]);

  return authValue;
}