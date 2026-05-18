/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, createContext, useContext, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Schedules from './pages/Schedules';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import { supabase } from './lib/supabase';

// Auth Context
type User = { id: string; email?: string; username: string; role: 'admin' | 'receptionist' } | null;
interface AuthContextType {
  user: User;
  loadingAuth: boolean;
}

export const AuthContext = createContext<AuthContextType>({ user: null, loadingAuth: true });

export function useAuth() {
  return useContext(AuthContext);
}

export default function App() {
  const [user, setUser] = useState<User>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function provisionAdminIfneeded() {
      // Background provision of admin/123
      try {
        const { error: signUpError } = await supabase.auth.signUp({
          email: 'admin@hospital.com',
          password: '123456',
        });
        // We do not care if it fails (likely already registered)
        if (!signUpError) {
          // Note: signUp will just log them in if email auto-confirm is enabled,
          // but if it's already created, we get an error which we caught.
          // Wait for session and update profile if it was successfully created.
          const { data } = await supabase.auth.signInWithPassword({
            email: 'admin@hospital.com',
            password: '123456'
          });
          if (data?.user) {
            await supabase.from('profiles').insert([
               { id: data.user.id, username: 'admin', role: 'admin' }
            ]).select();
            await supabase.auth.signOut(); // sign out to not force login
          }
        }
      } catch (err) {}
    }

    provisionAdminIfneeded();

    async function fetchProfile(sessionUser: any) {
      if (!sessionUser) {
        if (mounted) {
          setUser(null);
          setLoadingAuth(false);
        }
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();
        
      if (data && mounted) {
        let actualRole = data.role;
        // Override role for the specific admin email if needed
        if (sessionUser.email === 'tadkeera@gmail.com') actualRole = 'admin';
        setUser({ id: sessionUser.id, email: sessionUser.email, username: data.username, role: actualRole });
      } else if (mounted) {
        // Fallback or unassigned roles. If it's the specific email, assume admin
        const fallbackRole = sessionUser.email === 'tadkeera@gmail.com' ? 'admin' : 'receptionist';
        const fallbackUsername = sessionUser.email === 'tadkeera@gmail.com' ? 'مدير النظام' : sessionUser.email;
        setUser({ id: sessionUser.id, email: sessionUser.email, username: fallbackUsername, role: fallbackRole });
      }
      if (mounted) setLoadingAuth(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p>جاري التحميل...</p></div>;
  }

  return (
    <AuthContext.Provider value={{ user, loadingAuth }}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="settings" element={user?.role === 'admin' ? <Settings /> : <Navigate to="/" />} />
          </Route>
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
