import crypto from "crypto";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import type { SocialContentFormat, SocialPostMediaInput } from "./socialPublishingPolicy.js";

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

type ConnectionRow = RowDataPacket & {
  id: string; unit_id: string; unit_name: string; facebook_page_id: string; facebook_page_name: string;
  instagram_account_id: string | null; instagram_username: string | null; connection_status: SocialMetaConnection["connectionStatus"];
  token_expires_at: Date | string | null; last_error_message: string | null; created_at: Date | string;
};
type PostRow = RowDataPacket & {
  id: string; unit_id: string; unit_name: string; social_connection_id: string | null; title: string; caption: string;
  link_url: string | null; content_format: SocialContentFormat; target_facebook: number; target_instagram: number; status: string;
  scheduled_for: Date | string | null; published_at: Date | string | null; facebook_post_id: string | null; instagram_media_id: string | null; created_at: Date | string;
};
type MediaRow = RowDataPacket & { id: string; post_id: string; public_url: string; media_type: "image" | "video"; alt_text: string | null };
type SettingsRow = RowDataPacket & { schedule_cron_task_uid: string | null; scheduler_status: SocialPublishingSettings["schedulerStatus"] };
type OAuthSessionRow = RowDataPacket & { id: string; candidates_encrypted: string; expires_at: Date | string };

let pool: Pool | null = null;

function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não configurada para o calendário social");
  if (!pool) pool = mysql.createPool({ uri: databaseUrl, waitForConnections: true, connectionLimit: 5, queueLimit: 0, enableKeepAlive: true });
  return pool;
}

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
    id: row.id, unitId: row.unit_id, unitName: row.unit_name, socialConnectionId: row.social_connection_id,
    title: row.title, caption: row.caption, linkUrl: row.link_url, contentFormat: row.content_format,
    targetFacebook: Boolean(row.target_facebook), targetInstagram: Boolean(row.target_instagram), status: row.status,
    scheduledFor: toIso(row.scheduled_for), publishedAt: toIso(row.published_at), facebookPostId: row.facebook_post_id,
    instagramMediaId: row.instagram_media_id, createdAt: toIso(row.created_at)!,
    media: media.filter((item) => item.post_id === row.id).map((item) => ({ id: item.id, url: item.public_url, mediaType: item.media_type, altText: item.alt_text })),
  };
}

export async function listSocialMetaConnectionsSql(ownerUserId: string): Promise<SocialMetaConnection[]> {
  const [rows] = await getPool().query<ConnectionRow[]>(`SELECT id, unit_id, unit_name, facebook_page_id, facebook_page_name, instagram_account_id, instagram_username, connection_status, token_expires_at, last_error_message, created_at FROM social_meta_connections WHERE owner_user_id = ? ORDER BY created_at DESC`, [ownerUserId]);
  return rows.map(mapConnection);
}

export async function listSocialPostsSql(ownerUserId: string): Promise<SocialPost[]> {
  const db = getPool();
  const [posts] = await db.query<PostRow[]>(`SELECT id, unit_id, unit_name, social_connection_id, title, caption, link_url, content_format, target_facebook, target_instagram, status, scheduled_for, published_at, facebook_post_id, instagram_media_id, created_at FROM social_posts WHERE owner_user_id = ? ORDER BY COALESCE(scheduled_for, created_at) ASC LIMIT 200`, [ownerUserId]);
  if (!posts.length) return [];
  const [media] = await db.query<MediaRow[]>(`SELECT id, post_id, public_url, media_type, alt_text FROM social_post_media WHERE post_id IN (${posts.map(() => "?").join(",")}) ORDER BY sort_order`, posts.map((post) => post.id));
  return posts.map((post) => mapPost(post, media));
}

