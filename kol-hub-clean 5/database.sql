-- KOL Hub — Chạy trong Neon SQL Editor (1 lần duy nhất)

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

CREATE TABLE IF NOT EXISTS campaign_creators (
  id            SERIAL PRIMARY KEY,
  campaign_id   INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id    INTEGER REFERENCES creators(id)  ON DELETE CASCADE,
  camp_status   VARCHAR(100)  NOT NULL DEFAULT 'Chờ xác nhận',
  posts_done    INTEGER       NOT NULL DEFAULT 0,
  UNIQUE(campaign_id, creator_id)
);

-- Nếu đã có bảng cũ, chạy thêm các dòng này:
ALTER TABLE creators ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS channel_gmv VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS tiktok_link VARCHAR(512) NOT NULL DEFAULT '';
