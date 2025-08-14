// supabase-upload.js (robusto e com melhor diagnóstico)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/esm/index.js";

// >>> Troque pelos seus valores, se necessário:
const SUPABASE_URL = "https://tzmfnygovtkipmyavzdl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6bWZueWdvdnRraXBteWF2emRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MTU0MjcsImV4cCI6MjA2OTE5MTQyN30.c-l8MVFPVpoKKoaciR3FDnxuHztqxbqYH_qOvsvvQ5M";

// Sem sessão do Supabase Auth; usamos apenas Storage com anon key
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { "x-client-info": "sf-pay/1.0" } }
});

function sanitize(name) {
  return (name || "").replace(/[^\w.\-]+/g, "_");
}

/**
 * Faz upload no bucket "comprovativo" e retorna a URL pública.
 * Lança erro com mensagem clara se falhar.
 */
export async function uploadProof(file, userId) {
  if (!file) throw new Error("Arquivo inválido.");
  const key = `${userId}/${Date.now()}_${sanitize(file.name)}`;

  // Conteúdo correto ajuda CORS/proxies
  const opts = {
    upsert: false,
    contentType: file.type || "application/octet-stream",
    cacheControl: "3600"
  };

  // Upload
  const { data, error } = await supabase.storage
    .from("comprovativo")
    .upload(key, file, opts);

  if (error) {
    console.error("[supabase-upload] upload error:", error);
    throw new Error(error.message || "Falha ao subir comprovativo (upload).");
  }

  // URL pública (requer bucket público; se for privado, use signed URL)
  const { data: pub } = supabase.storage.from("comprovativo").getPublicUrl(key);
  if (!pub?.publicUrl) {
    throw new Error("URL pública não disponível. Verifique se o bucket é público.");
  }
  return pub.publicUrl;
}