export async function createSocialPostSql(input: {
  ownerUserId: string; unitId: string; unitName: string; socialConnectionId: string | null; title: string; caption: string; linkUrl: string | null;
  contentFormat: SocialContentFormat; targetFacebook: boolean; targetInstagram: boolean; status: string; scheduledFor: string | null; media: SocialPostMediaInput[];
}): Promise<SocialPost> {
  const id = crypto.randomUUID();
  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute<ResultSetHeader>(`INSERT INTO social_posts (id, owner_user_id, unit_id, unit_name, social_connection_id, title, caption, link_url, content_format, target_facebook, target_instagram, status, scheduled_for, created_by_user_id, updated_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, input.ownerUserId, input.unitId, input.unitName, input.socialConnectionId, input.title, input.caption, input.linkUrl, input.contentFormat, input.targetFacebook, input.targetInstagram, input.status, input.scheduledFor ? new Date(input.scheduledFor) : null, input.ownerUserId, input.ownerUserId]);
    for (let index = 0; index < input.media.length; index += 1) {
      const media = input.media[index]!;
      await connection.execute<ResultSetHeader>(`INSERT INTO social_post_media (id, post_id, sort_order, public_url, media_type, alt_text) VALUES (?, ?, ?, ?, ?, ?)`, [crypto.randomUUID(), id, index, media.url, media.mediaType, media.altText?.trim() || null]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
  const posts = await listSocialPostsSql(input.ownerUserId);
  const post = posts.find((item) => item.id === id);
  if (!post) throw new Error("Publicação criada, mas não pôde ser lida");
  return post;
}

export async function getSocialPublishingSettingsSql(): Promise<SocialPublishingSettings> {
  const [rows] = await getPool().query<SettingsRow[]>("SELECT schedule_cron_task_uid, scheduler_status FROM social_publishing_settings WHERE id = 1 LIMIT 1");
  const row = rows[0];
  return { scheduleCronTaskUid: row?.schedule_cron_task_uid ?? null, schedulerStatus: row?.scheduler_status ?? "inactive" };
}

export async function updateSocialPublishingSettingsSql(input: Partial<SocialPublishingSettings>): Promise<void> {
  const current = await getSocialPublishingSettingsSql();
  await getPool().execute("UPDATE social_publishing_settings SET schedule_cron_task_uid = ?, scheduler_status = ? WHERE id = 1", [input.scheduleCronTaskUid ?? current.scheduleCronTaskUid, input.schedulerStatus ?? current.schedulerStatus]);
}

export async function saveSocialOAuthSessionSql(input: { id: string; ownerUserId: string; candidatesEncrypted: string; expiresAt: Date }): Promise<void> {
  await getPool().execute("INSERT INTO social_meta_oauth_sessions (id, owner_user_id, candidates_encrypted, expires_at) VALUES (?, ?, ?, ?)", [input.id, input.ownerUserId, input.candidatesEncrypted, input.expiresAt]);
}

export async function getSocialOAuthSessionSql(id: string, ownerUserId: string): Promise<{ candidatesEncrypted: string; expiresAt: string } | null> {
  const [rows] = await getPool().query<OAuthSessionRow[]>("SELECT id, candidates_encrypted, expires_at FROM social_meta_oauth_sessions WHERE id = ? AND owner_user_id = ? AND expires_at > UTC_TIMESTAMP() LIMIT 1", [id, ownerUserId]);
  const row = rows[0];
  return row ? { candidatesEncrypted: row.candidates_encrypted, expiresAt: toIso(row.expires_at)! } : null;
}

export async function upsertSocialMetaConnectionSql(input: { id: string; ownerUserId: string; unitId: string; unitName: string; facebookPageId: string; facebookPageName: string; instagramAccountId: string | null; instagramUsername: string | null; accessTokenEncrypted: string; grantedScopes: string | null }): Promise<void> {
  await getPool().execute(`INSERT INTO social_meta_connections (id, owner_user_id, unit_id, unit_name, facebook_page_id, facebook_page_name, instagram_account_id, instagram_username, access_token_encrypted, granted_scopes, connection_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active') ON DUPLICATE KEY UPDATE id = VALUES(id), unit_id = VALUES(unit_id), unit_name = VALUES(unit_name), facebook_page_name = VALUES(facebook_page_name), instagram_account_id = VALUES(instagram_account_id), instagram_username = VALUES(instagram_username), access_token_encrypted = VALUES(access_token_encrypted), granted_scopes = VALUES(granted_scopes), connection_status = 'active', last_error_code = NULL, last_error_message = NULL`, [input.id, input.ownerUserId, input.unitId, input.unitName, input.facebookPageId, input.facebookPageName, input.instagramAccountId, input.instagramUsername, input.accessTokenEncrypted, input.grantedScopes]);
}

export type DueSocialPost = SocialPost & { facebookPageId: string; instagramAccountId: string | null; accessTokenEncrypted: string };

export async function listDueSocialPostsSql(limit = 20): Promise<DueSocialPost[]> {
  const [rows] = await getPool().query<(PostRow & ConnectionRow & { access_token_encrypted: string })[]>(`SELECT p.id, p.unit_id, p.unit_name, p.social_connection_id, p.title, p.caption, p.link_url, p.content_format, p.target_facebook, p.target_instagram, p.status, p.scheduled_for, p.published_at, p.facebook_post_id, p.instagram_media_id, p.created_at, c.facebook_page_id, c.instagram_account_id, c.access_token_encrypted FROM social_posts p JOIN social_meta_connections c ON c.id = p.social_connection_id WHERE p.status = 'scheduled' AND p.scheduled_for <= UTC_TIMESTAMP() AND c.connection_status = 'active' ORDER BY p.scheduled_for ASC LIMIT ?`, [limit]);
  if (!rows.length) return [];
  const [media] = await getPool().query<MediaRow[]>(`SELECT id, post_id, public_url, media_type, alt_text FROM social_post_media WHERE post_id IN (${rows.map(() => "?").join(",")}) ORDER BY sort_order`, rows.map((row) => row.id));
  return rows.map((row) => ({ ...mapPost(row, media), facebookPageId: row.facebook_page_id, instagramAccountId: row.instagram_account_id, accessTokenEncrypted: row.access_token_encrypted }));
}

export async function updateSocialPostPublicationSql(input: { id: string; status: string; facebookPostId?: string | null; instagramMediaId?: string | null; publishedAt?: Date | null }): Promise<void> {
  await getPool().execute("UPDATE social_posts SET status = ?, facebook_post_id = COALESCE(?, facebook_post_id), instagram_media_id = COALESCE(?, instagram_media_id), published_at = ? WHERE id = ?", [input.status, input.facebookPostId ?? null, input.instagramMediaId ?? null, input.publishedAt ?? null, input.id]);
}

export async function recordSocialPublicationAttemptSql(input: { postId: string; channel: "facebook" | "instagram"; action: "scheduled" | "published" | "failed" | "skipped"; providerPostId?: string | null; providerErrorCode?: string | null; safeMessage?: string | null }): Promise<void> {
  await getPool().execute("INSERT INTO social_publication_attempts (post_id, channel, action, provider_post_id, provider_error_code, safe_message) VALUES (?, ?, ?, ?, ?, ?)", [input.postId, input.channel, input.action, input.providerPostId ?? null, input.providerErrorCode ?? null, input.safeMessage ?? null]);
}

export function resetSocialPublishingSqlPoolForTests(): void { pool = null; }
