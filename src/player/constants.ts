/** Player movement and collision tuning. */
export const GRAVITY = 30;
export const JUMP_VELOCITY = 12;

/**
 * Base walk speed (0.5× of the pre-sprint MOVE_SPEED=25).
 * Sprint is ~1.92× walk speed for a strong but controlled burst.
 */
export const WALK_SPEED = 12.5;
export const SPRINT_SPEED = 24;

/** Stamina (0-100). Full sprint lasts a sensible ~4.5 s before forced slowdown. */
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_RATE = 22;           // per second while sprinting on ground
export const STAMINA_REGEN_RATE = 28;           // per second when not sprinting
export const STAMINA_REGEN_STATIONARY_MULT = 1.6; // faster regen when standing still

/** Exponential ramp (1 - exp(-delta/tau)). Smaller tau = faster approach. */
export const SPRINT_RAMP_TAU = 0.65;   // time to feel "at full sprint momentum"
export const SPRINT_DECEL_TAU = 0.25;  // faster slowdown when releasing sprint or out of stamina

/** Hysteresis to avoid flicker at the stamina boundary. */
export const MIN_STAMINA_TO_SPRINT = 18;
export const STAMINA_RESTORE_THRESHOLD = 30;

export const PLAYER_HEIGHT = 3;
export const PLAYER_RADIUS = 0.55;
export const PLAYER_HEAD_OFFSET = 0.15;
export const PLAYER_FEET_OFFSET = 2.85;
export const PLAYER_EYE_HEIGHT = 3.0;

export const WALL_FRICTION = 0.82;
export const LAND_SNAP_TOLERANCE = 0.4;
/** Extra XZ leeway when snapping onto a box top (lip / corner landings). */
export const BOX_TOP_EDGE_GRACE = 0.27;
/** Vertical window around a box top for lip clearance and swept landing. */
export const BOX_TOP_LAND_MARGIN = 0.13;
/** Feet within this of terrain surface → attach when approaching from air. */
export const TERRAIN_STICK_FEET = 0.25;

/** Looser ceiling while already grounded — prevents onSurface flicker when smoothed height lags after landing. */
export const TERRAIN_STICK_LEAVE = 0.55;

/** Low-pass time constants for smoothed ground height (feet Y), not eye Y directly.
 *  Uphill uses a faster tau so the camera does not sink into rises while sprinting;
 *  downhill uses a slower tau to damp triangle-edge pops on the procedural mesh. */
export const TERRAIN_GROUND_SMOOTH_TAU_UP = 0.09;
export const TERRAIN_GROUND_SMOOTH_TAU_DOWN = 0.24;

/** Max allowed lag of smoothed ground below the sampled height when climbing (prevents visible foot sink). */
export const TERRAIN_MAX_SINK = 0.1;

/** Box-top resting / landing tolerances (feet relative to box.max.y). */
export const BOX_REST_STEP_MIN = -0.03;
export const BOX_REST_STEP_MAX = 0.08;
export const BOX_REST_FEET_MARGIN = 0.05;
export const ON_TERRAIN_FEET_ABOVE = 0.2;
export const FEET_RESTING_STEP_MIN = -0.08;
export const FEET_RESTING_STEP_MAX = 0.2;
export const FEET_ON_BOX_MARGIN = 0.1;

/** Terrain penetration recovery and stick bands. */
export const TERRAIN_PENETRATION_TOLERANCE = 0.05;
export const TERRAIN_STICK_BELOW = -0.15;
export const TERRAIN_SAMPLE_MOVE_THRESHOLD = 0.02;
export const TERRAIN_SAMPLE_PRIMARY_WEIGHT = 0.65;
export const TERRAIN_SAMPLE_MIDPOINT_WEIGHT = 0.35;

/** Vertical velocity above which the player is treated as rising (blocks terrain stick). */
export const RISING_VELOCITY_THRESHOLD = 0.1;

/** Third-person view tuning (hold C). */
export const THIRD_PERSON_DISTANCE = 4.2;
export const THIRD_PERSON_HEIGHT = 1.7;
export const THIRD_PERSON_TRANSITION_TAU = 0.22;
/** Low-pass smoothing during the FP↔TP camera blend. */
export const THIRD_PERSON_POSITION_SMOOTH_TAU = 0.05;
