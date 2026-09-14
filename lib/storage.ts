import type { AppState } from "./types";

export const STORAGE_KEY = "fan-dian-demo-state-v1";

export function createInitialState(): AppState {
  return {
    profile: null,
    activeRequest: null,
    activeCandidateId: null,
    pendingResponse: "none",
    matchedCandidateId: null,
    rejectedCandidateIds: [],
    blockedIds: [],
    records: [],
    messages: [],
    reports: [],
  };
}

export function loadState(): AppState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

export function saveState(state: AppState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
