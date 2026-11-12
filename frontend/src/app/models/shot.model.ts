/**
 * shot.model.ts – TypeScript interface representing a single golf shot record.
 *
 * Every field mirrors a column in the `shots` PostgreSQL table. Using an
 * interface (rather than a class) keeps the model purely structural – no
 * runtime overhead, and Angular's strict template checking can use the shape
 * for type-safe bindings.
 */

/**
 * A single feedback item returned by the server's swing analysis engine.
 * type     – severity: 'warning' triggers an amber alert, 'info' a blue one,
 *             'success' a green one.
 * category – groups related items: 'spin', 'path', 'face', 'strike', 'trajectory',
 *             'distance', 'shaft', 'consistency', 'general'.
 * message  – the headline finding shown in bold.
 * tip      – an actionable suggestion shown below the message.
 */
export interface FeedbackItem {
  type: 'warning' | 'info' | 'success';
  category: string;
  message: string;
  tip: string;
}

/**
 * The response shape returned by POST /api/shots.
 * Including feedback in the creation response avoids a second round-trip.
 */
export interface ShotCreateResponse {
  shot: Shot;
  feedback: FeedbackItem[];
}

export interface Shot {
  /** Auto-generated surrogate primary key from the database. */
  id: number;

  /**
   * Name of the club used for the shot.
   * One of: 'Driver', '3-Wood', '5-Wood', '2-Iron'–'9-Iron',
   * 'Pitching Wedge', 'Gap Wedge', 'Sand Wedge', 'Lob Wedge', 'Putter'.
   */
  club: string;

  /**
   * Club head speed just before impact, in mph. Optional – null when the
   * launch monitor didn't report it. Used for smash factor and shaft fitting.
   */
  club_speed: number | null;

  /** Ball speed immediately after impact, in miles per hour (mph). */
  ball_speed: number;

  /**
   * Vertical launch angle of the ball above the horizon, in degrees (°).
   * Negative values are possible on topped/thin strikes.
   */
  launch_angle: number;

  /**
   * Back-spin rate at launch, in revolutions per minute (rpm).
   * Higher back-spin increases carry and stopping power on greens.
   * Negative values represent top-spin (uncommon in full shots).
   */
  back_spin: number;

  /**
   * Side-spin rate at launch, in revolutions per minute (rpm).
   * Positive = right-spin → fade or slice (for a right-handed golfer).
   * Negative = left-spin  → draw or hook.
   */
  side_spin: number;

  /**
   * Club path angle at impact relative to the target line, in degrees (°).
   * Positive = in-to-out path (encourages draw).
   * Negative = out-to-in path (encourages fade/slice).
   */
  club_path: number;

  /**
   * Face angle at impact relative to the target line, in degrees (°). Optional.
   * Positive = open, negative = closed.
   */
  face_angle: number | null;

  /** Distance the ball travelled through the air (no roll), in yards (yds). */
  carry_distance: number;

  /** Total distance including roll after landing, in yards (yds). */
  total_distance: number;

  /**
   * Yards the ball finished left (negative) or right (positive) of the target.
   * Optional. Used to measure dispersion when comparing shafts.
   */
  offline_distance: number | null;

  /** The club + shaft setup used for this shot, or null if not recorded. */
  club_config_id: number | null;

  /**
   * ISO 8601 timestamp of when the record was created.
   * The database supplies this automatically; the frontend treats it as
   * read-only.
   */
  created_at: string;
}

/** Shaft flex codes, softest to stiffest. */
export type ShaftFlex = 'L' | 'A' | 'R' | 'S' | 'X';

/**
 * One club + shaft combination in the golfer's bag. Mirrors the club_configs
 * table. Testing two shafts in the same head means two ClubConfig rows.
 */
export interface ClubConfig {
  id: number;
  /** Same club names as Shot.club */
  club: string;
  /** Free-text name for the setup, e.g. 'Ventus Blue 6S' */
  label: string;
  shaft_flex: ShaftFlex;
  shaft_weight_g: number | null;
  kick_point: 'low' | 'mid' | 'high' | null;
  /** Torque in degrees */
  torque: number | null;
  length_in: number | null;
  /** Static loft in degrees */
  loft: number | null;
  created_at: string;
}

/**
 * Aggregated stats for every shot logged against one ClubConfig.
 * *_avg are means, *_sd are sample standard deviations; null when no shot
 * in the set recorded that field (or fewer than two shots for *_sd).
 */
export interface ClubConfigStats {
  shots: number;
  club_speed_avg: number | null;
  club_speed_sd: number | null;
  ball_speed_avg: number | null;
  smash_avg: number | null;
  launch_avg: number | null;
  launch_sd: number | null;
  spin_avg: number | null;
  spin_sd: number | null;
  carry_avg: number | null;
  carry_sd: number | null;
  offline_avg: number | null;
  offline_sd: number | null;
}

/** One entry returned by GET /api/club-configs/stats. */
export interface ClubConfigStatsResponse {
  config: ClubConfig;
  stats: ClubConfigStats;
  feedback: FeedbackItem[];
}
