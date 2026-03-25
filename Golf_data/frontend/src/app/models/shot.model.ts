/**
 * shot.model.ts – TypeScript interface representing a single golf shot record.
 *
 * Every field mirrors a column in the `shots` PostgreSQL table. Using an
 * interface (rather than a class) keeps the model purely structural – no
 * runtime overhead, and Angular's strict template checking can use the shape
 * for type-safe bindings.
 */

export interface Shot {
  /** Auto-generated surrogate primary key from the database. */
  id: number;

  /**
   * Name of the club used for the shot.
   * One of: 'Driver', '3-Wood', '5-Wood', '2-Iron'–'9-Iron',
   * 'Pitching Wedge', 'Gap Wedge', 'Sand Wedge', 'Lob Wedge', 'Putter'.
   */
  club: string;

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

  /** Distance the ball travelled through the air (no roll), in yards (yds). */
  carry_distance: number;

  /** Total distance including roll after landing, in yards (yds). */
  total_distance: number;

  /**
   * ISO 8601 timestamp of when the record was created.
   * The database supplies this automatically; the frontend treats it as
   * read-only.
   */
  created_at: string;
}