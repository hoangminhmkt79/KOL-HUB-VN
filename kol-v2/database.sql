-- ============================================
-- KOL Hub v2 — Chạy trong Neon SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS creators (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(255)  NOT NULL,
  email                 VARCHAR(255)  NOT NULL UNIQUE,
  tiktok_link           VARCHAR(512)  NOT NULL,
  followers             INTEGER       NOT NULL DEFAULT 0 CHECK (followers >= 0),
  niche                 VARCHAR(100)  NOT NULL DEFAULT 'other',
  avg_views             INTEGER       NOT NULL DEFAULT 0 CHECK (avg_views >= 0),
  avg_viewers           INTEGER       NOT NULL DEFAULT 0 CHECK (avg_viewers >= 0),
  platform              VARCHAR(100)  NOT NULL DEFAULT 'TikTok',
  content_type          VARCHAR(50)   NOT NULL DEFAULT 'video',
  address               TEXT,
  -- self-reported
  expected_monthly_gmv  BIGINT        CHECK (expected_monthly_gmv >= 0),
  channel_gmv           BIGINT        NOT NULL DEFAULT 0 CHECK (channel_gmv >= 0),
  -- real performance
  video_link            TEXT,
  video_views           INTEGER       NOT NULL DEFAULT 0 CHECK (video_views >= 0),
  orders_generated      INTEGER       NOT NULL DEFAULT 0 CHECK (orders_generated >= 0),
  revenue_generated     BIGINT        NOT NULL DEFAULT 0 CHECK (revenue_generated >= 0),
  -- system
  status                VARCHAR(50)   NOT NULL DEFAULT 'applied',
  gmv                   NUMERIC(14,0) NOT NULL DEFAULT 0,
  promo_code            VARCHAR(100),
  score                 NUMERIC(8,4)  DEFAULT 0,
  koc_score             NUMERIC(8,4)  DEFAULT 0,
  potential             VARCHAR(20)   DEFAULT 'low',
  applied_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);
CREATE INDEX IF NOT EXISTS idx_creators_expected_gmv ON creators(expected_monthly_gmv DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_creators_revenue ON creators(revenue_generated DESC);
CREATE INDEX IF NOT EXISTS idx_creators_koc_score ON creators(koc_score DESC);

-- add missing columns if upgrading from v1
ALTER TABLE creators ADD COLUMN IF NOT EXISTS expected_monthly_gmv BIGINT CHECK (expected_monthly_gmv >= 0);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS video_link TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS video_views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS orders_generated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS revenue_generated BIGINT NOT NULL DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS koc_score NUMERIC(8,4) DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS channel_gmv BIGINT NOT NULL DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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
