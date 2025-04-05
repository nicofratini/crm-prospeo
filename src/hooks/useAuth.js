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
    console.log('[useAuth CLEAN] useEffect mounting. Setting loadingAuth = TRUE.');
    setLoadingAuth(true);
    let mounted = true;

    // Setup the listener FIRST. It will also fire with the initial state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!mounted) {
          console.log('[useAuth CLEAN] onAuthStateChange fired but unmounted.');
          return;
        }
        console.log(`[useAuth CLEAN] onAuthStateChange Event: ${_event}`, currentSession?.user?.email);

        // Update Session and User immediately
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);

        // Determine Admin Status DIRECTLY from METADATA
        let adminFlag = false;
        if (currentUser) {
          adminFlag = currentUser.user_metadata?.is_admin === true;
          console.log(`[useAuth CLEAN] Metadata Admin Check: ${adminFlag}. Metadata:`, currentUser.user_metadata);
        } else {
          console.log('[useAuth CLEAN] No user session, setting isAdmin=false.');
        }
        setIsAdmin(adminFlag);
        setErrorAuth(null);

        // Set loading false definitively HERE
        console.log('[useAuth CLEAN] Setting loadingAuth = FALSE.');
        setLoadingAuth(false);
      }
    );

    // Optional: Get initial session to potentially speed up first load
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[useAuth CLEAN] Optional: Initial getSession completed.', initialSession?.user?.email);
    }).catch(error => {
      console.error('[useAuth CLEAN] Optional: Error during initial getSession:', error);
    });

    return () => {
      console.log('[useAuth CLEAN] useEffect cleanup. Unsubscribing.');
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setActionLoading(true);
    setErrorAuth(null);
    console.log('[useAuth CLEAN] Attempting login...');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      console.log('[useAuth CLEAN] Login API call successful.');
      toast.success('Connexion réussie !');
      navigate('/dashboard');
      return true;

    } catch (err) {
      console.error('[useAuth CLEAN] Login error:', err);
      
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
  }, [navigate]);

  const register = useCallback(async ({ email, password }) => {
    setActionLoading(true);
    setErrorAuth(null);
    console.log('[useAuth CLEAN] Attempting registration...');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      console.log('[useAuth CLEAN] Registration API call successful.');
      toast.success('Inscription réussie ! Vérifiez vos emails pour confirmer votre compte.');
      navigate('/auth/login');
      return true;

    } catch (err) {
      console.error('[useAuth CLEAN] Registration error:', err);
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
    console.log('[useAuth CLEAN] Logging out...');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[useAuth CLEAN] Sign out error (ignored for state clear):', error);
      }

      console.log('[useAuth CLEAN] Logout API call finished.');
      toast.success('Déconnexion réussie.');

      // Clear state immediately for faster UI update
      setSession(null);
      setUser(null);
      setIsAdmin(false);

      // Force navigation if needed
      if (window.location.pathname !== '/auth/login') {
        navigate('/auth/login', { replace: true });
      }

    } catch (err) {
      console.error('[useAuth CLEAN] Unexpected logout error:', err);
      setErrorAuth(err.message);
      toast.error('Erreur lors de la déconnexion.');

      // Force state clear and navigation on error
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

  console.log(`[useAuth CLEAN] Hook returning value:`, {
    loadingAuth: authValue.loading,
    user: !!authValue.user,
    isAdmin: authValue.isAdmin
  });

  return authValue;
}