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
// Club configuration – optimal launch angle (°) and back-spin (rpm) windows,
// plus the minimum smash factor (ball speed ÷ club speed) for a solid strike
// ---------------------------------------------------------------------------
// Putter is intentionally absent because launch angle and back-spin are not
// meaningful metrics for putting strokes.
const CLUB_CONFIG = {
  'Driver':         { launchMin: 10, launchMax: 15, spinMin:  2000, spinMax:  2800, smashMin: 1.44 },
  '3-Wood':         { launchMin:  8, launchMax: 12, spinMin:  3000, spinMax:  4000, smashMin: 1.42 },
  '5-Wood':         { launchMin: 10, launchMax: 14, spinMin:  3500, spinMax:  4500, smashMin: 1.40 },
  '7-Wood':         { launchMin: 10, launchMax: 14, spinMin:  3500, spinMax:  5000, smashMin: 1.38 },
  '2-Iron':         { launchMin: 10, launchMax: 14, spinMin:  3500, spinMax:  5500, smashMin: 1.37 },
  '3-Iron':         { launchMin: 11, launchMax: 15, spinMin:  4000, spinMax:  6000, smashMin: 1.36 },
  '4-Iron':         { launchMin: 12, launchMax: 16, spinMin:  4500, spinMax:  6500, smashMin: 1.35 },
  '5-Iron':         { launchMin: 14, launchMax: 19, spinMin:  5000, spinMax:  7000, smashMin: 1.34 },
  '6-Iron':         { launchMin: 16, launchMax: 21, spinMin:  5500, spinMax:  7500, smashMin: 1.33 },
  '7-Iron':         { launchMin: 18, launchMax: 23, spinMin:  6000, spinMax:  8000, smashMin: 1.32 },
  '8-Iron':         { launchMin: 20, launchMax: 25, spinMin:  6500, spinMax:  8500, smashMin: 1.30 },
  '9-Iron':         { launchMin: 22, launchMax: 27, spinMin:  7000, spinMax:  9500, smashMin: 1.28 },
  'Pitching Wedge': { launchMin: 24, launchMax: 30, spinMin:  8000, spinMax: 10000, smashMin: 1.24 },
  'Gap Wedge':      { launchMin: 26, launchMax: 33, spinMin:  9000, spinMax: 11500, smashMin: 1.22 },
  'Sand Wedge':     { launchMin: 28, launchMax: 35, spinMin:  9500, spinMax: 12000, smashMin: 1.20 },
  'Lob Wedge':      { launchMin: 30, launchMax: 38, spinMin: 10000, spinMax: 13000, smashMin: 1.18 },
};

