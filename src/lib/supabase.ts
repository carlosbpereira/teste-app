import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy client — evita crash durante o build se as variáveis não estiverem definidas
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios."
    );
  }
  _supabase = createClient(url, key);
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export async function uploadProductImage(
  file: File,
  _fileName?: string
): Promise<string> {
  // 1. Tenta upload via endpoint autenticado do servidor
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        return data.url;
      }
    } else {
      console.warn(`/api/upload retornou ${res.status}, tentando upload direto via Supabase Storage...`);
    }
  } catch (apiErr) {
    console.warn("Falha na chamada /api/upload, tentando upload direto:", apiErr);
  }

  // 2. Fallback: upload direto pelo cliente Supabase (liberado via política RLS)
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = _fileName || `produto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`;
  const { data, error } = await supabase.storage
    .from("produtos")
    .upload(`${fileName}`, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("Erro ao fazer upload da imagem:", error.message);
    throw new Error(`Erro no Supabase Storage: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("produtos").getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteProductImage(path: string): Promise<void> {
  const fileName = path.split("/produtos/")[1];
  if (!fileName) return;
  await supabase.storage.from("produtos").remove([fileName]);
}
