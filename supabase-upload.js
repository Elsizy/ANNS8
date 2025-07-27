// supabase-upload.js
const SUPABASE_URL = "https://tzmfnygovtkipmyavzdl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6bWZueWdvdnRraXBteWF2emRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MTU0MjcsImV4cCI6MjA2OTE5MTQyN30.c-l8MVFPVpoKKoaciR3FDnxuHztqxbqYH_qOvsvvQ5M";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Faz upload do comprovativo e retorna a URL pública.
 * @param {File} file - Arquivo de imagem selecionado.
 * @param {string} userId - ID do usuário.
 * @returns {Promise<string>} - URL pública do arquivo.
 */
async function uploadComprovativo(file, userId) {
  try {
    const filePath = `${userId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabaseClient.storage
      .from("comprovativo")
      .upload(filePath, file);

    if (error) throw error;

    // Gerar URL pública
    const { data: publicUrl } = supabaseClient.storage
      .from("comprovativo")
      .getPublicUrl(filePath);

    return publicUrl.publicUrl;
  } catch (err) {
    console.error("Erro ao enviar comprovativo:", err.message);
    return null;
  }
}
