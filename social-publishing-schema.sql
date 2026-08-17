-- Módulo isolado de publicações sociais Meta.
-- Não armazene tokens, chaves ou respostas integrais de OAuth em arquivos versionados.

CREATE TABLE IF NOT EXISTS social_meta_connections (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_user_id VARCHAR(64) NOT NULL,
  unit_id CHAR(36) NOT NULL,
  unit_name VARCHAR(255) NOT NULL,
  facebook_page_id VARCHAR(64) NOT NULL,
  facebook_page_name VARCHAR(255) NOT NULL,
  instagram_account_id VARCHAR(64) NULL,
  instagram_username VARCHAR(255) NULL,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at DATETIME NULL,
  granted_scopes TEXT NULL,
  connection_status ENUM('active', 'expired', 'revoked', 'error') NOT NULL DEFAULT 'active',
  last_error_code VARCHAR(80) NULL,
  last_error_message VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_social_meta_connection (owner_user_id, facebook_page_id),
  KEY idx_social_meta_connection_unit (unit_id),
  KEY idx_social_meta_connection_status (connection_status)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_user_id VARCHAR(64) NOT NULL,
  unit_id CHAR(36) NOT NULL,
  unit_name VARCHAR(255) NOT NULL,
  social_connection_id CHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  caption TEXT NOT NULL,
  link_url TEXT NULL,
  content_format ENUM('image', 'carousel', 'video', 'reel') NOT NULL,
  target_facebook TINYINT(1) NOT NULL DEFAULT 0,
  target_instagram TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('draft', 'scheduled', 'publishing', 'published', 'partially_published', 'failed', 'cancelled', 'waiting_connection') NOT NULL DEFAULT 'draft',
  scheduled_for DATETIME NULL,
  published_at DATETIME NULL,
  facebook_post_id VARCHAR(128) NULL,
  instagram_media_id VARCHAR(128) NULL,
  provider_state_encrypted MEDIUMTEXT NULL,
  created_by_user_id VARCHAR(64) NOT NULL,
  updated_by_user_id VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_social_posts_schedule (status, scheduled_for),
  KEY idx_social_posts_unit (unit_id, scheduled_for),
  KEY idx_social_posts_connection (social_connection_id)
);

CREATE TABLE IF NOT EXISTS social_post_media (
  id CHAR(36) NOT NULL PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  sort_order INT NOT NULL,
  storage_key VARCHAR(512) NULL,
  public_url TEXT NOT NULL,
  media_type ENUM('image', 'video') NOT NULL,
  alt_text VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_social_post_media_order (post_id, sort_order),
  CONSTRAINT fk_social_post_media_post FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_publication_attempts (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  channel ENUM('facebook', 'instagram') NOT NULL,
  action ENUM('scheduled', 'published', 'failed', 'skipped') NOT NULL,
  provider_post_id VARCHAR(128) NULL,
  provider_error_code VARCHAR(80) NULL,
  safe_message VARCHAR(1000) NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_social_publication_attempts_post (post_id, occurred_at),
  CONSTRAINT fk_social_publication_attempts_post FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_meta_oauth_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_user_id VARCHAR(64) NOT NULL,
  candidates_encrypted MEDIUMTEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_social_meta_oauth_owner (owner_user_id, expires_at)
);

CREATE TABLE IF NOT EXISTS social_publishing_settings (
  id TINYINT NOT NULL PRIMARY KEY,
  schedule_cron_task_uid VARCHAR(65) NULL,
  scheduler_status ENUM('inactive', 'active', 'paused') NOT NULL DEFAULT 'inactive',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO social_publishing_settings (id, scheduler_status) VALUES (1, 'inactive');
