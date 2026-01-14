/**
 * Strengths templates for natal report
 * One template per Day Master (10 total)
 * Each type has 3 base strengths (everyone gets) + room for 1 dynamic strength
 */

export interface StrengthItem {
  title: string; // 2-3 words
  description: string; // 2-3 sentences
  emoji: string; // Icon representing this strength
  isPersonal?: boolean; // NEW: Flag for dynamic/unique items (from patterns, stars, etc.)
}

export interface StrengthsTemplate {
  code: string; // "Fire-I", "Fire-O", etc.
  baseStrengths: StrengthItem[]; // 3 core strengths
}

/**
 * Strengths for Fire-I (Yin Fire / 丁火) - The Focused Refiner
 */
const FIRE_I_STRENGTHS: StrengthsTemplate = {
  code: 'Fire-I',
  baseStrengths: [
    {
      title: 'Deep Focus',
      emoji: '⚡',
      description:
        'You can lose yourself in complex problems for hours, emerging with insights others miss entirely. This sustained concentration makes you exceptional at work requiring depth and precision. Where others skim the surface, you dive deep.',
    },
    {
      title: 'Transformative Vision',
      emoji: '💡',
      description:
        'You see not just what is, but what could be if refined to perfection. This allows you to elevate ordinary work into something remarkable. Your ability to envision the ideal state drives continuous improvement.',
    },
    {
      title: 'Quality Over Quantity',
      emoji: '💎',
      description:
        'You refuse to compromise on standards, ensuring everything you release meets your high bar. This makes you invaluable in fields where excellence matters more than speed. Clients and colleagues know your work can be trusted.',
    },
  ],
};

/**
 * Strengths for Fire-O (Yang Fire / 丙火) - The Radiant Catalyst
 */
const FIRE_O_STRENGTHS: StrengthsTemplate = {
  code: 'Fire-O',
  baseStrengths: [
    {
      title: 'Natural Charisma',
      emoji: '✨',
      description:
        'Your presence lights up a room and naturally draws people in. This makes you exceptional at roles requiring influence, leadership, or public presence. People feel energized around you.',
    },
    {
      title: 'Rapid Initiation',
      emoji: '🚀',
      description:
        'You excel at starting things—projects, conversations, movements. While others hesitate and plan, you create momentum that pulls people along. Your ability to spark action is rare and valuable.',
    },
    {
      title: 'Inspiring Communication',
      emoji: '🎤',
      description:
        'You make ideas feel exciting and possible through sheer enthusiasm and clarity. This makes you effective at sales, teaching, leadership, and any role requiring buy-in. Your words create belief.',
    },
  ],
};

/**
 * Strengths for Water-I (Yin Water / 癸水) - The Intuitive Oracle
 */
const WATER_I_STRENGTHS: StrengthsTemplate = {
  code: 'Water-I',
  baseStrengths: [
    {
      title: 'Intuitive Insight',
      emoji: '🔮',
      description:
        'You sense patterns, emotions, and undercurrents that others miss entirely. This makes you exceptional at reading people, timing decisions, and understanding hidden dynamics. Your gut instinct is usually right.',
    },
    {
      title: 'Emotional Intelligence',
      emoji: '💙',
      description:
        'You naturally understand what people need before they say it, making you invaluable in counseling, negotiation, and relationship-building. People feel seen and heard around you.',
    },
    {
      title: 'Subtle Influence',
      emoji: '🌊',
      description:
        'You shape outcomes quietly without forcing or demanding. This gentle approach often achieves more than direct confrontation. Your influence grows like water—gradually but powerfully.',
    },
  ],
};

/**
 * Strengths for Water-O (Yang Water / 壬水) - The Strategic Navigator
 */
const WATER_O_STRENGTHS: StrengthsTemplate = {
  code: 'Water-O',
  baseStrengths: [
    {
      title: 'Strategic Thinking',
      emoji: '♟️',
      description:
        "You see multiple paths to any goal and adapt your approach as conditions change. This makes you exceptional at complex problem-solving, strategy, and navigating uncertainty. You find routes others don't see.",
    },
    {
      title: 'Systems Understanding',
      emoji: '🧩',
      description:
        'You naturally grasp how different pieces connect and influence each other. This makes you valuable in roles requiring big-picture thinking, organizational design, or complex coordination.',
    },
    {
      title: 'Adaptive Intelligence',
      emoji: '🌊',
      description:
        'You flow around obstacles rather than breaking through them, conserving energy while making progress. This flexibility allows you to succeed where rigid approaches fail.',
    },
  ],
};

/**
 * Strengths for Wood-I (Yin Wood / 乙木) - The Diplomatic Climber
 */
const WOOD_I_STRENGTHS: StrengthsTemplate = {
  code: 'Wood-I',
  baseStrengths: [
    {
      title: 'Strategic Flexibility',
      emoji: '🌿',
      description:
        'You adapt to circumstances without losing sight of your goals, finding indirect routes when direct paths are blocked. This makes you effective in complex social and political environments. You achieve through patience and positioning.',
    },
    {
      title: 'Relationship Building',
      emoji: '🤝',
      description:
        'You excel at creating genuine connections that benefit everyone involved. This network becomes your greatest asset, opening doors and creating opportunities. People naturally want to help you.',
    },
    {
      title: 'Diplomatic Influence',
      emoji: '🕊️',
      description:
        'You achieve consensus and move things forward without confrontation or force. This makes you invaluable in team environments, negotiations, and situations requiring buy-in from multiple stakeholders.',
    },
  ],
};

