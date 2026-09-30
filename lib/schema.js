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

-- ===== v3: Tuyển qua group FB + Deal/Booking (xem docs/DEBATE.md) =====
ALTER TABLE creators ADD COLUMN IF NOT EXISTS acq_code VARCHAR(16);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_name VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deal_type VARCHAR(20) NOT NULL DEFAULT 'barter';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS fee_min NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS fee_max NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS revisions INTEGER NOT NULL DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deposit_pct NUMERIC(5,2) NOT NULL DEFAULT 30;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payment_days INTEGER NOT NULL DEFAULT 7;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS claims_allowed TEXT NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS claims_banned TEXT NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS contact_name VARCHAR(120) NOT NULL DEFAULT '';

-- Bảng giá tham khảo do creator tự khai (không bắt buộc)
CREATE TABLE IF NOT EXISTS rate_cards (
  creator_id      INTEGER PRIMARY KEY REFERENCES creators(id) ON DELETE CASCADE,
  video_fee       NUMERIC(14,0),
  live_hour_fee   NUMERIC(14,0),
  commission_pct  NUMERIC(5,2),
  spark_fee_pct   NUMERIC(5,2),
  accepts_barter  BOOLEAN NOT NULL DEFAULT TRUE,
  note            TEXT NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Deal = offer ⇄ counter (≤ 3 vòng) → booked → delivered → paid → completed
CREATE TABLE IF NOT EXISTS deals (
  id              SERIAL PRIMARY KEY,
  creator_id      INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  campaign_id     INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'offered',
  deal_type       VARCHAR(20) NOT NULL DEFAULT 'hybrid',
  fee             NUMERIC(14,0) NOT NULL DEFAULT 0,
  commission_pct  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  videos          INTEGER NOT NULL DEFAULT 1,
  spark_code      BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_pct     NUMERIC(5,2)  NOT NULL DEFAULT 30,
  round           INTEGER NOT NULL DEFAULT 1,
  last_by         VARCHAR(10) NOT NULL DEFAULT 'brand',
  expires_at      TIMESTAMPTZ,
  econ            JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_level  VARCHAR(10) NOT NULL DEFAULT 'ops',
  approved_by     VARCHAR(120) NOT NULL DEFAULT '',
  override_reason TEXT NOT NULL DEFAULT '',
  sample_id       INTEGER REFERENCES samples(id) ON DELETE SET NULL,
  booked_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deals_creator_idx ON deals(creator_id);
CREATE INDEX IF NOT EXISTS deals_status_idx ON deals(status);

CREATE TABLE IF NOT EXISTS deal_rounds (
  id              SERIAL PRIMARY KEY,
  deal_id         INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  round_no        INTEGER NOT NULL,
  by_party        VARCHAR(10) NOT NULL,
  action          VARCHAR(20) NOT NULL,
  fee             NUMERIC(14,0) NOT NULL DEFAULT 0,
  commission_pct  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  videos          INTEGER NOT NULL DEFAULT 1,
  message         TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deal_rounds_deal_idx ON deal_rounds(deal_id);

CREATE TABLE IF NOT EXISTS payouts (
  id              SERIAL PRIMARY KEY,
  deal_id         INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  kind            VARCHAR(10) NOT NULL,
  gross           NUMERIC(14,0) NOT NULL DEFAULT 0,
  pit             NUMERIC(14,0) NOT NULL DEFAULT 0,
  net             NUMERIC(14,0) NOT NULL DEFAULT 0,
  status          VARCHAR(10) NOT NULL DEFAULT 'pending',
  due_at          TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  ref             VARCHAR(200) NOT NULL DEFAULT '',
  UNIQUE(deal_id, kind)
);

-- Tuyển qua group Facebook: người thật đăng, hệ thống soạn bài + link tracking + đo phễu
CREATE TABLE IF NOT EXISTS fb_groups (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  url             VARCHAR(512) NOT NULL DEFAULT '',
  niche           VARCHAR(100) NOT NULL DEFAULT '',
  members         INTEGER NOT NULL DEFAULT 0,
  post_policy     VARCHAR(20) NOT NULL DEFAULT 'free',
  cost            NUMERIC(14,0) NOT NULL DEFAULT 0,
  cooldown_days   INTEGER NOT NULL DEFAULT 7,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  note            TEXT NOT NULL DEFAULT '',
  last_posted_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fb_posts (
  id              SERIAL PRIMARY KEY,
  group_id        INTEGER NOT NULL REFERENCES fb_groups(id) ON DELETE CASCADE,
  campaign_id     INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  angle           VARCHAR(30) NOT NULL DEFAULT 'fee',
  body            TEXT NOT NULL DEFAULT '',
  code            VARCHAR(16) NOT NULL UNIQUE,
  poster          VARCHAR(120) NOT NULL DEFAULT '',
  post_url        VARCHAR(512) NOT NULL DEFAULT '',
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',
  cost            NUMERIC(14,0) NOT NULL DEFAULT 0,
  clicks          INTEGER NOT NULL DEFAULT 0,
  posted_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fb_posts_group_idx ON fb_posts(group_id);
CREATE INDEX IF NOT EXISTS creators_acq_idx ON creators(acq_code);

-- Backfill cho creator cũ
UPDATE creators SET portal_token = md5(random()::text || clock_timestamp()::text || id::text) WHERE portal_token IS NULL;
UPDATE creators SET ref_code = UPPER(SUBSTR(md5(random()::text || id::text), 1, 7)) WHERE ref_code IS NULL;
`;

module.exports = { SCHEMA_SQL };
