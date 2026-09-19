import { create } from "zustand";

const KEY = "vero-recruiter-passcode";

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// ponytail: shared passcode gate until Convex Auth (U11); every recruiter function re-checks it server-side.
export const usePasscode = create<{
  passcode: string | null;
  restored: boolean;
  set: (p: string | null) => void;
  restore: () => void;
}>((set) => ({
  passcode: null,
  restored: false,
  set: (passcode) => {
    try {
      if (passcode) sessionStorage.setItem(KEY, passcode);
      else sessionStorage.removeItem(KEY);
    } catch {
      // storage blocked: the passcode lasts for this page only
    }
    set({ passcode });
  },
  restore: () => set({ passcode: read(), restored: true }),
}));
