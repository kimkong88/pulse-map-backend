import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool 1: Get Basic Analysis
 * Returns: special stars, elements, day master, favorable elements
 */
export function createGetBasicAnalysisTool(calculator: any) {
  return tool({
    description:
      'Get comprehensive BaZi natal chart analysis including: special stars (桃花, 貴人, etc.), element counts, day master info, favorable elements, detailed four pillars (Year/Month/Day/Hour) with Ten Gods, and natal chart interactions (clashes, harmonies, etc.)',
    inputSchema: z.object({}),
    execute: async () => {
      let result;
      try {
        // Validate calculator exists
        if (!calculator) {
          result = {
            error: 'Calculator is not initialized',
          };
          console.error('[getBasicAnalysis] Calculator is not initialized');
          return result;
        }

        // Use getCompleteAnalysis() which is the correct method (same as saju.service.ts)
        const completeAnalysis = calculator.getCompleteAnalysis();

        if (!completeAnalysis) {
          result = {
            error:
              'Failed to get complete analysis from calculator - getCompleteAnalysis() returned null/undefined',
          };
          console.error(
            '[getBasicAnalysis] getCompleteAnalysis returned null/undefined',
          );
          return result;
        }

        if (!completeAnalysis.basicAnalysis) {
          result = {
            error: 'Complete analysis missing basicAnalysis property',
          };
          console.error(
            '[getBasicAnalysis] completeAnalysis.basicAnalysis is missing',
          );
          return result;
        }

        const basic = completeAnalysis.basicAnalysis;

        // Validate required fields exist
        if (!basic.dayMaster) {
          result = {
            error: 'Basic analysis missing dayMaster property',
          };
          console.error('[getBasicAnalysis] basic.dayMaster is missing');
          return result;
        }

        // Extract detailed pillars (Year/Month/Day/Hour) with Ten Gods
        const detailedPillars = completeAnalysis.detailedPillars
          ? {
              year: completeAnalysis.detailedPillars.year
                ? {
                    stem: completeAnalysis.detailedPillars.year.heavenlyStem
                      ?.character,
                    branch:
                      completeAnalysis.detailedPillars.year.earthlyBranch
                        ?.character,
                    stemElement:
                      completeAnalysis.detailedPillars.year.heavenlyStem
                        ?.elementType,
                    branchElement:
                      completeAnalysis.detailedPillars.year.earthlyBranch
                        ?.elementType,
                    tenGod:
                      completeAnalysis.detailedPillars.year.heavenlyStemTenGod
                        ?.tenGod || null,
                  }
                : null,
              month: completeAnalysis.detailedPillars.month
                ? {
                    stem: completeAnalysis.detailedPillars.month.heavenlyStem
                      ?.character,
                    branch:
                      completeAnalysis.detailedPillars.month.earthlyBranch
                        ?.character,
                    stemElement:
                      completeAnalysis.detailedPillars.month.heavenlyStem
                        ?.elementType,
                    branchElement:
                      completeAnalysis.detailedPillars.month.earthlyBranch
                        ?.elementType,
                    tenGod:
                      completeAnalysis.detailedPillars.month.heavenlyStemTenGod
                        ?.tenGod || null,
                  }
                : null,
              day: completeAnalysis.detailedPillars.day
                ? {
                    stem: completeAnalysis.detailedPillars.day.heavenlyStem
                      ?.character,
                    branch:
                      completeAnalysis.detailedPillars.day.earthlyBranch
                        ?.character,
                    stemElement:
                      completeAnalysis.detailedPillars.day.heavenlyStem
                        ?.elementType,
                    branchElement:
                      completeAnalysis.detailedPillars.day.earthlyBranch
                        ?.elementType,
                    tenGod:
                      completeAnalysis.detailedPillars.day.heavenlyStemTenGod
                        ?.tenGod || null,
                  }
                : null,
              hour: completeAnalysis.detailedPillars.hour
                ? {
                    stem: completeAnalysis.detailedPillars.hour.heavenlyStem
                      ?.character,
                    branch:
                      completeAnalysis.detailedPillars.hour.earthlyBranch
                        ?.character,
                    stemElement:
                      completeAnalysis.detailedPillars.hour.heavenlyStem
                        ?.elementType,
                    branchElement:
                      completeAnalysis.detailedPillars.hour.earthlyBranch
                        ?.elementType,
                    tenGod:
                      completeAnalysis.detailedPillars.hour.heavenlyStemTenGod
                        ?.tenGod || null,
                  }
                : null,
            }
          : null;

        // Extract natal chart interactions
        const natalInteractions = completeAnalysis.interactions
          ? completeAnalysis.interactions.map((interaction: any) => ({
              type: interaction.type,
              location: interaction.location,
              participants: interaction.participants?.map((p: any) => ({
                pillar: p.pillar,
                element: p.elementChar,
                source: p.source,
              })),
              description: interaction.description || '',
              potentialTransformation:
                interaction.potentialTransformation || null,
            }))
          : [];

        result = {
          specialStars: {
            nobleman: basic.nobleman || [],
            intelligence: basic.intelligence || null,
            skyHorse: basic.skyHorse || null,
            peachBlossom: basic.peachBlossom || null,
          },
          elementCounts: basic.fiveFactors
            ? {
                WOOD: basic.fiveFactors.WOOD,
                FIRE: basic.fiveFactors.FIRE,
                EARTH: basic.fiveFactors.EARTH,
                METAL: basic.fiveFactors.METAL,
                WATER: basic.fiveFactors.WATER,
              }
            : null,
          dayMaster: {
            stem: basic.dayMaster.stem,
            element: basic.dayMaster.element,
            nature: basic.dayMaster.nature,
          },
          strength: basic.dayMasterStrength
            ? {
                level: basic.dayMasterStrength.strength,
                score: basic.dayMasterStrength.score,
                notes: basic.dayMasterStrength.notes || [],
              }
            : null,
          favorableElements: basic.favorableElements
            ? {
                primary: basic.favorableElements.primary,
                secondary: basic.favorableElements.secondary || [],
                unfavorable: basic.favorableElements.unfavorable || [],
                notes: basic.favorableElements.notes || [],
              }
            : null,
          // NEW: Include detailed pillars with Ten Gods
          detailedPillars,
          // NEW: Include natal chart interactions
          natalInteractions,
        };

        console.log('[getBasicAnalysis] Successfully returning result');
        return result;
      } catch (error: any) {
        result = {
          error: `Tool execution failed: ${error.message || String(error)}`,
        };
        console.error('[getBasicAnalysis] Exception caught:', error);
        return result;
      }
    },
  });
}
