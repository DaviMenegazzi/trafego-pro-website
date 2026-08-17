import crypto from "crypto";
import { listDueSocialPostsSql, markFacebookNativeScheduleSql, recordSocialPublicationAttemptSql, updateSocialPostPublicationSql, type DueSocialPost } from "./socialPublishingSql.js";
import { canUseNativeFacebookSchedule } from "./socialHybridPolicy.js";

const META_VERSION = "v26.0";
const GRAPH_URL = `https://graph.facebook.com/${META_VERSION}`;

export type MetaOAuthConfig = { appId: string; appSecret: string; redirectUri: string; businessLoginConfigId: string };
export type MetaPageCandidate = { facebookPageId: string; facebookPageName: string; instagramAccountId: string | null; instagramUsername: string | null; pageAccessToken: string };
export const DEFAULT_SOCIAL_META_REDIRECT_URI = "https://www.trafego.pro/api/social/meta/callback";

function requiredSecret(): string {
  const secret = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 24) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY não configurada");
  return secret;
}

function key(): Buffer { return crypto.createHash("sha256").update(requiredSecret()).digest(); }

export function isMetaOAuthConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.SOCIAL_TOKEN_ENCRYPTION_KEY && process.env.META_BUSINESS_LOGIN_CONFIG_ID);
}

export function getSocialMetaRedirectUri(): string {
  const redirectUri = process.env.SOCIAL_META_REDIRECT_URI || DEFAULT_SOCIAL_META_REDIRECT_URI;
  let parsed: URL;
  try { parsed = new URL(redirectUri); } catch { throw new Error("SOCIAL_META_REDIRECT_URI inválida"); }
  if (parsed.protocol !== "https:" || parsed.pathname !== "/api/social/meta/callback" || parsed.search || parsed.hash) {
    throw new Error("SOCIAL_META_REDIRECT_URI deve usar HTTPS e terminar em /api/social/meta/callback");
  }
  return parsed.toString().replace(/\/$/, "");
}

export function getMetaOAuthConfig(): MetaOAuthConfig {
  if (!isMetaOAuthConfigured()) throw new Error("A aplicação Meta ainda não foi configurada");
  const businessLoginConfigId = process.env.META_BUSINESS_LOGIN_CONFIG_ID!;
  if (!/^\d+$/.test(businessLoginConfigId)) throw new Error("META_BUSINESS_LOGIN_CONFIG_ID inválida");
  return { appId: process.env.META_APP_ID!, appSecret: process.env.META_APP_SECRET!, redirectUri: getSocialMetaRedirectUri(), businessLoginConfigId };
}

export function encryptSocialSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSocialSecret(value: string): string {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Segredo social criptografado inválido");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export function createMetaOAuthState(ownerUserId: string): string {
  const payload = Buffer.from(JSON.stringify({ ownerUserId, issuedAt: Date.now(), nonce: crypto.randomUUID() })).toString("base64url");
  const signature = crypto.createHmac("sha256", requiredSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyMetaOAuthState(state: string): { ownerUserId: string } | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", requiredSecret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { ownerUserId?: string; issuedAt?: number };
    if (!parsed.ownerUserId || !parsed.issuedAt || Date.now() - parsed.issuedAt > 15 * 60 * 1000) return null;
    return { ownerUserId: parsed.ownerUserId };
  } catch { return null; }
}

