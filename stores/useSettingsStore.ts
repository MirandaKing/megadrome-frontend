import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SLIPPAGE, DEFAULT_DEADLINE_MINUTES } from "@/lib/constants";

interface SettingsState {
  slippage: number;
  deadline: number; // in minutes
  setSlippage: (value: number) => void;
  setDeadline: (value: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      slippage: DEFAULT_SLIPPAGE,
      deadline: DEFAULT_DEADLINE_MINUTES,
      setSlippage: (value) => set({ slippage: value }),
      setDeadline: (value) => set({ deadline: value }),
    }),
    {
      name: "solidly-settings",
    }
  )
);
