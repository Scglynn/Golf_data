// =============================================================================
// services/analysisService.js – Shot analysis and feedback engine
// =============================================================================
// Exports analyzeShot(shot) which examines a normalised shot record and returns
// an array of FeedbackItem objects describing what is going well or poorly.
//
// Design goals:
//   - Every rule is independent; a shot can trigger multiple feedback items.
//   - The function never throws; if a field is missing or NaN the relevant rule
//     simply produces no feedback rather than crashing the server.
//   - Optimal ranges come from published launch monitor data; they are club-
//     specific so a Driver and a 9-Iron are judged on different standards.
// =============================================================================

// ---------------------------------------------------------------------------
// Club configuration – optimal launch angle (°) and back-spin (rpm) windows
// ---------------------------------------------------------------------------
// Putter is intentionally absent because launch angle and back-spin are not
// meaningful metrics for putting strokes.
const CLUB_CONFIG = {
  'Driver':         { launchMin: 10, launchMax: 15, spinMin:  2000, spinMax:  2800 },
  '3-Wood':         { launchMin:  8, launchMax: 12, spinMin:  3000, spinMax:  4000 },
  '5-Wood':         { launchMin: 10, launchMax: 14, spinMin:  3500, spinMax:  4500 },
  '2-Iron':         { launchMin: 10, launchMax: 14, spinMin:  3500, spinMax:  5500 },
  '3-Iron':         { launchMin: 11, launchMax: 15, spinMin:  4000, spinMax:  6000 },
  '4-Iron':         { launchMin: 12, launchMax: 16, spinMin:  4500, spinMax:  6500 },
  '5-Iron':         { launchMin: 14, launchMax: 19, spinMin:  5000, spinMax:  7000 },
  '6-Iron':         { launchMin: 16, launchMax: 21, spinMin:  5500, spinMax:  7500 },
  '7-Iron':         { launchMin: 18, launchMax: 23, spinMin:  6000, spinMax:  8000 },
  '8-Iron':         { launchMin: 20, launchMax: 25, spinMin:  6500, spinMax:  8500 },
  '9-Iron':         { launchMin: 22, launchMax: 27, spinMin:  7000, spinMax:  9500 },
  'Pitching Wedge': { launchMin: 24, launchMax: 30, spinMin:  8000, spinMax: 10000 },
  'Gap Wedge':      { launchMin: 26, launchMax: 33, spinMin:  9000, spinMax: 11500 },
  'Sand Wedge':     { launchMin: 28, launchMax: 35, spinMin:  9500, spinMax: 12000 },
  'Lob Wedge':      { launchMin: 30, launchMax: 38, spinMin: 10000, spinMax: 13000 },
};

// ---------------------------------------------------------------------------
// analyzeShot
// ---------------------------------------------------------------------------
/**
 * Analyse a single shot and return an array of feedback items.
 *
 * @param {Object} shot - A normalised shot row with numeric fields
 * @param {string} shot.club
 * @param {number} shot.launch_angle   - degrees
 * @param {number} shot.back_spin      - rpm
 * @param {number} shot.side_spin      - rpm (positive = fade, negative = draw)
 * @param {number} shot.club_path      - degrees (positive = in-to-out)
 * @param {number} shot.carry_distance - yards
 * @param {number} shot.total_distance - yards
 *
 * @returns {{ type: string, category: string, message: string, tip: string }[]}
 */
