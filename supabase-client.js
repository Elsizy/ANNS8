// supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://jqjeqqiwwbtowscozmbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxamVxcWl3d2J0b3dzY296bWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQ0NTIsImV4cCI6MjA3MDgyMDQ1Mn0.lWOS06WZZRkc2aCYEx3JoEo64IdMpevoU9buZKNzeYk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // útil se usar links mágicos
  },
});