// ---------------------------------------------------------------------------
// analyzeShot
// ---------------------------------------------------------------------------
/**
 * Analyse a single shot and return an array of feedback items.
 *
 * @param {Object} shot - A normalised shot row with numeric fields
 * @param {string} shot.club
 * @param {number} shot.ball_speed     - mph
 * @param {number|null} shot.club_speed - mph (optional)
 * @param {number|null} shot.face_angle - degrees (optional, positive = open)
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
    ball_speed,
    club_speed,
    face_angle,
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

  // ── Face-to-path — only when face angle was recorded ───────────────────────
  // Face angle minus path decides which way the ball curves and how much.
  // Positive = face open to path (fade/slice), negative = closed (draw/hook).

  if (isNumber(face_angle) && isNumber(club_path)) {
    const faceToPath = face_angle - club_path;
    const absFtp = Math.abs(faceToPath);
    const shape = faceToPath > 0 ? 'fade/slice' : 'draw/hook';
    const relation = faceToPath > 0 ? 'open' : 'closed';

    if (absFtp > 4) {
      feedback.push({
        type: 'warning',
        category: 'face',
        message: `Face ${absFtp.toFixed(1)}° ${relation} to path — strong ${shape} curve`,
        tip: 'The gap between where the face points and where the club travels is what curves the ball. Work on matching face to path rather than changing the path alone.',
      });
    } else if (absFtp > 2) {
      feedback.push({
        type: 'info',
        category: 'face',
        message: `Face ${absFtp.toFixed(1)}° ${relation} to path — ${shape} shape`,
        tip: 'A face-to-path gap of 2–4° gives a playable, predictable curve. Under 2° flies close to straight.',
      });
    }
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

  // ── Smash factor — strike quality, only when club speed was recorded ──────
  // Smash factor = ball speed ÷ club speed. A low value at a normal club speed
  // means energy was lost to an off-centre strike.

  if (config && isNumber(club_speed) && club_speed > 0 && isNumber(ball_speed)) {
    const smash = ball_speed / club_speed;

    if (smash > 1.52) {
      feedback.push({
        type: 'warning',
        category: 'strike',
        message: `Smash factor ${smash.toFixed(2)} is higher than physically likely`,
        tip: 'The rules cap smash factor at about 1.50. Double-check that ball speed and club speed were entered the right way round.',
      });
    } else if (smash < config.smashMin - 0.05) {
      feedback.push({
        type: 'warning',
        category: 'strike',
        message: `Poor strike: smash factor ${smash.toFixed(2)} (target ${config.smashMin.toFixed(2)}+ for ${club})`,
        tip: 'A lot of speed was lost at impact, which usually means an off-centre hit. Spray foot powder on the face to see where you are making contact.',
      });
    } else if (smash < config.smashMin) {
      feedback.push({
        type: 'info',
        category: 'strike',
        message: `Slightly off-centre: smash factor ${smash.toFixed(2)} (target ${config.smashMin.toFixed(2)}+ for ${club})`,
        tip: 'Close to a solid strike. Small misses toward the heel or toe cost a few yards and add curve.',
      });
    } else {
      feedback.push({
        type: 'success',
        category: 'strike',
        message: `Solid strike: smash factor ${smash.toFixed(2)}`,
        tip: `You transferred speed efficiently for a ${club}. Ball speed of ${Math.round(ball_speed)} mph from ${Math.round(club_speed)} mph club speed.`,
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

// ---------------------------------------------------------------------------
// Shaft fit
// ---------------------------------------------------------------------------

/** Fewer shots than this and averages are too noisy to judge a shaft. */
const MIN_SHOTS_FOR_FIT = 10;

/** Flex order from softest to stiffest; index distance = how far off a flex is. */
const FLEX_ORDER = ['L', 'A', 'R', 'S', 'X'];

/**
 * Driver club-speed bands (mph) for each flex. Rough industry guide only –
 * tempo and transition matter too, which a launch monitor can't measure.
 */
const FLEX_BANDS = [
  { flex: 'L', max: 72 },
  { flex: 'A', max: 84 },
  { flex: 'R', max: 96 },
  { flex: 'S', max: 105 },
  { flex: 'X', max: Infinity },
];

/**
 * Convert a club's speed to a driver-equivalent speed so one set of flex bands
 * works for every club. A golfer's 7-iron is typically ~15 mph slower than
 * their driver.
 * @param {string} club
 * @param {number} speed - mph
 * @returns {number|null} null for clubs where shaft fit isn't judged (Putter)
 */
function driverEquivalentSpeed(club, speed) {
  if (club === 'Driver') return speed;
  if (club.endsWith('Wood')) return speed + 7;
  if (club.endsWith('Iron')) return speed + 15;
  if (club.endsWith('Wedge')) return speed + 20;
  return null;
}

/**
 * Recommended shaft weight window (grams) for a club and driver-equivalent
 * speed. Woods use graphite weights; irons use the wider steel/graphite range.
 * @param {string} club
 * @param {number} driverSpeed - mph
 * @returns {{ min: number, max: number }}
 */
function recommendedWeight(club, driverSpeed) {
  const isWood = club === 'Driver' || club.endsWith('Wood');
  if (isWood) {
    if (driverSpeed < 85) return { min: 40, max: 55 };
    if (driverSpeed <= 100) return { min: 55, max: 65 };
    return { min: 65, max: 80 };
  }
  if (driverSpeed < 85) return { min: 50, max: 85 };
  if (driverSpeed <= 100) return { min: 85, max: 110 };
  return { min: 105, max: 130 };
}

/**
 * Judge whether a club + shaft setup suits the golfer, using averages from all
 * shots logged against it.
 *
 * @param {Object} config - club_configs row (club, shaft_flex, shaft_weight_g, …)
 * @param {Object} stats  - aggregated shot stats for this setup
 * @param {number} stats.shots
 * @param {number|null} stats.club_speed_avg
 * @param {number|null} stats.club_speed_sd
 * @param {number|null} stats.smash_avg
 * @param {number|null} stats.launch_avg
 * @param {number|null} stats.spin_avg
 * @param {number|null} stats.carry_avg
 * @param {number|null} stats.carry_sd
 * @param {number|null} stats.offline_avg - negative = left
 * @param {number|null} stats.offline_sd
 *
 * @returns {{ type: string, category: string, message: string, tip: string }[]}
 */
