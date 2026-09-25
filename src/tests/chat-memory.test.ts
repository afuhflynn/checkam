import { describe, expect, it } from "vitest";
import { doualaDayStart } from "../lib/chat/day";
import { decodeCursor, encodeCursor, issueUndoToken, readUndoToken } from "../lib/chat/tokens";

describe("chat cursor codec", () => {
  it("roundtrips pinned, timestamp, and id", () => {
    const stamp = new Date("2026-09-25T10:00:00.000Z").toISOString();
    const raw = encodeCursor({ pinned: true, updatedAt: stamp, id: "abc123" });
    expect(decodeCursor(raw)).toEqual({ pinned: true, updatedAt: stamp, id: "abc123" });
  });

  it("rejects garbage, truncation, and wrong shapes", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
    expect(decodeCursor(encodeCursor({ pinned: false, updatedAt: "x", id: "y" }))).not.toBeNull();
    const bad = Buffer.from(JSON.stringify({ pinned: true })).toString("base64url");
    expect(decodeCursor(bad)).toBeNull();
  });
});

describe("chat undo tokens", () => {
  it("issues a readable token carrying type, id, and stamp", () => {
    const stamp = Date.now();
    const token = issueUndoToken("session", "ses_1", stamp);
    expect(readUndoToken(token)).toEqual({
      type: "session",
      id: "ses_1",
      ts: stamp,
      exp: expect.any(Number),
    });
  });

  it("supports folder cascades", () => {
    const token = issueUndoToken("folder", "fol_9");
    expect(readUndoToken(token)?.type).toBe("folder");
  });

  it("rejects tampered tokens", () => {
    const token = issueUndoToken("session", "ses_1");
    expect(readUndoToken(`${token}z`)).toBeNull();
    expect(readUndoToken("session.ses_1.1.2")).toBeNull();
    expect(readUndoToken("chat.ses_1.1.9999999999999.deadbeef")).toBeNull();
  });

  it("rejects expired tokens", () => {
    // Craft an expired token by hand to prove the gate.
    const token = issueUndoToken("session", "ses_old");
    const parts = token.split(".");
    const expiredExp = String(Date.now() - 1000);
    const body = `${parts[0]}.${parts[1]}.${parts[2]}.${expiredExp}`;
    expect(readUndoToken(`${body}.${parts[4]}`)).toBeNull();
  });
});

describe("douala day start", () => {
  it("returns Douala midnight as a UTC instant", () => {
    expect(doualaDayStart(new Date("2026-09-25T12:00:00.000Z")).toISOString()).toBe(
      "2026-09-24T23:00:00.000Z",
    );
  });

  it("holds across the year boundary", () => {
    expect(doualaDayStart(new Date("2026-01-01T00:30:00.000Z")).toISOString()).toBe(
      "2025-12-31T23:00:00.000Z",
    );
  });
});
