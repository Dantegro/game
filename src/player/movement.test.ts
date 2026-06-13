import { describe, expect, it } from "vitest";
import { JUMP_VELOCITY } from "./constants.js";
import { createMovementState, tryConsumeJump } from "./movement.js";

describe("tryConsumeJump", () => {
  it("applies jump velocity and clears canJump when grounded", () => {
    const state = createMovementState();

    const consumed = tryConsumeJump(state, true);

    expect(consumed).toBe(true);
    expect(state.velocityY).toBe(JUMP_VELOCITY);
    expect(state.canJump).toBe(false);
  });

  it("does not jump when already airborne", () => {
    const state = createMovementState();
    state.canJump = false;
    state.velocityY = -3;

    const consumed = tryConsumeJump(state, true);

    expect(consumed).toBe(false);
    expect(state.velocityY).toBe(-3);
  });

  it("does not jump when space is not pressed", () => {
    const state = createMovementState();

    const consumed = tryConsumeJump(state, false);

    expect(consumed).toBe(false);
    expect(state.velocityY).toBe(0);
    expect(state.canJump).toBe(true);
  });

  it("allows a second consume after floor resolve restores canJump", () => {
    const state = createMovementState();

    expect(tryConsumeJump(state, true)).toBe(true);
    state.canJump = true;

    expect(tryConsumeJump(state, true)).toBe(true);
    expect(state.velocityY).toBe(JUMP_VELOCITY);
  });
});
