// supabase-client.js
// SDK no browser via ESM (sem bundler)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// IMPORTANTE: estas duas constantes podem ficar inline no client.
// Use SEMPRE a anon key (NUNCA a service_role no front-end).
const SUPABASE_URL = "https://jqjeqqiwwbtowscozmbw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxamVxcWl3d2J0b3dzY296bWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQ0NTIsImV4cCI6MjA3MDgyMDQ1Mn0.lWOS06WZZRkc2aCYEx3JoEo64IdMpevoU9buZKNzeYk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* -------- Helpers de Auth (opcionais) -------- */

// Obtém o usuário atual (ou null)
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

// Exige sessão; se não houver, redireciona
export async function requireAuth(redirectTo = "login.html") {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

// Escuta mudanças de sessão e executa callbacks
export function onAuthChange({ onSignIn, onSignOut } = {}) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    if (session && typeof onSignIn === "function") onSignIn(session.user);
    if (!session && typeof onSignOut === "function") onSignOut();
  });
}
