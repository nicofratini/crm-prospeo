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
    let initialAuthStateProcessed = false;

    // Handle initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      
      if (initialSession) {
        console.log('[useAuth] Initial session found:', initialSession.user.email);
        setSession(initialSession);
        setUser(initialSession.user);
        setIsAdmin(initialSession.user.user_metadata?.is_admin === true);
        
        // If we have a valid session and we're on an auth page, redirect to dashboard
        if (window.location.pathname.startsWith('/auth/')) {
          console.log('[useAuth] Valid session detected on auth page, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        }
      } else {
        console.log('[useAuth] No initial session found');
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }
      
      setLoadingAuth(false);
      initialAuthStateProcessed = true;
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        console.log(`[useAuth Debug] Auth state change event: ${event}`, {
          session: currentSession ? 'present' : 'null',
          userEmail: currentSession?.user?.email,
          pathname: window.location.pathname
        });

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || !currentSession) {
          console.log('[useAuth Debug] SIGNED_OUT/null session detected. Clearing state.');
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          navigate('/auth/login', { replace: true });
          return;
        }

        if (event === 'SIGNED_IN') {
          console.log('[useAuth Debug] SIGNED_IN event detected');
          setSession(currentSession);
          const currentUser = currentSession.user;
          setUser(currentUser);
          const adminFlag = currentUser.user_metadata?.is_admin === true;
          console.log('[useAuth Debug] User metadata:', {
            email: currentUser.email,
            isAdmin: adminFlag,
            metadata: currentUser.user_metadata
          });
          setIsAdmin(adminFlag);
          setErrorAuth(null);

          // Redirect to dashboard on successful sign in
          if (window.location.pathname.startsWith('/auth/')) {
            console.log('[useAuth Debug] Redirecting to dashboard after successful sign in');
            navigate('/dashboard', { replace: true });
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('[useAuth Debug] Token refreshed for session');
          setSession(currentSession);
        }

        // Handle initial loading flag if not already processed
        if (loadingAuth && !initialAuthStateProcessed) {
          console.log('[useAuth Debug] Setting loadingAuth = FALSE');
          setLoadingAuth(false);
          initialAuthStateProcessed = true;
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
    if (actionLoading) {
      console.log('[useAuth Debug] Login already in progress, skipping');
      return false;
    }

    setActionLoading(true);
    setErrorAuth(null);
    console.log('[useAuth Debug] Attempting login for:', email);

    try {
      console.log('[useAuth Debug] Calling signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('[useAuth Debug] Sign in response:', {
        success: !!data.session,
        error: error?.message || null,
        user: data.user?.email
      });

      if (error) throw error;

      console.log('[useAuth Debug] Login successful, session established');
      toast.success('Connexion réussie !');
      
      // The onAuthStateChange listener will handle state updates and navigation
      return true;

    } catch (err) {
      console.error('[useAuth Debug] Login error:', err);
      
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
      console.log('[useAuth Debug] Resetting action loading state');
      setActionLoading(false);
    }
  }, [actionLoading]);

  const register = useCallback(async ({ email, password }) => {
    setActionLoading(true);
    setErrorAuth(null);
    console.log('[useAuth Debug] Attempting registration for:', email);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      console.log('[useAuth Debug] Registration successful');
      toast.success('Inscription réussie ! Vérifiez vos emails pour confirmer votre compte.');
      navigate('/auth/login');
      return true;

    } catch (err) {
      console.error('[useAuth Debug] Registration error:', err);
      setErrorAuth(err.message);
      toast.error(err.message);
      return false;

    } finally {
      setActionLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    if (actionLoading) return;
    
    setActionLoading(true);
    setErrorAuth(null);
    console.log('[useAuth Debug] Calling supabase.auth.signOut()...');

    try {
      const { error } = await supabase.auth.signOut();

      // Log potential errors but don't treat them as critical failures
      if (error) {
        console.warn('[useAuth Debug] Non-critical signOut error:', error);
      } else {
        console.log('[useAuth Debug] signOut API call successful');
      }

      toast.success('Déconnexion réussie.');

    } catch (err) {
      console.error('[useAuth Debug] Unexpected error during signOut:', err);
      toast.error('Erreur lors de la déconnexion.');
    } finally {
      setActionLoading(false);
      console.log('[useAuth Debug] Logout action finished.');
      
      // Fallback Navigation: Ensure user lands on login page
      if (window.location.pathname !== '/auth/login' && !window.location.pathname.startsWith('/auth/')) {
        console.log('[useAuth Debug] Forcing navigation to /auth/login in finally block.');
        navigate('/auth/login', { replace: true });
      }
    }
  }, [navigate, actionLoading]);

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