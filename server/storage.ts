import { getSiteSupabase } from "./siteSupabase.js";

// Mídias das publicações sociais: bucket público "social-media" no Supabase do site.
// Precisa ser público porque a Meta baixa a imagem/vídeo pela URL na hora de publicar.
const SOCIAL_MEDIA_BUCKET = "social-media";

export async function storagePut(relKey: string, data: Buffer | Uint8Array, contentType: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "").replace(/^social-media\//, "");
  const bucket = getSiteSupabase().storage.from(SOCIAL_MEDIA_BUCKET);
  const { error } = await bucket.upload(key, data, { contentType, upsert: false });
  if (error) throw new Error(`Não foi possível enviar a mídia ao armazenamento: ${error.message}`);
  return { key, url: bucket.getPublicUrl(key).data.publicUrl };
}
