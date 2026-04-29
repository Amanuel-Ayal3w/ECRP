import { describe, expect, it } from "vitest";
import {
  assertTransition,
  CANCELABLE_STATUSES,
  TransitionError,
  validateTransition,
} from "./state-machine";

describe("validateTransition", () => {
  describe("requested", () => {
    it("match → matched", () => {
      const r = validateTransition("requested", "match");
      expect(r.valid).toBe(true);
      expect(r.nextStatus).toBe("matched");
    });
    it("accept → accepted", () => {
      const r = validateTransition("requested", "accept");
      expect(r.valid).toBe(true);
      expect(r.nextStatus).toBe("accepted");
    });
    it("reject → requested (stays)", () => {
      const r = validateTransition("requested", "reject");
      expect(r.valid).toBe(true);
      expect(r.nextStatus).toBe("requested");
    });
    it("cancel → cancelled", () => {
      const r = validateTransition("requested", "cancel");
      expect(r.valid).toBe(true);
      expect(r.nextStatus).toBe("cancelled");
    });
    it("start → invalid", () => {
      const r = validateTransition("requested", "start");
      expect(r.valid).toBe(false);
      expect(r.nextStatus).toBeNull();
      expect(r.reason).toMatch(/start/);
    });
    it("complete → invalid", () => {
      const r = validateTransition("requested", "complete");
      expect(r.valid).toBe(false);
    });
  });

  describe("matched", () => {
    it("accept → accepted", () => {
      expect(validateTransition("matched", "accept").nextStatus).toBe("accepted");
    });
    it("reject → requested", () => {
      expect(validateTransition("matched", "reject").nextStatus).toBe("requested");
    });
    it("cancel → cancelled", () => {
      expect(validateTransition("matched", "cancel").nextStatus).toBe("cancelled");
    });
    it("start → invalid", () => {
      expect(validateTransition("matched", "start").valid).toBe(false);
    });
  });

  describe("accepted", () => {
    it("start → in_progress", () => {
      expect(validateTransition("accepted", "start").nextStatus).toBe("in_progress");
    });
    it("cancel → cancelled", () => {
      expect(validateTransition("accepted", "cancel").nextStatus).toBe("cancelled");
    });
    it("complete → completed (allowed without explicit start)", () => {
      expect(validateTransition("accepted", "complete").valid).toBe(true);
      expect(validateTransition("accepted", "complete").nextStatus).toBe("completed");
    });
  });

  describe("in_progress", () => {
    it("complete → completed", () => {
      expect(validateTransition("in_progress", "complete").nextStatus).toBe("completed");
    });
    it("cancel → cancelled", () => {
      expect(validateTransition("in_progress", "cancel").nextStatus).toBe("cancelled");
    });
    it("start → invalid (already started)", () => {
      expect(validateTransition("in_progress", "start").valid).toBe(false);
    });
  });

  describe("terminal states", () => {
    it("completed + any event → invalid", () => {
      for (const event of ["match", "accept", "reject", "start", "complete", "cancel"] as const) {
        expect(validateTransition("completed", event).valid).toBe(false);
      }
    });
    it("cancelled + any event → invalid", () => {
      for (const event of ["match", "accept", "reject", "start", "complete", "cancel"] as const) {
        expect(validateTransition("cancelled", event).valid).toBe(false);
      }
    });
  });
});

describe("assertTransition", () => {
  it("returns next status on valid transition", () => {
    expect(assertTransition("accepted", "start")).toBe("in_progress");
  });

  it("throws TransitionError on invalid transition", () => {
    expect(() => assertTransition("completed", "cancel")).toThrow(TransitionError);
  });

  it("thrown error message includes the blocked event and status", () => {
    expect(() => assertTransition("in_progress", "accept")).toThrowError(/accept/);
  });
});

describe("CANCELABLE_STATUSES", () => {
  it("includes requested, matched, accepted, in_progress", () => {
    expect(CANCELABLE_STATUSES.has("requested")).toBe(true);
    expect(CANCELABLE_STATUSES.has("matched")).toBe(true);
    expect(CANCELABLE_STATUSES.has("accepted")).toBe(true);
    expect(CANCELABLE_STATUSES.has("in_progress")).toBe(true);
  });

  it("excludes terminal states", () => {
    expect(CANCELABLE_STATUSES.has("completed")).toBe(false);
    expect(CANCELABLE_STATUSES.has("cancelled")).toBe(false);
  });
});
