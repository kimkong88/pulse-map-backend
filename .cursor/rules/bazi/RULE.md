---
description: 'This rule provides API usage and the type definition required to use aharris02/bazi-calculator-by-alvamind library'
alwaysApply: false
---

Here is API example for aharris02/bazi-calculator-by-alvamind library

---

class BaziCalculator {
constructor(
birthDateTime: Date, // Timezone-aware Date object (use date-fns-tz's toDate)
genderInput?: string, // 'male', 'female' (other inputs default to 'female')
timezoneInput?: string, // IANA timezone string (defaults to 'UTC')
isTimeKnownInput?: boolean // Whether the exact hour/minute are known (defaults to true)
);

// Main Natal Chart methods
calculatePillars(): Pillars | null;
calculateLuckPillars(): LuckPillarsResult | null;
calculateBasicAnalysis(): BasicAnalysis | null;
getCompleteAnalysis(): CompleteAnalysis | null; // Recommended for full natal chart
toString(): string; // Returns the Four Pillars as a Chinese string

// Timed Analysis methods
getAnalysisForDate(
targetDate: Date,
targetTimezone: string, // IANA timezone for interpreting targetDate
options: { type: 'general' | 'personalized' }
): GeneralDailyAnalysisOutput | PersonalizedDailyAnalysisOutput | null;

getAnalysisForDateRange(
startDate: Date,
endDate: Date,
targetTimezone: string, // IANA timezone for interpreting dates in the range
options: { type: 'general' | 'personalized' }
): (GeneralDailyAnalysisOutput | PersonalizedDailyAnalysisOutput)[] | null;
}

---

Here is type definition:

C:\Projects\my-saju-backend\node_modules\@aharris02\bazi-calculator-by-alvamind\dist\index.d.ts
