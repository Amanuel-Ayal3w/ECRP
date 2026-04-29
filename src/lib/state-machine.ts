export type RideStatus =
  | "requested"
  | "matched"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RideEvent =
  | "match"
  | "accept"
  | "reject"
  | "start"
  | "complete"
  | "cancel";

const TRANSITIONS: Partial<Record<RideStatus, Partial<Record<RideEvent, RideStatus>>>> = {
  requested: {
    match:   "matched",
    accept:  "accepted",
    reject:  "requested",
    cancel:  "cancelled",
  },
  matched: {
    accept:  "accepted",
    reject:  "requested",
    cancel:  "cancelled",
  },
  accepted: {
    start:    "in_progress",
    complete: "completed",
    cancel:   "cancelled",
  },
  in_progress: {
    complete: "completed",
    cancel:   "cancelled",
  },
  completed:  {},
  cancelled:  {},
};

export interface TransitionResult {
  valid: boolean;
  nextStatus: RideStatus | null;
  reason: string | null;
}

export function validateTransition(
  currentStatus: RideStatus,
  event: RideEvent,
): TransitionResult {
  const stateMap = TRANSITIONS[currentStatus];
  if (!stateMap) {
    return { valid: false, nextStatus: null, reason: `Unknown status: ${currentStatus}` };
  }

  const next = stateMap[event];
  if (!next) {
    return {
      valid: false,
      nextStatus: null,
      reason: `Cannot apply event "${event}" to a ride in status "${currentStatus}".`,
    };
  }

  return { valid: true, nextStatus: next, reason: null };
}

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

export function assertTransition(currentStatus: RideStatus, event: RideEvent): RideStatus {
  const result = validateTransition(currentStatus, event);
  if (!result.valid || !result.nextStatus) {
    throw new TransitionError(result.reason ?? "Invalid transition");
  }
  return result.nextStatus;
}

export const CANCELABLE_STATUSES = new Set<RideStatus>(["requested", "matched", "accepted", "in_progress"]);
export const ACCEPTABLE_STATUSES = new Set<RideStatus>(["requested", "matched"]);
