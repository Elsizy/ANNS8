// auth-guard.js
import { supabase } from './supabase-client.js';

export async function requireAuth(redirectTo = 'login.html') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session.user;
}

export function onAuth(callback) {
  // estado inicial
  supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user ?? null);
  });
  // subscrever alterações
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

export async function signOutAndGo(url = 'login.html') {
  await supabase.auth.signOut();
  window.location.href = url;
}