function analyzeShot(shot) {
  const feedback = [];
  const {
    club,
    launch_angle,
    back_spin,
    side_spin,
    club_path,
    carry_distance,
    total_distance,
  } = shot;

  const absSideSpin = Math.abs(side_spin);

  // ── Side spin analysis ─────────────────────────────────────────────────────
  // Side spin is the primary driver of ball curve. Higher absolute values mean
  // a stronger curve and usually indicate a face-to-path mismatch at impact.

  if (absSideSpin > 2500) {
    const shape = side_spin > 0 ? 'fade/slice' : 'draw/hook';
    feedback.push({
      type: 'warning',
      category: 'spin',
      message: `Very high side spin (${Math.round(absSideSpin)} rpm) — strong ${shape} expected`,
      tip: side_spin > 0
        ? 'Your face is significantly open relative to path at impact. Work on squaring the face through the hitting zone to reduce this curve.'
        : 'Your face is significantly closed relative to path at impact. Focus on slowing forearm rotation through impact to straighten the ball flight.',
    });
  } else if (absSideSpin > 1000) {
    const shape = side_spin > 0 ? 'fade' : 'draw';
    feedback.push({
      type: 'warning',
      category: 'spin',
      message: `Moderate side spin (${Math.round(absSideSpin)} rpm) — noticeable ${shape} expected`,
      tip: 'Check your grip pressure and face angle at address. Small adjustments to face angle at impact can significantly reduce side spin.',
    });
  } else if (absSideSpin > 300) {
    const shape = side_spin > 0 ? 'fade' : 'draw';
    feedback.push({
      type: 'info',
      category: 'spin',
      message: `Light side spin (${Math.round(absSideSpin)} rpm) — slight ${shape} shape`,
      tip: 'A small amount of side spin is normal and can be intentionally shaped. This level is unlikely to cost you significant distance.',
    });
  }

  // ── Club path analysis ─────────────────────────────────────────────────────
  // Path angle determines the initial start direction and influences curve when
  // combined with face angle. A straight path (near 0°) is generally ideal.

  if (club_path < -5) {
    feedback.push({
      type: 'warning',
      category: 'path',
      message: `Steep out-to-in club path (${club_path.toFixed(1)}°) — strong fade or slice risk`,
      tip: 'Try dropping your trail shoulder more at the start of the downswing and feel like you are swinging out to the right of the target through impact.',
    });
  } else if (club_path < -2) {
    feedback.push({
      type: 'info',
      category: 'path',
      message: `Slight out-to-in club path (${club_path.toFixed(1)}°) — fade bias`,
      tip: 'A mildly out-to-in path is very common and can produce a controlled fade. It only becomes a problem when combined with a significantly open face.',
    });
  } else if (club_path > 5) {
    feedback.push({
      type: 'warning',
      category: 'path',
      message: `Strong in-to-out club path (${club_path.toFixed(1)}°) — hook risk`,
      tip: 'You may be swinging too far from the inside. Try keeping your trail elbow closer to your body on the downswing to moderate the path.',
    });
  } else if (club_path > 2) {
    feedback.push({
      type: 'info',
      category: 'path',
      message: `Slight in-to-out club path (${club_path.toFixed(1)}°) — draw bias`,
      tip: 'A slight in-to-out path is often intentional for drawing the ball and can increase distance. Pair it with a square face to maximise consistency.',
    });
  }

  // ── Compound: path + side-spin combination ─────────────────────────────────
  // When path and face direction both contribute to the same curve, the effects
  // compound and produce extreme ball flights.

  if (club_path < -2 && side_spin > 1000) {
    feedback.push({
      type: 'warning',
      category: 'path',
      message: 'Classic slice setup: out-to-in path combined with an open face',
      tip: 'Both factors are amplifying the same curve. Prioritise fixing the club path first — a more neutral path often reduces side spin naturally.',
    });
  } else if (club_path > 2 && side_spin < -1000) {
    feedback.push({
      type: 'warning',
      category: 'path',
      message: 'Hook setup: in-to-out path combined with a closed face',
      tip: 'Your path and face angle are both driving a strong right-to-left curve. Focus on keeping the face square through impact while maintaining your path.',
    });
  }

  // ── Launch angle and back-spin — club-specific ─────────────────────────────
  // These ranges only apply to clubs with defined optimal windows (not Putter).

  const config = CLUB_CONFIG[club];
  if (config) {
    if (launch_angle < config.launchMin) {
      feedback.push({
        type: 'warning',
        category: 'trajectory',
        message: `Launch angle too low for ${club} (${launch_angle.toFixed(1)}° — optimal ${config.launchMin}–${config.launchMax}°)`,
        tip: 'A low launch angle reduces carry distance significantly. Check your ball position and make sure you are not excessively de-lofting the club at impact.',
      });
    } else if (launch_angle > config.launchMax) {
      feedback.push({
        type: 'warning',
        category: 'trajectory',
        message: `Launch angle too high for ${club} (${launch_angle.toFixed(1)}° — optimal ${config.launchMin}–${config.launchMax}°)`,
        tip: 'A high launch angle causes the ball to balloon and lose distance. Check for an excessively steep angle of attack or a very low ball position.',
      });
    }

    if (back_spin < config.spinMin) {
      feedback.push({
        type: 'warning',
        category: 'spin',
        message: `Back spin too low for ${club} (${Math.round(back_spin)} rpm — optimal ${config.spinMin}–${config.spinMax} rpm)`,
        tip: 'Low back spin can reduce carry distance and make it harder to hold greens on approach shots. Check your contact point on the clubface.',
      });
    } else if (back_spin > config.spinMax) {
      feedback.push({
        type: 'warning',
        category: 'spin',
        message: `Back spin too high for ${club} (${Math.round(back_spin)} rpm — optimal ${config.spinMin}–${config.spinMax} rpm)`,
        tip: 'Excessive back spin causes the ball to climb too steeply and lose distance. Consider a lower-spinning ball or review your angle of attack.',
      });
    }
  }

  // ── Distance consistency check ─────────────────────────────────────────────

  if (total_distance < carry_distance) {
    feedback.push({
      type: 'warning',
      category: 'distance',
      message: `Total distance (${total_distance} yds) is less than carry distance (${carry_distance} yds)`,
      tip: 'Total distance must be at least equal to carry distance. Please double-check your input values.',
    });
  } else if (total_distance <= carry_distance * 1.02) {
    feedback.push({
      type: 'info',
      category: 'distance',
      message: `Minimal rollout: total (${total_distance} yds) nearly equals carry (${carry_distance} yds)`,
      tip: 'Very little roll is expected with high-spin shots, into-wind conditions, or soft turf. This is normal for wedges and short irons.',
    });
  }

  // ── All-clear ──────────────────────────────────────────────────────────────
  // Only reached when no issues or notes were generated above.

  if (feedback.length === 0) {
    feedback.push({
      type: 'success',
      category: 'general',
      message: 'Your swing metrics look great for this shot!',
      tip: 'All launch conditions are within optimal ranges. Keep up the consistent contact.',
    });
  }

  return feedback;
}

module.exports = { analyzeShot };