export function createMetaAuthorizationUrl(config: MetaOAuthConfig, state: string): string {
  const params = new URLSearchParams({ client_id: config.appId, redirect_uri: config.redirectUri, state, response_type: "code", config_id: config.businessLoginConfigId, override_default_response_type: "true" });
  return `https://www.facebook.com/${META_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphJson<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<T> {
  const url = new URL(`${GRAPH_URL}/${path.replace(/^\//, "")}`);
  if (method === "GET") Object.entries(params).forEach(([keyName, value]) => url.searchParams.set(keyName, value));
  const response = await fetch(url, method === "GET" ? undefined : { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  const data = await response.json().catch(() => ({})) as T & { error?: { code?: number; message?: string } };
  if (!response.ok || data.error) throw new Error(data.error?.message || "A Meta recusou a solicitação de publicação");
  return data;
}

export async function exchangeMetaAuthorizationCode(config: MetaOAuthConfig, code: string): Promise<string> {
  const response = await fetch(`${GRAPH_URL}/oauth/access_token?${new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code })}`);
  const data = await response.json().catch(() => ({})) as { access_token?: string; error?: { message?: string } };
  if (!response.ok || !data.access_token) throw new Error(data.error?.message || "Não foi possível concluir a autorização Meta");
  return data.access_token;
}

export async function listMetaPageCandidates(userAccessToken: string): Promise<MetaPageCandidate[]> {
  const data = await graphJson<{ data?: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }> }>("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", access_token: userAccessToken }, "GET");
  return (data.data ?? []).filter((page) => Boolean(page.access_token)).map((page) => ({ facebookPageId: page.id, facebookPageName: page.name, instagramAccountId: page.instagram_business_account?.id ?? null, instagramUsername: page.instagram_business_account?.username ?? null, pageAccessToken: page.access_token }));
}

async function publishFacebook(post: DueSocialPost, token: string): Promise<string> {
  const media = post.media;
  if (post.contentFormat === "image") {
    const result = await graphJson<{ post_id?: string; id?: string }>(`${post.facebookPageId}/photos`, { url: media[0]!.url, caption: post.caption, access_token: token });
    return result.post_id || result.id || "facebook-photo-published";
  }
  if (post.contentFormat === "video") {
    const result = await graphJson<{ id?: string }>(`${post.facebookPageId}/videos`, { file_url: media[0]!.url, title: post.title, description: post.caption, access_token: token });
    return result.id || "facebook-video-published";
  }
  if (post.contentFormat === "reel") {
    const start = await graphJson<{ video_id?: string; upload_url?: string }>(`${post.facebookPageId}/video_reels`, { upload_phase: "start", access_token: token });
    if (!start.video_id || !start.upload_url) throw new Error("A Meta não retornou uma sessão de upload para o Reel do Facebook");
    const uploadResponse = await fetch(start.upload_url, { method: "POST", headers: { Authorization: `OAuth ${token}` }, body: new URLSearchParams({ file_url: media[0]!.url }) });
    if (!uploadResponse.ok) throw new Error("Falha ao enviar o vídeo do Reel para o Facebook");
    await graphJson(`${post.facebookPageId}/video_reels`, { upload_phase: "finish", video_id: start.video_id, video_state: "PUBLISHED", description: post.caption, access_token: token });
    return start.video_id;
  }
  if (post.media.some((media) => media.mediaType !== "image")) throw new Error("O carrossel do Facebook aceita apenas imagens; publique o vídeo no Instagram ou separe a publicação");
  const uploadedPhotoIds = await Promise.all(post.media.map(async (media) => {
    const uploaded = await graphJson<{ id?: string }>(`${post.facebookPageId}/photos`, { url: media.url, published: "false", access_token: token });
    if (!uploaded.id) throw new Error("A Meta não retornou uma foto temporária para o carrossel do Facebook");
    return uploaded.id;
  }));
  const attachments: Record<string, string> = {};
  uploadedPhotoIds.forEach((photoId, index) => { attachments[`attached_media[${index}]`] = JSON.stringify({ media_fbid: photoId }); });
  const carousel = await graphJson<{ id?: string }>(`${post.facebookPageId}/feed`, { message: post.caption, access_token: token, ...attachments });
  return carousel.id || "facebook-carousel-published";
}

export async function scheduleFacebookForPost(post: DueSocialPost): Promise<void> {
  try {
    if (!canUseNativeFacebookSchedule(post.scheduledFor, post.contentFormat)) throw new Error("Formato ou data fora da janela nativa do Facebook");
    if (post.contentFormat !== "image" && post.contentFormat !== "carousel") throw new Error("Agendamento nativo disponível para imagem e carrossel do Facebook");
    const token = decryptSocialSecret(post.accessTokenEncrypted);
    const ids = await Promise.all(post.media.map(async (media) => {
      if (media.mediaType !== "image") throw new Error("O agendamento nativo requer imagens");
      const item = await graphJson<{ id?: string }>(`${post.facebookPageId}/photos`, { url: media.url, published: "false", access_token: token });
      if (!item.id) throw new Error("Foto temporária não retornada pela Meta");
      return item.id;
    }));
    const attachments: Record<string, string> = {};
    ids.forEach((id, index) => { attachments[`attached_media[${index}]`] = JSON.stringify({ media_fbid: id }); });
    const result = await graphJson<{ id?: string }>(`${post.facebookPageId}/feed`, { message: post.caption, published: "false", scheduled_publish_time: post.scheduledFor!, access_token: token, ...attachments });
    if (!result.id) throw new Error("Agendamento nativo não retornou identificador");
    await markFacebookNativeScheduleSql({ id: post.id, status: "scheduled", facebookPostId: result.id });
    await recordSocialPublicationAttemptSql({ postId: post.id, channel: "facebook", action: "scheduled", providerPostId: result.id, safeMessage: "Agendamento nativo criado" });
  } catch (error) {
    const message = safeMessage(error);
    await markFacebookNativeScheduleSql({ id: post.id, status: "failed", error: message });
    await recordSocialPublicationAttemptSql({ postId: post.id, channel: "facebook", action: "failed", safeMessage: message });
  }
}

async function createInstagramContainer(post: DueSocialPost, token: string): Promise<string> {
  if (!post.instagramAccountId) throw new Error("A conta conectada não possui Instagram profissional associado");
  const createOne = async (media: DueSocialPost["media"][number], carouselItem = false) => graphJson<{ id?: string }>(`${post.instagramAccountId}/media`, { ...(media.mediaType === "video" ? { video_url: media.url, media_type: post.contentFormat === "reel" ? "REELS" : "VIDEO" } : { image_url: media.url }), ...(carouselItem ? { is_carousel_item: "true" } : {}), access_token: token });
  if (post.contentFormat === "carousel") {
    const children = await Promise.all(post.media.map(async (media) => {
      const result = await createOne(media, true);
      if (!result.id) throw new Error("A Meta não retornou o item do carrossel");
      return result.id;
    }));
    const carousel = await graphJson<{ id?: string }>(`${post.instagramAccountId}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: post.caption, access_token: token });
    if (!carousel.id) throw new Error("A Meta não retornou o contêiner do carrossel");
    return carousel.id;
  }
  const container = await createOne(post.media[0]!);
  if (!container.id) throw new Error("A Meta não retornou o contêiner do Instagram");
  return container.id;
}

async function publishInstagram(post: DueSocialPost, token: string): Promise<string> {
  if (!post.instagramAccountId) throw new Error("A conta conectada não possui Instagram profissional associado");
  const containerId = await createInstagramContainer(post, token);
  const result = await graphJson<{ id?: string }>(`${post.instagramAccountId}/media_publish`, { creation_id: containerId, access_token: token });
  if (!result.id) throw new Error("A Meta não retornou a mídia publicada do Instagram");
  return result.id;
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Falha desconhecida na publicação";
  return message.slice(0, 900).replace(/access_token=[^\s&]+/gi, "access_token=[redigido]");
}

export async function runScheduledSocialPublishing(): Promise<{ processed: number; published: number; failed: number }> {
  if (!isMetaOAuthConfigured()) return { processed: 0, published: 0, failed: 0 };
  const duePosts = await listDueSocialPostsSql();
  let published = 0;
  let failed = 0;
  for (const post of duePosts) {
    await updateSocialPostPublicationSql({ id: post.id, status: "publishing" });
    const token = decryptSocialSecret(post.accessTokenEncrypted);
    let facebookPostId: string | null = null;
    let instagramMediaId: string | null = null;
    const errors: string[] = [];
    if (post.targetFacebook) {
      try { facebookPostId = await publishFacebook(post, token); await recordSocialPublicationAttemptSql({ postId: post.id, channel: "facebook", action: "published", providerPostId: facebookPostId, safeMessage: "Publicação concluída" }); }
      catch (error) { const message = safeMessage(error); errors.push(message); await recordSocialPublicationAttemptSql({ postId: post.id, channel: "facebook", action: "failed", safeMessage: message }); }
    }
    if (post.targetInstagram) {
      try { instagramMediaId = await publishInstagram(post, token); await recordSocialPublicationAttemptSql({ postId: post.id, channel: "instagram", action: "published", providerPostId: instagramMediaId, safeMessage: "Publicação concluída" }); }
      catch (error) { const message = safeMessage(error); errors.push(message); await recordSocialPublicationAttemptSql({ postId: post.id, channel: "instagram", action: "failed", safeMessage: message }); }
    }
    const successCount = Number(Boolean(facebookPostId)) + Number(Boolean(instagramMediaId));
    const requested = Number(post.targetFacebook) + Number(post.targetInstagram);
    const status = successCount === requested ? "published" : successCount > 0 ? "partially_published" : "failed";
    await updateSocialPostPublicationSql({ id: post.id, status, facebookPostId, instagramMediaId, publishedAt: successCount ? new Date() : null });
    if (successCount) published += 1; else failed += 1;
    if (errors.length) console.warn(`[social] Publicação ${post.id} com falha: ${errors.join(" | ")}`);
  }
  return { processed: duePosts.length, published, failed };
}
