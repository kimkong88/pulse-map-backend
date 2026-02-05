import { UserContext, RawBaziData } from '../../saju/types';
import { PersonalizedDailyAnalysisOutput, GeneralDailyAnalysisOutput } from '@aharris02/bazi-calculator-by-alvamind';
import { getTenGodDisplayName, getTenGodEmoji, getTenGodCategory } from './tenGodDisplay.config';

export interface ActiveTenGod {
  name: string; // Display name (user-friendly)
  technicalName: string; // Technical name (for accuracy)
  emoji: string;
  source: 'natal' | 'transit' | 'luck';
  pillar: string; // "Year" | "Month" | "Hour" | "Annual" | "Monthly" | "Luck Era" | "Year, Month" (if duplicate)
  category: 'power' | 'wealth' | 'output' | 'resource' | 'friend' | null;
  strength?: 'single' | 'amplified' | 'dominant' | 'extreme'; // Strength based on number of occurrences
  occurrenceCount?: number; // Number of pillars where this Ten God appears
}

/**
 * Extract all active Ten Gods for today
 * Combines natal, transit, and luck era Ten Gods
 * 
 * Note: Transit Ten Gods (Annual/Monthly) are now calculated relative to Day Master
 * in the service layer, so we can read them directly from periodContext
 */
