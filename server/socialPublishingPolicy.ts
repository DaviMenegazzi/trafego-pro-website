export const SOCIAL_CONTENT_FORMATS = ["image", "carousel", "video", "reel"] as const;
export type SocialContentFormat = (typeof SOCIAL_CONTENT_FORMATS)[number];

export type SocialPostMediaInput = {
  url: string;
  mediaType: "image" | "video";
  altText?: string;
};

export type SocialPostDraftInput = {
  title: string;
  caption: string;
  linkUrl?: string;
  contentFormat: SocialContentFormat;
  targetFacebook: boolean;
  targetInstagram: boolean;
  scheduledFor?: string;
  media: SocialPostMediaInput[];
};

export function validateSocialPostDraft(input: SocialPostDraftInput): string | null {
  if (!input.title.trim() || input.title.trim().length > 255) return "Informe um título de até 255 caracteres";
  if (!input.caption.trim()) return "A legenda é obrigatória";
  if (!input.targetFacebook && !input.targetInstagram) return "Selecione ao menos um canal de publicação";
  if (!SOCIAL_CONTENT_FORMATS.includes(input.contentFormat)) return "Formato de conteúdo inválido";
  if (!input.media.length) return "Adicione ao menos uma mídia com URL pública";
  if (input.media.some((media) => !/^https:\/\//i.test(media.url))) return "As mídias precisam usar URLs HTTPS públicas";
  if (input.contentFormat === "image" && (input.media.length !== 1 || input.media[0]?.mediaType !== "image")) return "Post de imagem exige uma única imagem";
  if ((input.contentFormat === "video" || input.contentFormat === "reel") && (input.media.length !== 1 || input.media[0]?.mediaType !== "video")) return "Vídeo e Reel exigem um único vídeo";
  if (input.contentFormat === "carousel") {
    if (input.media.length < 2 || input.media.length > 10) return "Carrossel exige entre duas e dez mídias";
  }
  if (input.scheduledFor) {
    const date = new Date(input.scheduledFor);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return "O agendamento precisa estar no futuro";
  }
  return null;
}

export function socialPostStatusForConnection(connectionId: string | null, wantsSchedule: boolean): "draft" | "scheduled" | "waiting_connection" {
  if (!wantsSchedule) return "draft";
  return connectionId ? "scheduled" : "waiting_connection";
}
