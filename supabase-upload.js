// supabase-upload.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://tzmfnygovtkipmyavzdl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6bWZueWdvdnRraXBteWF2emRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MTU0MjcsImV4cCI6MjA2OTE5MTQyN30.c-l8MVFPVpoKKoaciR3FDnxuHztqxbqYH_qOvsvvQ5M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Faz upload de arquivo no bucket "comprovativo" e retorna a URL pública.
 */
export async function uploadProof(file, userId) {
  const fileName = `${userId}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const { data, error } = await supabase.storage
    .from("comprovativo")
    .upload(fileName, file, { upsert: false });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from("comprovativo")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
