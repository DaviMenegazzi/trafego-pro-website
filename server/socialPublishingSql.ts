import crypto from "crypto";
import type { SocialContentFormat, SocialPostMediaInput } from "./socialPublishingPolicy.js";
import { getSiteSupabase, unwrap } from "./siteSupabase.js";

export type SocialMetaConnection = {
  id: string;
  unitId: string;
  unitName: string;
  facebookPageId: string;
  facebookPageName: string;
  instagramAccountId: string | null;
  instagramUsername: string | null;
  connectionStatus: "active" | "expired" | "revoked" | "error";
  tokenExpiresAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
};

export type SocialPost = {
  id: string;
  clientBatchKey: string | null;
  unitId: string;
  unitName: string;
  socialConnectionId: string | null;
  title: string;
  caption: string;
  linkUrl: string | null;
  contentFormat: SocialContentFormat;
  targetFacebook: boolean;
  targetInstagram: boolean;
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  facebookPostId: string | null;
  instagramMediaId: string | null;
  createdAt: string;
  media: Array<{ id: string; url: string; mediaType: "image" | "video"; altText: string | null }>;
};

export type SocialPublishingSettings = { scheduleCronTaskUid: string | null; schedulerStatus: "inactive" | "active" | "paused" };

type ConnectionRow = {
  id: string; unit_id: string; unit_name: string; facebook_page_id: string; facebook_page_name: string;
  instagram_account_id: string | null; instagram_username: string | null; connection_status: SocialMetaConnection["connectionStatus"];
  token_expires_at: string | null; last_error_message: string | null; created_at: string;
};
type PostRow = {
  id: string; client_batch_key: string | null; unit_id: string; unit_name: string; social_connection_id: string | null; title: string; caption: string;
  link_url: string | null; content_format: SocialContentFormat; target_facebook: boolean; target_instagram: boolean; status: string;
  scheduled_for: string | null; published_at: string | null; facebook_post_id: string | null; instagram_media_id: string | null; created_at: string;
};
type MediaRow = { id: string; post_id: string; public_url: string; media_type: "image" | "video"; alt_text: string | null };
type ProcessingConnectionRow = { id: string; facebook_page_id: string; instagram_account_id: string | null; access_token_encrypted: string; connection_status: string };

const CONNECTION_COLUMNS = "id, unit_id, unit_name, facebook_page_id, facebook_page_name, instagram_account_id, instagram_username, connection_status, token_expires_at, last_error_message, created_at";
const POST_COLUMNS = "id, client_batch_key, unit_id, unit_name, social_connection_id, title, caption, link_url, content_format, target_facebook, target_instagram, status, scheduled_for, published_at, facebook_post_id, instagram_media_id, created_at";
const EDITABLE_STATUSES = ["draft", "scheduled", "waiting_connection", "failed"];

const db = () => getSiteSupabase();

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function mapConnection(row: ConnectionRow): SocialMetaConnection {
  return { id: row.id, unitId: row.unit_id, unitName: row.unit_name, facebookPageId: row.facebook_page_id, facebookPageName: row.facebook_page_name, instagramAccountId: row.instagram_account_id, instagramUsername: row.instagram_username, connectionStatus: row.connection_status, tokenExpiresAt: toIso(row.token_expires_at), lastErrorMessage: row.last_error_message, createdAt: toIso(row.created_at)! };
}

function mapPost(row: PostRow, media: MediaRow[]): SocialPost {
  return {
    id: row.id, clientBatchKey: row.client_batch_key, unitId: row.unit_id, unitName: row.unit_name, socialConnectionId: row.social_connection_id,
    title: row.title, caption: row.caption, linkUrl: row.link_url, contentFormat: row.content_format,
    targetFacebook: Boolean(row.target_facebook), targetInstagram: Boolean(row.target_instagram), status: row.status,
    scheduledFor: toIso(row.scheduled_for), publishedAt: toIso(row.published_at), facebookPostId: row.facebook_post_id,
    instagramMediaId: row.instagram_media_id, createdAt: toIso(row.created_at)!,
    media: media.filter((item) => item.post_id === row.id).map((item) => ({ id: item.id, url: item.public_url, mediaType: item.media_type, altText: item.alt_text })),
  };
}

async function listMedia(postIds: string[]): Promise<MediaRow[]> {
  if (!postIds.length) return [];
  return unwrap(await db().from("social_post_media").select("id, post_id, public_url, media_type, alt_text").in("post_id", postIds).order("sort_order")) as MediaRow[];
}

export async function listSocialMetaConnectionsSql(ownerUserId: string): Promise<SocialMetaConnection[]> {
  const rows = unwrap(await db().from("social_meta_connections").select(CONNECTION_COLUMNS).eq("owner_user_id", ownerUserId).order("created_at", { ascending: false }));
  return (rows as ConnectionRow[]).map(mapConnection);
}

