import { ActiveTenGod } from './utils/activeTenGods.util';

export interface Forecast14Day {
  // Dominant element and active patterns (most frequent across 14 days)
  dominantData: {
    monthlyElements: Array<{
      element: string; // e.g., "WOOD-O"
      emoji: string;
      percentage: number; // Percentage of days this element appears (if month boundary crossed)
    }>; // Array to handle month boundary crossings (usually 1-2 elements)
    activeTenGods: Array<{
      tenGod: ActiveTenGod;
      occurrenceCount: number; // How many days this Ten God appears
      percentage: number; // Percentage of 14 days
    }>;
    activePatterns: Array<{
      pattern: string; // Pattern name
      occurrenceCount: number;
      percentage: number;
    }>;
  };

  // LLM-generated phase analysis
  phases: Array<{
    days: string; // e.g., "Day 1-5", "Day 6-10", "Day 11-14"
    theme: string; // Theme title for this phase
    overview: string; // Brief overview (max 50 words)
    focusAreas: string[]; // Actionable focus areas (max 4 items)
  }>;

  // 14-day calendar
  calendar: Array<{
    date: string; // YYYY-MM-DD
    element: string; // e.g., "WOOD-O"
    elementEmoji: string;
    animal: string; // e.g., "Horse"
    animalEmoji: string;
    isPeak: boolean; // Whether this is a peak day
    isWorst: boolean; // Whether this is a worst day (lowest overall score)
  }>;

  // Best/Worst days for each category
  bestDays: {
    career: Array<{
      date: string; // YYYY-MM-DD
      score: number;
      reason: string; // Brief explanation without BaZi terms
    }>;
    relationship: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    creativity: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    wealth: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    health: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    rest: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
  };
  worstDays: {
    career: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    relationship: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    creativity: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    wealth: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    health: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
    rest: Array<{
      date: string;
      score: number;
      reason: string;
    }>;
  };
}
