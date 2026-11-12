-- =============================================================================
-- Migration 001 – Shaft fit testing
-- =============================================================================
-- Adds the club_configs table and the optional club_speed, face_angle,
-- offline_distance and club_config_id columns to shots.
-- Use this on an existing database instead of re-running schema.sql, which
-- drops the shots table. Safe to run more than once.
-- =============================================================================

CREATE TABLE IF NOT EXISTS club_configs (
    id              SERIAL PRIMARY KEY,
    club            VARCHAR(50)     NOT NULL,
    label           VARCHAR(100)    NOT NULL,
    shaft_flex      VARCHAR(2)      NOT NULL
                        CHECK (shaft_flex IN ('L', 'A', 'R', 'S', 'X')),
    shaft_weight_g  NUMERIC(5, 1)
                        CHECK (shaft_weight_g >= 20 AND shaft_weight_g <= 150),
    kick_point      VARCHAR(4)
                        CHECK (kick_point IN ('low', 'mid', 'high')),
    torque          NUMERIC(4, 2)
                        CHECK (torque >= 0 AND torque <= 10),
    length_in       NUMERIC(4, 2)
                        CHECK (length_in >= 30 AND length_in <= 48),
    loft            NUMERIC(4, 1)
                        CHECK (loft >= 0 AND loft <= 70),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_configs_club ON club_configs (club);

ALTER TABLE shots
    ADD COLUMN IF NOT EXISTS club_speed       NUMERIC(6, 2)
        CHECK (club_speed > 0 AND club_speed <= 200),
    ADD COLUMN IF NOT EXISTS face_angle       NUMERIC(5, 2)
        CHECK (face_angle >= -20 AND face_angle <= 20),
    ADD COLUMN IF NOT EXISTS offline_distance NUMERIC(6, 2)
        CHECK (offline_distance >= -150 AND offline_distance <= 150),
    ADD COLUMN IF NOT EXISTS club_config_id   INT
        REFERENCES club_configs (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shots_club_config_id ON shots (club_config_id);
