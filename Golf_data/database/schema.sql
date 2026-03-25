-- =============================================================================
-- Golf Shot Tracker Database Schema
-- PostgreSQL 14+
-- =============================================================================
-- This schema defines the shots table used to store launch monitor data
-- from golf shots. Each row represents a single recorded shot with all
-- relevant ball flight and club data captured at impact.
-- =============================================================================

-- Drop the table if it already exists so this script is safely re-runnable
DROP TABLE IF EXISTS shots;

CREATE TABLE shots (
    -- Primary key: auto-incrementing integer surrogate key
    id              SERIAL PRIMARY KEY,

    -- The club used to hit the shot (e.g. 'Driver', '7-Iron', 'Putter')
    -- Stored as VARCHAR rather than an ENUM so the list can expand without
    -- a schema migration.
    club            VARCHAR(50)     NOT NULL,

    -- Ball speed immediately after impact, measured in miles per hour.
    -- Typical range: 60 mph (short irons) – 190 mph (driver).
    ball_speed      NUMERIC(6, 2)   NOT NULL
                        CHECK (ball_speed >= 0 AND ball_speed <= 300),

    -- Vertical launch angle of the ball in degrees above the horizon.
    -- Negative values are theoretically possible (topped shots).
    -- Typical range: -5° – 55°.
    launch_angle    NUMERIC(5, 2)   NOT NULL
                        CHECK (launch_angle >= -10 AND launch_angle <= 60),

    -- Back spin (topspin is negative back-spin) in revolutions per minute.
    -- High back-spin promotes carry; lower values tend to maximise roll.
    -- Typical range: 1500 rpm (driver) – 10000+ rpm (wedges).
    back_spin       NUMERIC(8, 2)   NOT NULL
                        CHECK (back_spin >= -10000 AND back_spin <= 10000),

    -- Side spin in revolutions per minute.
    -- Positive values indicate right-spin (fade/slice for a right-handed golfer).
    -- Negative values indicate left-spin (draw/hook).
    side_spin       NUMERIC(8, 2)   NOT NULL
                        CHECK (side_spin >= -5000 AND side_spin <= 5000),

    -- Club path angle in degrees relative to the target line at impact.
    -- Positive = in-to-out path (promotes draw).
    -- Negative = out-to-in path (promotes fade/slice).
    -- Typical range: -15° – +15°.
    club_path       NUMERIC(5, 2)   NOT NULL
                        CHECK (club_path >= -20 AND club_path <= 20),

    -- Carry distance: how far the ball flew through the air, in yards.
    carry_distance  NUMERIC(6, 2)   NOT NULL
                        CHECK (carry_distance >= 0 AND carry_distance <= 500),

    -- Total distance: carry + roll, in yards.
    -- Must be >= carry_distance (ball cannot roll backwards in normal play).
    total_distance  NUMERIC(6, 2)   NOT NULL
                        CHECK (total_distance >= 0 AND total_distance <= 600),

    -- Timestamp of when the shot record was created.
    -- Defaults to the current UTC time; the application never needs to supply it.
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Index on club allows efficient filtering/grouping by club type.
-- Very useful for "show me all my 7-iron shots" queries.
CREATE INDEX idx_shots_club ON shots (club);

-- Index on created_at supports ordering by recency and date-range queries.
-- Most list views will ORDER BY created_at DESC, so this is heavily used.
CREATE INDEX idx_shots_created_at ON shots (created_at DESC);

-- ---------------------------------------------------------------------------
-- Comments on table and columns (visible in psql \d+ output)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE  shots                    IS 'Each row is one recorded golf shot with launch monitor data.';
COMMENT ON COLUMN shots.id                 IS 'Auto-incrementing surrogate primary key.';
COMMENT ON COLUMN shots.club               IS 'Club used: Driver, 3-Wood, 5-Wood, 2-9 Iron, PW, GW, SW, LW, Putter.';
COMMENT ON COLUMN shots.ball_speed         IS 'Ball speed at impact in mph.';
COMMENT ON COLUMN shots.launch_angle       IS 'Vertical launch angle in degrees above horizon.';
COMMENT ON COLUMN shots.back_spin          IS 'Back-spin at launch in rpm (negative = top-spin).';
COMMENT ON COLUMN shots.side_spin          IS 'Side-spin in rpm; positive = fade/slice, negative = draw/hook.';
COMMENT ON COLUMN shots.club_path          IS 'Club path in degrees; positive = in-to-out, negative = out-to-in.';
COMMENT ON COLUMN shots.carry_distance     IS 'Carry distance (air only) in yards.';
COMMENT ON COLUMN shots.total_distance     IS 'Total distance (carry + roll) in yards.';
COMMENT ON COLUMN shots.created_at         IS 'UTC timestamp when the record was inserted.';