/**
 * Strengths for Wood-O (Yang Wood / 甲木) - The Pioneering Trailblazer
 */
const WOOD_O_STRENGTHS: StrengthsTemplate = {
  code: 'Wood-O',
  baseStrengths: [
    {
      title: 'Bold Initiative',
      emoji: '🌲',
      description:
        "You start things while others are still planning, creating opportunities through action. This makes you natural at entrepreneurship, leadership, and any role requiring courage. You don't wait for permission.",
    },
    {
      title: 'Direct Leadership',
      emoji: '🎯',
      description:
        'You provide clear direction and inspire confidence through visible commitment. People follow you because you lead from the front. Your presence creates certainty in uncertain situations.',
    },
    {
      title: 'Growth Mindset',
      emoji: '📈',
      description:
        'You naturally expand upward and outward, seeing possibilities where others see limits. This optimism and ambition drive continuous progress. You make things bigger and better.',
    },
  ],
};

/**
 * Strengths for Earth-I (Yin Earth / 己土) - The Nurturing Cultivator
 */
const EARTH_I_STRENGTHS: StrengthsTemplate = {
  code: 'Earth-I',
  baseStrengths: [
    {
      title: 'Talent Development',
      emoji: '🌱',
      description:
        'You see potential in people and create conditions for them to thrive. This makes you exceptional at management, mentoring, and team building. Your success comes through empowering others.',
    },
    {
      title: 'Patient Cultivation',
      emoji: '🕰️',
      description:
        "You understand that real growth takes time and can't be rushed. This patience allows you to build things that last while others chase quick wins. You create sustainable success.",
    },
    {
      title: 'Supportive Presence',
      emoji: '🤗',
      description:
        'People feel safe and encouraged around you, allowing them to take risks and grow. This creates loyalty and high-performing teams. Your influence multiplies through others.',
    },
  ],
};

/**
 * Strengths for Earth-O (Yang Earth / 戊土) - The Steadfast Guardian
 */
const EARTH_O_STRENGTHS: StrengthsTemplate = {
  code: 'Earth-O',
  baseStrengths: [
    {
      title: 'Unwavering Stability',
      emoji: '⛰️',
      description:
        'You provide consistent, reliable presence that others can build on. In crisis, you become the calm center everyone turns to. This makes you invaluable in high-pressure environments.',
    },
    {
      title: 'Practical Execution',
      emoji: '🔨',
      description:
        'You turn ideas into reality through systematic, grounded action. While others dream, you build. Your ability to deliver consistently makes you trusted and sought-after.',
    },
    {
      title: 'Protective Strength',
      emoji: '🛡️',
      description:
        'You naturally shield and support those around you, creating security for your team. This builds deep loyalty and allows others to take productive risks. You hold the foundation.',
    },
  ],
};

/**
 * Strengths for Metal-I (Yin Metal / 辛金) - The Precise Artisan
 */
const METAL_I_STRENGTHS: StrengthsTemplate = {
  code: 'Metal-I',
  baseStrengths: [
    {
      title: 'Refined Discernment',
      emoji: '💎',
      description:
        'You distinguish between good and exceptional, seeing quality differences others miss. This makes you valuable in roles requiring taste, curation, or high standards. You create and recognize excellence.',
    },
    {
      title: 'Attention to Detail',
      emoji: '🔍',
      description:
        'You catch errors and opportunities in the fine print that others overlook. This precision prevents costly mistakes and elevates final products. Your thoroughness is your superpower.',
    },
    {
      title: 'Aesthetic Sense',
      emoji: '🎨',
      description:
        'You naturally create beauty and elegance in your work. This makes you exceptional in design, craftsmanship, and any field where presentation matters. Quality shows in everything you touch.',
    },
  ],
};

/**
 * Strengths for Metal-O (Yang Metal / 庚金) - The Decisive Architect
 */
const METAL_O_STRENGTHS: StrengthsTemplate = {
  code: 'Metal-O',
  baseStrengths: [
    {
      title: 'Clear Judgment',
      emoji: '⚖️',
      description:
        'You cut through noise to see what actually matters, making decisive calls when others waffle. This makes you valuable in leadership, crisis management, and any role requiring tough decisions. Your clarity is rare.',
    },
    {
      title: 'Structural Thinking',
      emoji: '🏗️',
      description:
        'You naturally create systems, frameworks, and processes that bring order to chaos. This makes you exceptional at organizational design, architecture, and strategic planning. You build foundations.',
    },
    {
      title: 'Principled Integrity',
      emoji: '🗿',
      description:
        'You stick to your values even when inconvenient, earning trust and respect. This consistency makes you a natural leader people look to for guidance. Your word means something.',
    },
  ],
};

/**
 * All Day Master strength templates
 */
export const STRENGTHS_TEMPLATES: Record<string, StrengthsTemplate> = {
  'Fire-I': FIRE_I_STRENGTHS,
  'Fire-O': FIRE_O_STRENGTHS,
  'Water-I': WATER_I_STRENGTHS,
  'Water-O': WATER_O_STRENGTHS,
  'Wood-I': WOOD_I_STRENGTHS,
  'Wood-O': WOOD_O_STRENGTHS,
  'Earth-I': EARTH_I_STRENGTHS,
  'Earth-O': EARTH_O_STRENGTHS,
  'Metal-I': METAL_I_STRENGTHS,
  'Metal-O': METAL_O_STRENGTHS,
};
