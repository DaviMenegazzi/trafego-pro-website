ALTER TABLE social_meta_connections
  ADD COLUMN automation_enabled TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN automation_paused_at DATETIME NULL,
  ADD COLUMN automation_last_error VARCHAR(1000) NULL;

ALTER TABLE social_posts
  ADD COLUMN facebook_schedule_status ENUM('not_requested', 'pending', 'scheduled', 'failed') NOT NULL DEFAULT 'not_requested',
  ADD COLUMN instagram_schedule_status ENUM('not_requested', 'pending', 'publishing', 'published', 'retrying', 'failed') NOT NULL DEFAULT 'not_requested',
  ADD COLUMN instagram_attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN instagram_next_attempt_at DATETIME NULL,
  ADD COLUMN facebook_schedule_error VARCHAR(1000) NULL,
  ADD KEY idx_social_posts_instagram_queue (instagram_schedule_status, instagram_next_attempt_at);
