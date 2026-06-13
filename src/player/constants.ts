/** Player movement and collision tuning. */
export const GRAVITY = 30;
export const JUMP_VELOCITY = 12;
export const MOVE_SPEED = 25;

export const PLAYER_HEIGHT = 3;
export const PLAYER_RADIUS = 0.55;
export const PLAYER_HEAD_OFFSET = 0.15;
export const PLAYER_FEET_OFFSET = 2.85;
export const PLAYER_EYE_HEIGHT = 3.0;

export const WALL_FRICTION = 0.82;
export const MAX_STEP_HEIGHT = 1.8;
export const LAND_SNAP_TOLERANCE = 0.4;
export const FLOOR_MARGIN = 0.5;
/** Feet must be this far above sampled terrain to count as airborne. */
export const AIRBORNE_FEET_CLEARANCE = 0.35;
/** Feet within this of terrain surface → follow ground height. */
export const TERRAIN_STICK_FEET = 0.25;