export async function listSocialPostsSql(ownerUserId: string): Promise<SocialPost[]> {
  const posts = unwrap(await db().from("social_posts").select(POST_COLUMNS).eq("owner_user_id", ownerUserId).limit(1000)) as PostRow[];
  // Mesma ordem de antes: COALESCE(scheduled_for, created_at) ASC, até 200 itens.
  const sortKey = (post: PostRow) => new Date(post.scheduled_for ?? post.created_at).getTime();
  const selected = posts.sort((a, b) => sortKey(a) - sortKey(b)).slice(0, 200);
  const media = await listMedia(selected.map((post) => post.id));
  return selected.map((post) => mapPost(post, media));
}

async function getSocialPostByIdSql(ownerUserId: string, id: string): Promise<SocialPost | null> {
  const post = unwrap(await db().from("social_posts").select(POST_COLUMNS).eq("owner_user_id", ownerUserId).eq("id", id).maybeSingle()) as PostRow | null;
  if (!post) return null;
  return mapPost(post, await listMedia([id]));
}

export async function createSocialPostSql(input: {
  ownerUserId: string; clientBatchKey?: string | null; unitId: string; unitName: string; socialConnectionId: string | null; title: string; caption: string; linkUrl: string | null;
  contentFormat: SocialContentFormat; targetFacebook: boolean; targetInstagram: boolean; status: string; scheduledFor: string | null; media: SocialPostMediaInput[];
}): Promise<SocialPost> {
  if (input.clientBatchKey) {
    const existing = unwrap(await db().from("social_posts").select("id").eq("owner_user_id", input.ownerUserId).eq("client_batch_key", input.clientBatchKey).maybeSingle()) as { id: string } | null;
    if (existing?.id) {
      const post = await getSocialPostByIdSql(input.ownerUserId, existing.id);
      if (post) return post;
    }
  }
  const id = crypto.randomUUID();
  // Post + mídias numa transação só (função create_social_post_with_media no Supabase).
  unwrap(await db().rpc("create_social_post_with_media", {
    p_post: {
      id, client_batch_key: input.clientBatchKey ?? null, owner_user_id: input.ownerUserId, unit_id: input.unitId, unit_name: input.unitName,
      social_connection_id: input.socialConnectionId, title: input.title, caption: input.caption, link_url: input.linkUrl,
      content_format: input.contentFormat, target_facebook: input.targetFacebook, target_instagram: input.targetInstagram, status: input.status,
      scheduled_for: input.scheduledFor ? new Date(input.scheduledFor).toISOString() : null,
    },
    p_media: input.media.map((media) => ({ url: media.url, media_type: media.mediaType, alt_text: media.altText?.trim() || null })),
  }));
  const post = await getSocialPostByIdSql(input.ownerUserId, id);
  if (!post) throw new Error("Publicação criada, mas não pôde ser lida");
  return post;
}

export async function getSocialPublishingSettingsSql(): Promise<SocialPublishingSettings> {
  const row = unwrap(await db().from("social_publishing_settings").select("schedule_cron_task_uid, scheduler_status").eq("id", 1).maybeSingle()) as { schedule_cron_task_uid: string | null; scheduler_status: SocialPublishingSettings["schedulerStatus"] } | null;
  return { scheduleCronTaskUid: row?.schedule_cron_task_uid ?? null, schedulerStatus: row?.scheduler_status ?? "inactive" };
}

export async function updateSocialPublishingSettingsSql(input: Partial<SocialPublishingSettings>): Promise<void> {
  const current = await getSocialPublishingSettingsSql();
  unwrap(await db().from("social_publishing_settings").upsert({ id: 1, schedule_cron_task_uid: input.scheduleCronTaskUid ?? current.scheduleCronTaskUid, scheduler_status: input.schedulerStatus ?? current.schedulerStatus, updated_at: new Date().toISOString() }));
}

export async function saveSocialOAuthSessionSql(input: { id: string; ownerUserId: string; candidatesEncrypted: string; expiresAt: Date }): Promise<void> {
  unwrap(await db().from("social_meta_oauth_sessions").insert({ id: input.id, owner_user_id: input.ownerUserId, candidates_encrypted: input.candidatesEncrypted, expires_at: input.expiresAt.toISOString() }));
}

export async function getSocialOAuthSessionSql(id: string, ownerUserId: string): Promise<{ candidatesEncrypted: string; expiresAt: string } | null> {
  const row = unwrap(await db().from("social_meta_oauth_sessions").select("candidates_encrypted, expires_at").eq("id", id).eq("owner_user_id", ownerUserId).gt("expires_at", new Date().toISOString()).maybeSingle()) as { candidates_encrypted: string; expires_at: string } | null;
  return row ? { candidatesEncrypted: row.candidates_encrypted, expiresAt: toIso(row.expires_at)! } : null;
}

