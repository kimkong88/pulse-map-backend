import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool 2: Get Year Pillars (Batch)
 * Returns: Year pillars for multiple years
 */
export function createGetYearPillarsTool(calculator: any) {
  return tool({
    description:
      'Get BaZi year pillars (stem & branch) for multiple years. Useful for analyzing timing over a period.',
    inputSchema: z.object({
      years: z
        .array(z.number())
        .describe(
          'Array of years to get pillars for (e.g., [2026, 2027, 2028])',
        ),
    }),
    execute: async ({ years }) => {
      if (!years || !Array.isArray(years) || years.length === 0) {
        return {
          error: 'Invalid years parameter: must be a non-empty array',
        };
      }

      const results = years.map((year) => {
        try {
          const pillar = calculator.getAnnualPillar(year);

          if (!pillar || !pillar.heavenlyStem || !pillar.earthlyBranch) {
            return {
              year,
              error: 'Failed to calculate pillar or pillar data incomplete',
            };
          }

          return {
            year,
            stem: pillar.heavenlyStem.character,
            branch: pillar.earthlyBranch.character,
            stemElement: pillar.heavenlyStem.elementType,
            branchElement: pillar.earthlyBranch.elementType,
            stemYinYang: pillar.heavenlyStem.yinYang,
            branchYinYang: pillar.earthlyBranch.yinYang,
          };
        } catch (error: any) {
          return {
            year,
            error: `Error calculating pillar for year ${year}: ${error.message}`,
          };
        }
      });

      return results;
    },
  });
}
