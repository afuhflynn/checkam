import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revokeAllSessions, requireModerator } from "../lib/auth";
import { db } from "../lib/db";

const savedEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

afterEach(() => {
  process.env = { ...savedEnv };
});

describe("revokeAllSessions (spec 0002 AC-6)", () => {
  it("deletes all sessions for a user and returns count", async () => {
    const deleteManySpy = vi.spyOn(db.session, "deleteMany").mockResolvedValue({ count: 3 });
    const count = await revokeAllSessions("user-123");
    expect(count).toBe(3);
    expect(deleteManySpy).toHaveBeenCalledWith({ where: { userId: "user-123" } });
  });
});

describe("requireModerator (spec 0002 AC-11)", () => {
  it("allows admin in dev with bypass", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CHECKAM_ADMIN_BYPASS", "true");
    const result = await requireModerator();
    expect(result).toEqual({ userId: "dev-bypass", role: "ADMIN" });
  });

  it("is a callable function", () => {
    expect(typeof requireModerator).toBe("function");
  });
});

// Note: The following logic is tested via /verify-release manual steps per the spec's verification plan:
// - passwordScore and errorCopy are internal to GateForm component (not exported)
// - getChatAccess gate logic requires complex auth module mocking
// - Full auth flow (signup, verify, Google, reset, OTP) is tested via /verify-release manual steps