function analyzeShaftFit(config, stats) {
  const feedback = [];
  const clubConfig = CLUB_CONFIG[config.club];

  if (!clubConfig) {
    feedback.push({
      type: 'info',
      category: 'shaft',
      message: `Shaft fit isn't analysed for ${config.club}`,
      tip: 'Putter fitting depends on feel and stroke style rather than launch data.',
    });
    return feedback;
  }

  if (stats.shots < MIN_SHOTS_FOR_FIT) {
    const needed = MIN_SHOTS_FOR_FIT - stats.shots;
    feedback.push({
      type: 'info',
      category: 'shaft',
      message: `Log ${needed} more shot${needed === 1 ? '' : 's'} with this setup for a shaft verdict`,
      tip: `At least ${MIN_SHOTS_FOR_FIT} shots are needed so one good or bad swing doesn't skew the averages.`,
    });
    return feedback;
  }

  // ── Flex and weight vs club speed ──────────────────────────────────────────

  if (!isNumber(stats.club_speed_avg)) {
    feedback.push({
      type: 'info',
      category: 'shaft',
      message: 'Add club speed to your shots to check flex and weight',
      tip: 'Club speed is the starting point for choosing shaft flex and weight.',
    });
  } else {
    const driverSpeed = driverEquivalentSpeed(config.club, stats.club_speed_avg);
    const band = FLEX_BANDS.find((b) => driverSpeed <= b.max);
    const recommendedIdx = FLEX_ORDER.indexOf(band.flex);
    const actualIdx = FLEX_ORDER.indexOf(config.shaft_flex);
    const speedText = `${stats.club_speed_avg.toFixed(1)} mph average club speed`;

    // Within 3 mph of a band edge, the neighbouring flex is also reasonable.
    const lowerEdge = recommendedIdx > 0 ? FLEX_BANDS[recommendedIdx - 1].max : -Infinity;
    const nearEdge = (actualIdx === recommendedIdx + 1 && band.max - driverSpeed <= 3)
      || (actualIdx === recommendedIdx - 1 && driverSpeed - lowerEdge <= 3);

    if (actualIdx === recommendedIdx) {
      feedback.push({
        type: 'success',
        category: 'shaft',
        message: `${config.shaft_flex} flex matches your speed (${speedText})`,
        tip: 'Your flex is in the usual range for your speed. Use ball flight and dispersion below to fine-tune.',
      });
    } else if (nearEdge) {
      feedback.push({
        type: 'info',
        category: 'shaft',
        message: `${config.shaft_flex} flex is borderline for ${speedText}`,
        tip: `You're near the line between ${FLEX_ORDER[Math.min(actualIdx, recommendedIdx)]} and ${FLEX_ORDER[Math.max(actualIdx, recommendedIdx)]}. An aggressive transition suits the stiffer option; a smooth tempo suits the softer one.`,
      });
    } else if (actualIdx > recommendedIdx) {
      feedback.push({
        type: 'warning',
        category: 'shaft',
        message: `${config.shaft_flex} flex may be too stiff (${speedText} suggests ${band.flex})`,
        tip: 'A shaft that is too stiff tends to launch low, spin less and leave the face open (misses to the right). Try a softer flex and compare.',
      });
    } else {
      feedback.push({
        type: 'warning',
        category: 'shaft',
        message: `${config.shaft_flex} flex may be too soft (${speedText} suggests ${band.flex})`,
        tip: 'A shaft that is too soft tends to launch high, spin more and close the face (misses to the left). Try a stiffer flex and compare.',
      });
    }

    if (isNumber(config.shaft_weight_g)) {
      const weight = recommendedWeight(config.club, driverSpeed);
      if (config.shaft_weight_g < weight.min - 5) {
        feedback.push({
          type: 'info',
          category: 'shaft',
          message: `${config.shaft_weight_g} g shaft is light for your speed (typical ${weight.min}–${weight.max} g)`,
          tip: 'Shafts that are too light can make tempo quick and inconsistent. A heavier shaft often tightens dispersion.',
        });
      } else if (config.shaft_weight_g > weight.max + 5) {
        feedback.push({
          type: 'info',
          category: 'shaft',
          message: `${config.shaft_weight_g} g shaft is heavy for your speed (typical ${weight.min}–${weight.max} g)`,
          tip: 'Shafts that are too heavy can cost club speed and leave the face open. A lighter shaft may add speed.',
        });
      }
    }
  }

  // ── Ball flight pattern — only judged on solid strikes ─────────────────────
  // Mishits change launch and spin regardless of the shaft, so poor average
  // contact makes the pattern meaningless.

  if (isNumber(stats.smash_avg) && stats.smash_avg < clubConfig.smashMin - 0.03) {
    feedback.push({
      type: 'info',
      category: 'shaft',
      message: `Strike quality too low to judge the shaft (average smash ${stats.smash_avg.toFixed(2)})`,
      tip: 'Off-centre contact is affecting launch and spin more than the shaft is. Improve contact first, then re-test.',
    });
  } else if (isNumber(stats.launch_avg) && isNumber(stats.spin_avg)) {
    const highFlight = stats.launch_avg > clubConfig.launchMax && stats.spin_avg > clubConfig.spinMax;
    const lowFlight = stats.launch_avg < clubConfig.launchMin && stats.spin_avg < clubConfig.spinMin;
    const missesLeft = isNumber(stats.offline_avg) && stats.offline_avg < -5;
    const missesRight = isNumber(stats.offline_avg) && stats.offline_avg > 5;
    const flightText = `${stats.launch_avg.toFixed(1)}° launch, ${Math.round(stats.spin_avg)} rpm`;

    if (highFlight) {
      feedback.push({
        type: 'warning',
        category: 'shaft',
        message: `High launch and spin (${flightText})${missesLeft ? ' with misses left' : ''} — shaft may be too soft or light`,
        tip: missesLeft
          ? 'High, spinny shots that miss left are the classic sign of a shaft that is too soft. Test a stiffer or heavier shaft, or a higher kick point.'
          : 'Before changing shafts, check ball position and angle of attack. If those are fine, test a stiffer shaft or a higher kick point.',
      });
    } else if (lowFlight) {
      feedback.push({
        type: 'warning',
        category: 'shaft',
        message: `Low launch and spin (${flightText})${missesRight ? ' with misses right' : ''} — shaft may be too stiff or heavy`,
        tip: missesRight
          ? 'Low shots that miss right are the classic sign of a shaft that is too stiff. Test a softer or lighter shaft, or a lower kick point.'
          : 'Before changing shafts, check that you are not de-lofting too much. If not, test a softer shaft or a lower kick point.',
      });
    } else {
      feedback.push({
        type: 'success',
        category: 'shaft',
        message: `Ball flight is in range for ${config.club} (${flightText})`,
        tip: 'Launch and spin look right, so this shaft is not holding your ball flight back.',
      });
    }
  }

  // ── Consistency ────────────────────────────────────────────────────────────
  // A good shaft fit shows up as a tight spread more than as raw distance.

  if (isNumber(stats.carry_sd) && isNumber(stats.carry_avg) && stats.carry_avg > 0
      && stats.carry_sd / stats.carry_avg > 0.06) {
    feedback.push({
      type: 'warning',
      category: 'consistency',
      message: `Carry distance varies a lot (±${stats.carry_sd.toFixed(1)} yds)`,
      tip: 'Large carry gaps can mean you struggle to time this shaft. Compare against another shaft to see if the spread tightens.',
    });
  }

  if (isNumber(stats.offline_sd) && isNumber(stats.carry_avg) && stats.carry_avg > 0
      && stats.offline_sd > stats.carry_avg * 0.07) {
    feedback.push({
      type: 'warning',
      category: 'consistency',
      message: `Wide left-right spread (±${stats.offline_sd.toFixed(1)} yds)`,
      tip: 'Inconsistent direction often comes from the face arriving at a different angle each swing. A shaft with lower torque or a different weight may help.',
    });
  }

  if (isNumber(stats.club_speed_sd) && stats.club_speed_sd > 3) {
    feedback.push({
      type: 'info',
      category: 'consistency',
      message: `Club speed varies by ±${stats.club_speed_sd.toFixed(1)} mph`,
      tip: 'Changing effort between swings makes shaft comparisons less reliable. Try to swing at the same effort for every test shot.',
    });
  }

  return feedback;
}

/**
 * True for finite numbers. Lets rules skip optional fields that are null.
 * @param {unknown} value
 * @returns {boolean}
 */
function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

module.exports = { analyzeShot, analyzeShaftFit, MIN_SHOTS_FOR_FIT };
