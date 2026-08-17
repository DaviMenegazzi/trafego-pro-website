export const MAX_SOCIAL_MEDIA_BYTES = 50 * 1024 * 1024;

const MIME_TYPES = {
  "image/jpeg": { extension: "jpg", mediaType: "image" as const },
  "image/png": { extension: "png", mediaType: "image" as const },
  "image/webp": { extension: "webp", mediaType: "image" as const },
  "video/mp4": { extension: "mp4", mediaType: "video" as const },
  "video/quicktime": { extension: "mov", mediaType: "video" as const },
};

export function validateSocialMediaUpload(file: { mimetype: string; size: number } | undefined): { extension: string; mediaType: "image" | "video" } | string {
  if (!file) return "Selecione um arquivo de imagem ou vídeo";
  if (file.size <= 0) return "O arquivo selecionado está vazio";
  if (file.size > MAX_SOCIAL_MEDIA_BYTES) return "O arquivo deve ter no máximo 50 MB";
  return MIME_TYPES[file.mimetype as keyof typeof MIME_TYPES] ?? "Formato não aceito. Use JPG, PNG, WebP, MP4 ou MOV";
}
