import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool 4: Get Year Interactions
 * Returns: Interactions between natal chart and a specific year
 */
export function createGetYearInteractionsTool(
  calculator: any,
  timezone: string,
) {
  return tool({
    description:
      'Get BaZi interactions (clashes, harmonies, etc.) between natal chart and a specific year. Shows how favorable or challenging that year is.',
    inputSchema: z.object({
      year: z
        .number()
        .describe('Year to analyze interactions for (e.g., 2027)'),
    }),
    execute: async ({ year }) => {
      if (!year || typeof year !== 'number' || year < 1900 || year > 2100) {
        return {
          year,
          error: 'Invalid year parameter: must be a number between 1900-2100',
        };
      }

      try {
        const targetDate = new Date(year, 0, 1);

        const analysis = calculator.getTimedAnalysis(targetDate, timezone);

        if (!analysis || !analysis.interactions) {
          return {
            year,
            error: 'Failed to analyze interactions',
          };
        }

        const yearInteractions = analysis.interactions.filter(
          (interaction: any) => interaction.location === 'Natal-Annual',
        );

        const grouped = {
          year,
          clashes: yearInteractions
            .filter((i: any) => i.type === 'BranchClash')
            .map((i: any) => ({
              type: i.type,
              participants: i.participants.map((p: any) => ({
                pillar: p.pillar,
                element: p.elementChar,
                source: p.source,
              })),
              description: i.description || '',
            })),
          harmonies: yearInteractions
            .filter(
              (i: any) =>
                i.type === 'Branch6Combo' ||
                i.type === 'TrinityCombo' ||
                i.type === 'DirectionalCombo',
            )
            .map((i: any) => ({
              type: i.type,
              participants: i.participants.map((p: any) => ({
                pillar: p.pillar,
                element: p.elementChar,
                source: p.source,
              })),
              transformation: i.potentialTransformation || null,
              description: i.description || '',
            })),
          harms: yearInteractions
            .filter((i: any) => i.type === 'BranchHarm')
            .map((i: any) => ({
              type: i.type,
              participants: i.participants.map((p: any) => ({
                pillar: p.pillar,
                element: p.elementChar,
                source: p.source,
              })),
              description: i.description || '',
            })),
          punishments: yearInteractions
            .filter((i: any) => i.type === 'BranchPunishment')
            .map((i: any) => ({
              type: i.type,
              participants: i.participants.map((p: any) => ({
                pillar: p.pillar,
                element: p.elementChar,
                source: p.source,
              })),
              description: i.description || '',
            })),
          stemInteractions: yearInteractions
            .filter(
              (i: any) =>
                i.type === 'StemCombination' || i.type === 'StemClash',
            )
            .map((i: any) => ({
              type: i.type,
              participants: i.participants.map((p: any) => ({
                pillar: p.pillar,
                element: p.elementChar,
                source: p.source,
              })),
              transformation: i.potentialTransformation || null,
              description: i.description || '',
            })),
        };

        return grouped;
      } catch (error: any) {
        return {
          year,
          error: `Error analyzing interactions: ${error.message}`,
        };
      }
    },
  });
}
