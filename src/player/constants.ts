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
/** Max height for auto-step onto terrain; collidable tops always require a jump. */
export const MAX_STEP_HEIGHT = 1.8;
export const LAND_SNAP_TOLERANCE = 0.4;
/** Extra XZ leeway when snapping onto a box top (lip / corner landings). */
export const BOX_TOP_EDGE_GRACE = 0.2;
/** Vertical window around a box top for lip clearance and swept landing. */
export const BOX_TOP_LAND_MARGIN = 0.11;
/** Feet within this of terrain surface → follow ground height. */
export const TERRAIN_STICK_FEET = 0.25;
