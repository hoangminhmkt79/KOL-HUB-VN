// Nguồn schema duy nhất. Chạy lại an toàn (idempotent).
// - Admin: bấm "Khởi tạo / nâng cấp DB" trong tab Automation, hoặc
// - Thủ công: `npm run schema` để xuất ra database.sql rồi dán vào Neon SQL Editor.

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS creators (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  email         VARCHAR(255)  NOT NULL DEFAULT '',
  phone         VARCHAR(20)   NOT NULL DEFAULT '',
  tiktok_link   VARCHAR(512)  NOT NULL DEFAULT '',
  followers     INTEGER       NOT NULL DEFAULT 0,
  niche         VARCHAR(100)  NOT NULL DEFAULT 'other',
  avg_views     INTEGER       NOT NULL DEFAULT 0,
  avg_viewers   INTEGER       NOT NULL DEFAULT 0,
  platform      VARCHAR(100)  NOT NULL DEFAULT 'TikTok',
  content_type  VARCHAR(50)   NOT NULL DEFAULT 'video',
  address       TEXT          NOT NULL DEFAULT '',
  channel_gmv   VARCHAR(50)   NOT NULL DEFAULT '',
  status        VARCHAR(50)   NOT NULL DEFAULT 'applied',
  gmv           NUMERIC(14,0) NOT NULL DEFAULT 0,
  promo_code    VARCHAR(100),
  score         NUMERIC(10,4) DEFAULT 0,
  potential     VARCHAR(20)   DEFAULT 'low',
  applied_at    TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE creators ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS channel_gmv VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS tiktok_link VARCHAR(512) NOT NULL DEFAULT '';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS handle VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS ship_address TEXT NOT NULL DEFAULT '';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS portal_token VARCHAR(64);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS ref_code VARCHAR(16);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES creators(id) ON DELETE SET NULL;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'form';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS screen_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS creators_portal_token_uq ON creators(portal_token);
CREATE UNIQUE INDEX IF NOT EXISTS creators_ref_code_uq ON creators(ref_code);
CREATE UNIQUE INDEX IF NOT EXISTS creators_handle_uq ON creators(LOWER(handle)) WHERE handle <> '';
CREATE INDEX IF NOT EXISTS creators_status_idx ON creators(status);
CREATE INDEX IF NOT EXISTS creators_phone_idx ON creators(phone);

CREATE TABLE IF NOT EXISTS campaigns (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  product       VARCHAR(255),
  start_date    DATE,
  end_date      DATE,
  budget        NUMERIC(14,0) NOT NULL DEFAULT 0,
  goal          TEXT,
  brief         TEXT,
  req           TEXT,
  format        VARCHAR(100),
  content_type  VARCHAR(50)   NOT NULL DEFAULT 'video',
  posts_per     INTEGER       NOT NULL DEFAULT 2,
  slots         INTEGER       NOT NULL DEFAULT 10,
  filled        INTEGER       NOT NULL DEFAULT 0,
  note          TEXT,
  status        VARCHAR(50)   NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS niche VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sample_cost NUMERIC(14,0) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS campaign_creators (
  id            SERIAL PRIMARY KEY,
  campaign_id   INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id    INTEGER REFERENCES creators(id)  ON DELETE CASCADE,
  camp_status   VARCHAR(100)  NOT NULL DEFAULT 'Chờ xác nhận',
  posts_done    INTEGER       NOT NULL DEFAULT 0,
  UNIQUE(campaign_id, creator_id)
);

-- Đơn sample: 1 dòng = 1 lần gửi hàng mẫu (map từ đơn TikTok Shop / CSV / tạo tay)
CREATE TABLE IF NOT EXISTS samples (
  id               SERIAL PRIMARY KEY,
  creator_id       INTEGER REFERENCES creators(id) ON DELETE CASCADE,
  campaign_id      INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  tiktok_order_id  VARCHAR(64),
  product          VARCHAR(255) NOT NULL DEFAULT '',
  sku              VARCHAR(128) NOT NULL DEFAULT '',
  cost             NUMERIC(14,0) NOT NULL DEFAULT 0,
  carrier          VARCHAR(100) NOT NULL DEFAULT '',
  tracking_no      VARCHAR(100) NOT NULL DEFAULT '',
  status           VARCHAR(30)  NOT NULL DEFAULT 'requested',
  source           VARCHAR(20)  NOT NULL DEFAULT 'manual',
  match_method     VARCHAR(20)  NOT NULL DEFAULT '',
  raw_status       VARCHAR(50)  NOT NULL DEFAULT '',
  requested_at     TIMESTAMPTZ DEFAULT NOW(),
  shipped_at       TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  content_due_at   TIMESTAMPTZ,
  posted_at        TIMESTAMPTZ,
  reminded_at      TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS samples_order_uq ON samples(tiktok_order_id) WHERE tiktok_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS samples_creator_idx ON samples(creator_id);
CREATE INDEX IF NOT EXISTS samples_status_idx ON samples(status);

-- Đơn TikTok không map được creator: giữ lại để admin gán tay
CREATE TABLE IF NOT EXISTS unmatched_orders (
  order_id      VARCHAR(64) PRIMARY KEY,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Video creator nộp (portal) hoặc admin nhập
CREATE TABLE IF NOT EXISTS videos (
  id            SERIAL PRIMARY KEY,
  creator_id    INTEGER REFERENCES creators(id) ON DELETE CASCADE,
  sample_id     INTEGER REFERENCES samples(id) ON DELETE SET NULL,
  campaign_id   INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  url           VARCHAR(512) NOT NULL,
  platform      VARCHAR(30)  NOT NULL DEFAULT 'TikTok',
  video_id      VARCHAR(64)  NOT NULL DEFAULT '',
  title         TEXT         NOT NULL DEFAULT '',
  thumbnail     TEXT         NOT NULL DEFAULT '',
  author        VARCHAR(100) NOT NULL DEFAULT '',
  verified      BOOLEAN      NOT NULL DEFAULT FALSE,
  status        VARCHAR(20)  NOT NULL DEFAULT 'submitted',
  views         INTEGER      NOT NULL DEFAULT 0,
  likes         INTEGER      NOT NULL DEFAULT 0,
  orders        INTEGER      NOT NULL DEFAULT 0,
  gmv           NUMERIC(14,0) NOT NULL DEFAULT 0,
  submitted_by  VARCHAR(20)  NOT NULL DEFAULT 'creator',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS videos_url_uq ON videos(url);
CREATE INDEX IF NOT EXISTS videos_creator_idx ON videos(creator_id);
CREATE INDEX IF NOT EXISTS videos_vid_idx ON videos(video_id);

-- Nhật ký mọi hành động tự động / thủ công
CREATE TABLE IF NOT EXISTS events (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(50) NOT NULL,
  creator_id    INTEGER REFERENCES creators(id) ON DELETE CASCADE,
  sample_id     INTEGER REFERENCES samples(id) ON DELETE CASCADE,
  video_id      INTEGER REFERENCES videos(id) ON DELETE CASCADE,
  actor         VARCHAR(20) NOT NULL DEFAULT 'system',
  message       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS events_created_idx ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS events_creator_idx ON events(creator_id);

CREATE TABLE IF NOT EXISTS settings (
  key           VARCHAR(50) PRIMARY KEY,
  value         JSONB NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill cho creator cũ
UPDATE creators SET portal_token = md5(random()::text || clock_timestamp()::text || id::text) WHERE portal_token IS NULL;
UPDATE creators SET ref_code = UPPER(SUBSTR(md5(random()::text || id::text), 1, 7)) WHERE ref_code IS NULL;
`;

module.exports = { SCHEMA_SQL };