export function extractActiveTenGods(
  userContext: UserContext,
  rawData: RawBaziData,
  dailyAnalysis: PersonalizedDailyAnalysisOutput,
): ActiveTenGod[] {
  const activeTenGods: ActiveTenGod[] = [];

  // 1. Natal Ten Gods (from birth chart)
  // Year pillar
  if (userContext.natalStructure.social.tenGod) {
    activeTenGods.push({
      name: getTenGodDisplayName(userContext.natalStructure.social.tenGod) || userContext.natalStructure.social.tenGod,
      technicalName: userContext.natalStructure.social.tenGod,
      emoji: getTenGodEmoji(userContext.natalStructure.social.tenGod) || '✨',
      source: 'natal',
      pillar: 'Year',
      category: getTenGodCategory(userContext.natalStructure.social.tenGod),
    });
  }

  // Month pillar
  if (userContext.natalStructure.career.tenGod) {
    activeTenGods.push({
      name: getTenGodDisplayName(userContext.natalStructure.career.tenGod) || userContext.natalStructure.career.tenGod,
      technicalName: userContext.natalStructure.career.tenGod,
      emoji: getTenGodEmoji(userContext.natalStructure.career.tenGod) || '✨',
      source: 'natal',
      pillar: 'Month',
      category: getTenGodCategory(userContext.natalStructure.career.tenGod),
    });
  }

  // Hour pillar (if time is known)
  if (userContext.natalStructure.innovation?.tenGod) {
    activeTenGods.push({
      name: getTenGodDisplayName(userContext.natalStructure.innovation.tenGod) || userContext.natalStructure.innovation.tenGod,
      technicalName: userContext.natalStructure.innovation.tenGod,
      emoji: getTenGodEmoji(userContext.natalStructure.innovation.tenGod) || '✨',
      source: 'natal',
      pillar: 'Hour',
      category: getTenGodCategory(userContext.natalStructure.innovation.tenGod),
    });
  }

  // 2. Transit Ten Gods (from today's annual/monthly pillars)
  // These are now calculated relative to Day Master in the service layer
  
  // Annual pillar (now correctly calculated vs Day Master)
  if (rawData.periodContext?.annualPillar?.tenGod) {
    activeTenGods.push({
      name: getTenGodDisplayName(rawData.periodContext.annualPillar.tenGod) || rawData.periodContext.annualPillar.tenGod,
      technicalName: rawData.periodContext.annualPillar.tenGod,
      emoji: getTenGodEmoji(rawData.periodContext.annualPillar.tenGod) || '✨',
      source: 'transit',
      pillar: 'Annual',
      category: getTenGodCategory(rawData.periodContext.annualPillar.tenGod),
    });
  }

  // Monthly pillar (now correctly calculated vs Day Master)
  if (rawData.periodContext?.monthlyPillar?.tenGod) {
    activeTenGods.push({
      name: getTenGodDisplayName(rawData.periodContext.monthlyPillar.tenGod) || rawData.periodContext.monthlyPillar.tenGod,
      technicalName: rawData.periodContext.monthlyPillar.tenGod,
      emoji: getTenGodEmoji(rawData.periodContext.monthlyPillar.tenGod) || '✨',
      source: 'transit',
      pillar: 'Monthly',
      category: getTenGodCategory(rawData.periodContext.monthlyPillar.tenGod),
    });
  }

  // 3. Luck Era Ten God (current 10-year cycle)
  if (rawData.luckEra?.tenGod) {
    activeTenGods.push({
      name: getTenGodDisplayName(rawData.luckEra.tenGod) || rawData.luckEra.tenGod,
      technicalName: rawData.luckEra.tenGod,
      emoji: getTenGodEmoji(rawData.luckEra.tenGod) || '✨',
      source: 'luck',
      pillar: 'Luck Era',
      category: getTenGodCategory(rawData.luckEra.tenGod),
    });
  }

  // Debug: Log all Ten Gods before deduplication
  console.log(`🔍 Active Ten Gods BEFORE deduplication (${activeTenGods.length} total):`);
  activeTenGods.forEach((tg, idx) => {
    console.log(`  ${idx + 1}. ${tg.technicalName} (${tg.name}) - source: ${tg.source}, pillar: ${tg.pillar}`);
  });

  // Group by technical name to identify duplicates
  // Duplicates indicate stronger influence - we should show all instances
  const tenGodGroups = new Map<string, ActiveTenGod[]>();
  for (const tenGod of activeTenGods) {
    const existing = tenGodGroups.get(tenGod.technicalName) || [];
    existing.push(tenGod);
    tenGodGroups.set(tenGod.technicalName, existing);
  }

  // Build final list: show all Ten Gods, but combine pillars for duplicates
  // Strength levels based on BaZi principles:
  // - 1 occurrence = single (normal influence)
  // - 2 occurrences = amplified (stronger influence)
  // - 3 occurrences = dominant (very strong influence)
  // - 4+ occurrences = extreme (extremely strong, rare)
  const finalTenGods: ActiveTenGod[] = [];
  for (const [technicalName, instances] of tenGodGroups.entries()) {
    const occurrenceCount = instances.length;
    
    // Determine strength level
    let strength: 'single' | 'amplified' | 'dominant' | 'extreme';
    if (occurrenceCount === 1) {
      strength = 'single';
    } else if (occurrenceCount === 2) {
      strength = 'amplified';
    } else if (occurrenceCount === 3) {
      strength = 'dominant';
    } else {
      strength = 'extreme';
    }
    
    if (occurrenceCount === 1) {
      // Single instance - show as-is
      finalTenGods.push({
        ...instances[0],
        strength,
        occurrenceCount: 1,
      });
    } else {
      // Multiple instances - combine pillars and mark with appropriate strength
      // Prefer transit > luck > natal for the main entry
      const priority = { transit: 3, luck: 2, natal: 1 };
      instances.sort((a, b) => priority[b.source] - priority[a.source]);
      const primary = instances[0];
      
      // Combine all pillar names
      const allPillars = instances.map(i => i.pillar).join(', ');
      
      finalTenGods.push({
        ...primary,
        pillar: allPillars,
        strength,
        occurrenceCount,
      });
      
      console.log(`  ✅ ${strength.toUpperCase()}: ${technicalName} appears in ${occurrenceCount} pillars (${allPillars}) - ${strength} influence`);
    }
  }

  console.log(`🔍 Active Ten Gods AFTER grouping (${finalTenGods.length} total):`);
  finalTenGods.forEach((tg, idx) => {
    console.log(`  ${idx + 1}. ${tg.technicalName} (${tg.name}) - source: ${tg.source}, pillar: ${tg.pillar}, strength: ${tg.strength}`);
  });

  return finalTenGods;
}
