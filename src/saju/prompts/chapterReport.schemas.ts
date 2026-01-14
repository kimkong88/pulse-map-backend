/**
 * Zod Schemas for Chapter Report LLM Outputs
 * CRITICAL: These schemas must match EXACTLY what the prompts ask for
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA 1: Title & Subtitle
// ============================================================================

export const titleOutputSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
});

export type TitleOutput = z.infer<typeof titleOutputSchema>;

// ============================================================================
// SCHEMA 2: Introduction
// ============================================================================

export const introductionOutputSchema = z.object({
  text: z.string(),
});

export type IntroductionOutput = z.infer<typeof introductionOutputSchema>;

// ============================================================================
// SCHEMA 3: Vibe Check
// ============================================================================

const vibeSchema = z.object({
  label: z.string(),
  description: z.string(),
  technicalBasis: z.string(),
  affectedYears: z.array(z.number()).optional(),
});

export const vibeCheckOutputSchema = z.object({
  introduction: z.string(),
  vibes: z.array(vibeSchema),
});

export type VibeCheckOutput = z.infer<typeof vibeCheckOutputSchema>;

// ============================================================================
// SCHEMA 4: Turning Points
// ============================================================================

const turningPointEventSchema = z.object({
  year: z.number(),
  age: z.number(),
  label: z.string(),
  description: z.string(),
  technicalBasis: z.string(),
  exampleOutcomes: z.array(z.string()),
  categories: z.array(z.string()),
  significance: z.enum(['major', 'moderate', 'minor']),
});

export const turningPointsOutputSchema = z.object({
  introduction: z.string(),
  timeline: z.array(turningPointEventSchema), // Changed from 'events' to match ChapterReportUI type
});

export type TurningPointsOutput = z.infer<typeof turningPointsOutputSchema>;

// ============================================================================
// SCHEMA 5: Cheat Sheet
// ============================================================================

const encouragedActionSchema = z.object({
  action: z.string(),
  reasoning: z.string(),
  bestYears: z.array(z.number()).optional(),
});

const discouragedActionSchema = z.object({
  action: z.string(),
  reasoning: z.string(),
  riskYears: z.array(z.number()).optional(),
});

export const cheatSheetOutputSchema = z.object({
  introduction: z.string(),
  encouraged: z.array(encouragedActionSchema), // Changed from encouragedActions
  discouraged: z.array(discouragedActionSchema), // Changed from avoidActions
});

export type CheatSheetOutput = z.infer<typeof cheatSheetOutputSchema>;

// ============================================================================
// SCHEMA 6: Takeaways
// ============================================================================

export const takeawaysOutputSchema = z.object({
  text: z.string(),
});

export type TakeawaysOutput = z.infer<typeof takeawaysOutputSchema>;
