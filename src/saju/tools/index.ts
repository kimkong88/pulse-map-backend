/**
 * BaZi Tools for LLM
 * 
 * These tools wrap the bazi-calculator library to provide
 * structured data for LLM-based analysis and question answering.
 * 
 * NOTE: Tools are created via factory functions that accept context (calculator, birthDate, etc.)
 * This is because AI SDK v6 tools cannot directly accept context parameters.
 */

import { BaziCalculator } from '@aharris02/bazi-calculator-by-alvamind';
import { createGetBasicAnalysisTool } from './basic-analysis.tool';
import { createGetYearPillarsTool } from './year-pillars.tool';
import { createGetLuckPillarAtAgeTool } from './luck-pillar.tool';
import { createGetYearInteractionsTool } from './year-interactions.tool';

/**
 * Create all BaZi tools with bound context
 */
export function createBaziTools(
  calculator: BaziCalculator,
  birthDate: Date,
  timezone: string,
) {
  return {
    getBasicAnalysis: createGetBasicAnalysisTool(calculator),
    getYearPillars: createGetYearPillarsTool(calculator),
    getLuckPillarAtAge: createGetLuckPillarAtAgeTool(calculator, birthDate),
    getYearInteractions: createGetYearInteractionsTool(calculator, timezone),
  };
}

// Export individual creators
export {
  createGetBasicAnalysisTool,
  createGetYearPillarsTool,
  createGetLuckPillarAtAgeTool,
  createGetYearInteractionsTool,
};
