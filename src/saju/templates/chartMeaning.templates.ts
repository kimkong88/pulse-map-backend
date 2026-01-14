/**
 * Templates for "What This Means For You" section
 * Bridges birth chart data to practical personality implications
 * Modular approach: 32 templates that combine dynamically
 */

// 1. CORE TRAITS (10 templates - one per Day Master type)
export const CORE_TRAITS: Record<string, string> = {
  'Fire-I': 'concentrated intensity and transformative focus',
  'Fire-O': 'radiant energy and inspiring presence',
  'Water-I': 'deep adaptability and strategic insight',
  'Water-O': 'flowing energy and influential communication',
  'Wood-I': 'flexible growth and creative nurturing',
  'Wood-O': 'pioneering drive and upward momentum',
  'Earth-I': 'nurturing stability and reliable support',
  'Earth-O': 'grounding presence and practical execution',
  'Metal-I': 'refined precision and structural clarity',
  'Metal-O': 'decisive strength and disciplined action',
};

// 2. DOMINANT ELEMENT IMPACT (5 templates)
export const DOMINANT_IMPACT: Record<string, string> = {
  Wood: 'channels your energy into growth, creativity, and new ventures',
  Fire: 'amplifies your intensity into visible impact and transformation',
  Earth: 'grounds your energy into tangible, lasting results',
  Metal: 'sharpens your energy into precision, clarity, and structure',
  Water: 'directs your energy into adaptability, depth, and flow',
};

// 3. MISSING ELEMENT GUIDANCE (7 templates)
export const MISSING_ELEMENT_GUIDANCE: Record<string, string> = {
  none: 'Your balanced chart gives you natural versatility across all life domains',
  Wood: 'deliberately cultivating flexibility and a growth mindset',
  Fire: 'actively seeking passion projects and opportunities for visibility',
  Earth: 'building consistent routines and grounding practices',
  Metal: 'strengthening boundaries and decision-making clarity',
  Water: 'developing adaptability and emotional awareness',
  multiple:
    'deliberately building {elements} qualities—this turns your gap into intentional growth',
};

// 4. ARCHETYPE CONNECTIONS (10 templates - ties chart to identity)
export const ARCHETYPE_CONNECTIONS: Record<string, string> = {
  'Fire-I':
    'concentrated intensity (Fire) refined through meticulous precision—you transform raw potential into excellence',
  'Fire-O':
    'radiant energy (Fire) that inspires and illuminates—you energize everything you touch',
  'Water-I':
    'deep currents (Water) revealing hidden insights—you see what others miss beneath the surface',
  'Water-O':
    'flowing influence (Water) that shapes environments—you adapt and redirect naturally',
  'Wood-I':
    'flexible growth (Wood) that nurtures quietly—you cultivate potential with patient care',
  'Wood-O':
    'pioneering momentum (Wood) breaking new ground—you initiate and expand fearlessly',
  'Earth-I':
    'nurturing stability (Earth) that holds things together—you create safe foundations for others',
  'Earth-O':
    'grounding force (Earth) that builds lasting impact—you turn ideas into concrete reality',
  'Metal-I':
    'refined precision (Metal) that perfects through detail—you elevate quality through standards',
  'Metal-O':
    'decisive clarity (Metal) that cuts through ambiguity—you bring structure to chaos',
};

// 5. ELEMENT METAPHORS (for "Your Fire nature channels into Earth" style explanations)
export const ELEMENT_METAPHORS: Record<string, string> = {
  Wood: 'growth and expansion',
  Fire: 'intensity and transformation',
  Earth: 'stability and tangibility',
  Metal: 'precision and structure',
  Water: 'flow and depth',
};

// 6. ELEMENT INTERACTION EXPLANATIONS (for when Day Master ≠ Dominant)
export const ELEMENT_INTERACTIONS: Record<string, Record<string, string>> = {
  Fire: {
    Wood: 'Wood fuels your Fire—your growth naturally ignites passion and intensity',
    Fire: 'Double Fire amplifies your transformative power—you burn bright and visible',
    Earth:
      'Fire creates Earth—like heat shaping clay, your passion naturally generates tangible results',
    Metal:
      'Fire refines Metal—your intensity tests and strengthens your structural clarity',
    Water:
      'Water moderates Fire—depth and adaptability temper your intensity into sustainable focus',
  },
  Water: {
    Wood: 'Water nourishes Wood—your depth and flow enable creative growth',
    Fire: 'Water and Fire create steam—dynamic tension between depth and intensity drives you',
    Earth:
      'Earth contains Water—stability channels your adaptability into purposeful direction',
    Metal:
      'Metal conducts Water—precision and structure give your flow clear pathways',
    Water: 'Double Water deepens your insight—you operate at profound emotional depths',
  },
  Wood: {
    Wood: 'Double Wood accelerates growth—you expand and create with unstoppable momentum',
    Fire: 'Wood feeds Fire—your creativity naturally sparks transformation and visibility',
    Earth:
      'Wood and Earth ground growth—stability gives your expansion lasting roots',
    Metal:
      'Metal prunes Wood—discipline and boundaries shape your creative energy',
    Water: 'Water nourishes Wood—adaptability fuels your growth and expansion',
  },
  Earth: {
    Wood: 'Wood breaks Earth—growth and creativity push through your stability',
    Fire: 'Fire creates Earth—intensity solidifies into practical, lasting results',
    Earth:
      'Double Earth maximizes stability—you build foundations that last generations',
    Metal:
      'Earth births Metal—your grounding naturally produces clarity and precision',
    Water:
      'Earth channels Water—stability directs adaptability into productive flow',
  },
  Metal: {
    Wood: 'Metal shapes Wood—your precision directs and refines creative growth',
    Fire: 'Fire forges Metal—intensity strengthens your structural clarity',
    Earth: 'Earth generates Metal—stability produces refined precision and standards',
    Metal: 'Double Metal sharpens clarity—you cut through ambiguity with ease',
    Water:
      'Metal guides Water—your structure channels adaptability into strategic flow',
  },
};

/**
 * Helper function to format missing elements for display
 */
export function formatMissingElements(missing: string[]): string {
  if (missing.length === 0) return 'none';
  if (missing.length === 1) return missing[0];
  if (missing.length === 2) return `${missing[0]} and ${missing[1]}`;
  return missing.slice(0, -1).join(', ') + ', and ' + missing[missing.length - 1];
}

/**
 * Helper function to get missing element key
 */
export function getMissingElementKey(missing: string[]): string {
  if (missing.length === 0) return 'none';
  if (missing.length === 1) return missing[0];
  return 'multiple';
}

