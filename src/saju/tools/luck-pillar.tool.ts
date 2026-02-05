import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool 3: Get Luck Pillar at Age
 * Returns: The active Luck Pillar (大運) for a specific age
 */
export function createGetLuckPillarAtAgeTool(calculator: any, birthDate: Date) {
  return tool({
    description:
      'Get the active Luck Pillar (大運) for a specific age. Luck Pillars change every 10 years and represent major life cycles.',
    inputSchema: z.object({
      age: z.number().describe('Age to check (e.g., 37)'),
    }),
    execute: async ({ age }) => {
      if (typeof age !== 'number' || age < 0 || age > 120) {
        return {
          age,
          error: 'Invalid age parameter: must be a number between 0-120',
        };
      }

      try {
        const targetDate = new Date(birthDate);
        targetDate.setFullYear(targetDate.getFullYear() + age);

        const luckPillar = calculator.getCurrentLuckPillar(targetDate);

        if (!luckPillar) {
          // Return null/empty data instead of error - LLM can work with this
          return {
            age,
            available: false,
            note: 'Luck Pillar calculation requires known birth time',
          };
        }

        return {
          age,
          stem: luckPillar.heavenlyStem?.character,
          branch: luckPillar.earthlyBranch?.character,
          stemElement: luckPillar.heavenlyStem?.elementType,
          branchElement: luckPillar.earthlyBranch?.elementType,
          ageStart: luckPillar.ageStart,
          yearStart: luckPillar.yearStart,
          yearEnd: luckPillar.yearEnd,
        };
      } catch (error: any) {
        return {
          age,
          error: `Error calculating luck pillar: ${error.message}`,
        };
      }
    },
  });
}