export async function upsertSocialMetaConnectionSql(input: { id: string; ownerUserId: string; unitId: string; unitName: string; facebookPageId: string; facebookPageName: string; instagramAccountId: string | null; instagramUsername: string | null; accessTokenEncrypted: string; grantedScopes: string | null }): Promise<void> {
  unwrap(await db().from("social_meta_connections").upsert({
    id: input.id, owner_user_id: input.ownerUserId, unit_id: input.unitId, unit_name: input.unitName, facebook_page_id: input.facebookPageId,
    facebook_page_name: input.facebookPageName, instagram_account_id: input.instagramAccountId, instagram_username: input.instagramUsername,
    access_token_encrypted: input.accessTokenEncrypted, granted_scopes: input.grantedScopes, connection_status: "active",
    last_error_code: null, last_error_message: null, updated_at: new Date().toISOString(),
  }, { onConflict: "owner_user_id,facebook_page_id" }));
}

export type DueSocialPost = SocialPost & { facebookPageId: string; instagramAccountId: string | null; accessTokenEncrypted: string };

async function attachConnections(posts: PostRow[], onlyActive: boolean): Promise<DueSocialPost[]> {
  const connectionIds = Array.from(new Set(posts.map((post) => post.social_connection_id).filter((id): id is string => Boolean(id))));
  if (!connectionIds.length) return [];
  const connections = unwrap(await db().from("social_meta_connections").select("id, facebook_page_id, instagram_account_id, access_token_encrypted, connection_status").in("id", connectionIds)) as ProcessingConnectionRow[];
  const byId = new Map(connections.filter((item) => !onlyActive || item.connection_status === "active").map((item) => [item.id, item]));
  const joined = posts.filter((post) => post.social_connection_id && byId.has(post.social_connection_id));
  const media = await listMedia(joined.map((post) => post.id));
  return joined.map((post) => {
    const connection = byId.get(post.social_connection_id!)!;
    return { ...mapPost(post, media), facebookPageId: connection.facebook_page_id, instagramAccountId: connection.instagram_account_id, accessTokenEncrypted: connection.access_token_encrypted };
  });
}

export async function getSocialPostForProcessingSql(id: string): Promise<DueSocialPost | null> {
  const post = unwrap(await db().from("social_posts").select(POST_COLUMNS).eq("id", id).maybeSingle()) as PostRow | null;
  if (!post) return null;
  return (await attachConnections([post], false))[0] ?? null;
}

export async function markFacebookNativeScheduleSql(input: { id: string; status: "scheduled" | "failed"; facebookPostId?: string | null; error?: string | null }): Promise<void> {
  const patch: Record<string, unknown> = { facebook_schedule_status: input.status, facebook_schedule_error: input.error?.slice(0, 1000) ?? null, updated_at: new Date().toISOString() };
  if (input.facebookPostId) patch.facebook_post_id = input.facebookPostId;
  unwrap(await db().from("social_posts").update(patch).eq("id", input.id));
}

export async function listDueSocialPostsSql(limit = 20): Promise<DueSocialPost[]> {
  // Folga além do limite porque posts de conexões inativas são descartados depois.
  const posts = unwrap(await db().from("social_posts").select(POST_COLUMNS).eq("status", "scheduled").lte("scheduled_for", new Date().toISOString()).order("scheduled_for", { ascending: true }).limit(limit * 3)) as PostRow[];
  return (await attachConnections(posts, true)).slice(0, limit);
}

export async function updateSocialPostPublicationSql(input: { id: string; status: string; facebookPostId?: string | null; instagramMediaId?: string | null; publishedAt?: Date | null }): Promise<void> {
  const patch: Record<string, unknown> = { status: input.status, published_at: input.publishedAt?.toISOString() ?? null, updated_at: new Date().toISOString() };
  if (input.facebookPostId) patch.facebook_post_id = input.facebookPostId;
  if (input.instagramMediaId) patch.instagram_media_id = input.instagramMediaId;
  unwrap(await db().from("social_posts").update(patch).eq("id", input.id));
}

export async function cancelSocialPostSql(ownerUserId: string, id: string): Promise<boolean> {
  const rows = unwrap(await db().from("social_posts").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_user_id", ownerUserId).in("status", EDITABLE_STATUSES).select("id"));
  return (rows ?? []).length > 0;
}

export async function updateSocialPostScheduleSql(ownerUserId: string, id: string, scheduledFor: string): Promise<boolean> {
  const rows = unwrap(await db().from("social_posts").update({ scheduled_for: new Date(scheduledFor).toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("owner_user_id", ownerUserId).in("status", EDITABLE_STATUSES).select("id"));
  return (rows ?? []).length > 0;
}

export async function recordSocialPublicationAttemptSql(input: { postId: string; channel: "facebook" | "instagram"; action: "scheduled" | "published" | "failed" | "skipped"; providerPostId?: string | null; providerErrorCode?: string | null; safeMessage?: string | null }): Promise<void> {
  unwrap(await db().from("social_publication_attempts").insert({ post_id: input.postId, channel: input.channel, action: input.action, provider_post_id: input.providerPostId ?? null, provider_error_code: input.providerErrorCode ?? null, safe_message: input.safeMessage ?? null }));
}

export function resetSocialPublishingSqlPoolForTests(): void {}
