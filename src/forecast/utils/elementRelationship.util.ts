import { ElementType } from '@aharris02/bazi-calculator-by-alvamind';
import { UserContext, RawBaziData } from '../../saju/types';

/**
 * Generate friendly, clear meaning for element relationship
 * Focus on what it means for the user, not just "favorable/unfavorable"
 */
export function getElementRelationshipMeaning(
  dayMasterElement: ElementType,
  dayMasterYinYang: 'Yin' | 'Yang',
  dailyElement: ElementType,
  dailyYinYang: 'Yin' | 'Yang',
  favorableElements: { primary: ElementType[]; secondary: ElementType[]; unfavorable: ElementType[] } | null,
): string {
  if (!favorableElements) {
    return `Today's ${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'} energy brings a neutral influence—neither strongly supporting nor challenging your ${dayMasterElement}-${dayMasterYinYang === 'Yin' ? 'I' : 'O'} nature.`;
  }

  const isFavorable = favorableElements.primary.includes(dailyElement) || favorableElements.secondary.includes(dailyElement);
  const isUnfavorable = favorableElements.unfavorable.includes(dailyElement);

  // Element cycle relationships
  const elementCycle = getElementCycle(dayMasterElement, dailyElement);

  if (isFavorable) {
    // Favorable elements - supportive and energizing
    switch (elementCycle) {
      case 'generates':
        return `Today's ${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'} energy feeds your ${dayMasterElement}-${dayMasterYinYang === 'Yin' ? 'I' : 'O'} nature like fuel to a fire. You'll feel energized, supported, and ready to take action.`;
      case 'supports':
        return `Today's ${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'} energy strengthens your ${dayMasterElement}-${dayMasterYinYang === 'Yin' ? 'I' : 'O'} foundation. This is like having a strong support system—you'll feel more confident and grounded.`;
      default:
        return `Today's ${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'} energy is supportive of your ${dayMasterElement}-${dayMasterYinYang === 'Yin' ? 'I' : 'O'} nature. You'll feel more aligned and able to express yourself authentically.`;
    }
  } else if (isUnfavorable) {
    // Unfavorable elements - controlling or draining
    switch (elementCycle) {
      case 'controls':
        return `Today's ${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'} energy can feel like it's holding your ${dayMasterElement}-${dayMasterYinYang === 'Yin' ? 'I' : 'O'} nature back. You might feel restricted or like you need to slow down and be more careful.`;
      case 'drains':
        return `Today's ${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'} energy can feel draining for your ${dayMasterElement}-${dayMasterYinYang === 'Yin' ? 'I' : 'O'} nature. You might need to conserve energy and focus on what truly matters.`;
      default:
        return `Today's ${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'} energy challenges your ${dayMasterElement}-${dayMasterYinYang === 'Yin' ? 'I' : 'O'} nature. This isn't necessarily bad—it's asking you to adapt and be more strategic.`;
    }
  } else {
    // Neutral elements
    return `Today's ${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'} energy is neutral for your ${dayMasterElement}-${dayMasterYinYang === 'Yin' ? 'I' : 'O'} nature. It won't strongly support or challenge you—focus on the interactions and special patterns instead.`;
  }
}

/**
 * Determine element cycle relationship
 */
function getElementCycle(dayMaster: ElementType, daily: ElementType): 'generates' | 'supports' | 'controls' | 'drains' | 'neutral' {
  // Generation cycle: Wood → Fire → Earth → Metal → Water → Wood
  const generationCycle: Record<ElementType, ElementType> = {
    WOOD: 'FIRE',
    FIRE: 'EARTH',
    EARTH: 'METAL',
    METAL: 'WATER',
    WATER: 'WOOD',
  };

  // Control cycle: Wood → Earth → Water → Fire → Metal → Wood
  const controlCycle: Record<ElementType, ElementType> = {
    WOOD: 'EARTH',
    EARTH: 'WATER',
    WATER: 'FIRE',
    FIRE: 'METAL',
    METAL: 'WOOD',
  };

  // Daily generates Day Master (favorable)
  if (generationCycle[daily] === dayMaster) {
    return 'generates';
  }

  // Day Master generates Daily (also favorable, but less direct)
  if (generationCycle[dayMaster] === daily) {
    return 'supports';
  }

  // Daily controls Day Master (unfavorable)
  if (controlCycle[daily] === dayMaster) {
    return 'controls';
  }

  // Day Master controls Daily (also unfavorable, but less direct)
  if (controlCycle[dayMaster] === daily) {
    return 'drains';
  }

  return 'neutral';
}
