/**
 * Weaknesses (Growth Areas) templates for natal report
 * One template per Day Master (10 total)
 * Each type has 3 base weaknesses (everyone gets) + room for 1 dynamic weakness
 */

export interface WeaknessItem {
  title: string; // 2-3 words
  description: string; // 2-3 sentences
  emoji?: string; // Optional icon (weaknesses might not need icons)
  isPersonal?: boolean; // NEW: Flag for dynamic/unique items (from missing elements, etc.)
}

export interface WeaknessesTemplate {
  code: string; // "Fire-I", "Fire-O", etc.
  baseWeaknesses: WeaknessItem[]; // 3 core weaknesses
}

/**
 * Weaknesses for Fire-I (Yin Fire / 丁火) - The Focused Refiner
 */
const FIRE_I_WEAKNESSES: WeaknessesTemplate = {
  code: 'Fire-I',
  baseWeaknesses: [
    {
      title: 'Tunnel Vision',
      emoji: '🔍',
      description:
        'Your intense focus on one thing can blind you to broader context and opportunities elsewhere. You might perfect something that ultimately doesn\'t matter, missing the bigger picture. Learning to zoom out periodically saves wasted effort.',
    },
    {
      title: 'Perfectionism Paralysis',
      emoji: '⏸️',
      description:
        'Your high standards can prevent you from shipping or sharing work that\'s "good enough." This delays progress and opportunities while you refine endlessly. Sometimes done beats perfect.',
    },
    {
      title: 'Difficulty Delegating',
      emoji: '🔒',
      description:
        'You struggle to trust others with important work, fearing they won\'t meet your standards. This creates bottlenecks and limits your growth. Not everything requires your level of refinement.',
    },
  ],
};

/**
 * Weaknesses for Fire-O (Yang Fire / 丙火) - The Radiant Catalyst
 */
const FIRE_O_WEAKNESSES: WeaknessesTemplate = {
  code: 'Fire-O',
  baseWeaknesses: [
    {
      title: 'Follow-Through Gaps',
      emoji: '🏃',
      description:
        'You excel at starting things but often lose interest before completion. This leaves a trail of half-finished projects and disappointed collaborators. Your success depends on either finishing or partnering with finishers.',
    },
    {
      title: 'Sustainability Issues',
      emoji: '🔋',
      description:
        'You burn hot but can burn out, unable to maintain the initial intensity. This creates inconsistency that undermines your credibility. Learning to pace yourself is critical for long-term impact.',
    },
    {
      title: 'Overcommitment',
      emoji: '📅',
      description:
        'Your enthusiasm leads you to say yes to too many things, spreading yourself thin. This dilutes your impact and creates stress. Saying no is essential to saying yes effectively.',
    },
  ],
};

/**
 * Weaknesses for Water-I (Yin Water / 癸水) - The Intuitive Oracle
 */
const WATER_I_WEAKNESSES: WeaknessesTemplate = {
  code: 'Water-I',
  baseWeaknesses: [
    {
      title: 'Overthinking',
      emoji: '🌀',
      description:
        'Your sensitivity to nuance can lead to analysis paralysis, seeing too many angles to make a decision. This delays action and creates unnecessary complexity. Sometimes you need to trust your first instinct and move.',
    },
    {
      title: 'Boundary Issues',
      emoji: '🫥',
      description:
        'You absorb others\' emotions and problems so easily that you lose track of where you end and they begin. This drains your energy and clouds your judgment. Protecting your emotional space is not selfish.',
    },
    {
      title: 'Indirect Communication',
      emoji: '💬',
      description:
        'Your subtle approach can be too subtle, leaving others confused about what you actually want. This creates misunderstandings and unmet needs. Sometimes direct beats diplomatic.',
    },
  ],
};

/**
 * Weaknesses for Water-O (Yang Water / 壬水) - The Strategic Navigator
 */
const WATER_O_WEAKNESSES: WeaknessesTemplate = {
  code: 'Water-O',
  baseWeaknesses: [
    {
      title: 'Over-Adaptation',
      emoji: '🔄',
      description:
        'Your flexibility can become directionless, adapting so much you lose sight of your core goals. This creates a sense of drifting rather than progressing. Knowing what you won\'t compromise matters.',
    },
    {
      title: 'Emotional Distance',
      emoji: '🧊',
      description:
        'Your strategic mind can make you seem cold or detached in personal relationships. People want to know you care, not just that you\'re optimizing. Leading with logic misses the human element.',
    },
    {
      title: 'Commitment Hesitation',
      emoji: '🤷',
      description:
        'You prefer to keep options open, making it hard to fully commit to one path. This prevents you from going deep enough to achieve mastery. Eventually you must choose.',
    },
  ],
};

/**
 * Weaknesses for Wood-I (Yin Wood / 乙木) - The Diplomatic Climber
 */
const WOOD_I_WEAKNESSES: WeaknessesTemplate = {
  code: 'Wood-I',
  baseWeaknesses: [
    {
      title: 'Indirect Approach',
      emoji: '↩️',
      description:
        'Your preference for subtle maneuvering can take longer than necessary and frustrate direct communicators. Sometimes the shortest path is a straight line. Over-complicating wastes time.',
    },
    {
      title: 'Dependency on Others',
      emoji: '🤝',
      description:
        'Your strategy relies on relationships and support, making you vulnerable when alliances shift. You need to develop the ability to stand alone when necessary. Leaning isn\'t the same as being carried.',
    },
    {
      title: 'Conflict Avoidance',
      emoji: '🙈',
      description:
        'You bend to avoid confrontation even when standing firm would serve you better. This can lead to resentment and being taken advantage of. Some conflicts are worth having.',
    },
  ],
};

/**
 * Weaknesses for Wood-O (Yang Wood / 甲木) - The Pioneering Trailblazer
 */
const WOOD_O_WEAKNESSES: WeaknessesTemplate = {
  code: 'Wood-O',
  baseWeaknesses: [
    {
      title: 'Impatience',
      emoji: '⏩',
      description:
        'Your bias toward action can lead to moving before understanding the situation fully. This creates avoidable mistakes and resistance from others. Occasionally, waiting beats rushing.',
    },
    {
      title: 'Stubbornness',
      emoji: '🪨',
      description:
        'Your direct approach can become rigid, refusing to adapt even when circumstances clearly demand it. This turns strength into inflexibility. Being strong doesn\'t mean being unmovable.',
    },
    {
      title: 'Disregard for Details',
      emoji: '👀',
      description:
        'Your focus on the big picture can make you careless with execution details. This creates problems you then have to solve later. Small things matter more than you think.',
    },
  ],
};

/**
 * Weaknesses for Earth-I (Yin Earth / 己土) - The Nurturing Cultivator
 */
const EARTH_I_WEAKNESSES: WeaknessesTemplate = {
  code: 'Earth-I',
  baseWeaknesses: [
    {
      title: 'Over-Accommodation',
      emoji: '🫂',
      description:
        'You give so much to others that you neglect your own needs and goals. This creates resentment and burnout over time. Helping others shouldn\'t mean abandoning yourself.',
    },
    {
      title: 'Slow Decision Making',
      emoji: '⏳',
      description:
        'Your deliberate, considerate approach can miss time-sensitive opportunities. Not every decision needs extensive consultation and reflection. Sometimes you must decide quickly.',
    },
    {
      title: 'Difficulty Saying No',
      emoji: '🚫',
      description:
        'Your nurturing nature makes it hard to set boundaries, leading to being taken advantage of. People will take what you give—it\'s your job to protect your resources. No is a complete sentence.',
    },
  ],
};

/**
 * Weaknesses for Earth-O (Yang Earth / 戊土) - The Steadfast Guardian
 */
const EARTH_O_WEAKNESSES: WeaknessesTemplate = {
  code: 'Earth-O',
  baseWeaknesses: [
    {
      title: 'Resistance to Change',
      emoji: '⛔',
      description:
        'Your stability can become rigidity, holding onto methods and structures past their usefulness. This makes you slow to adapt to new realities. What worked yesterday might not work tomorrow.',
    },
    {
      title: 'Overprotectiveness',
      emoji: '🛡️',
      description:
        'Your desire to shield others can prevent them from learning through necessary struggle. This creates dependency rather than strength. Sometimes people need to face challenges.',
    },
    {
      title: 'Limited Flexibility',
      emoji: '🧱',
      description:
        'Your grounded nature can make you dismissive of new approaches or unconventional ideas. This causes you to miss innovations and opportunities. Being solid doesn\'t mean being immovable.',
    },
  ],
};

/**
 * Weaknesses for Metal-I (Yin Metal / 辛金) - The Precise Artisan
 */
const METAL_I_WEAKNESSES: WeaknessesTemplate = {
  code: 'Metal-I',
  baseWeaknesses: [
    {
      title: 'Excessive Criticism',
      emoji: '🔬',
      description:
        'Your discerning eye sees flaws everywhere, including in yourself and others. This creates a negative atmosphere and damages relationships. Not every imperfection needs correction.',
    },
    {
      title: 'Narrow Focus',
      emoji: '🎯',
      description:
        'Your pursuit of refinement in your specific domain can make you dismissive of broader skills. This limits your growth and makes you fragile when your niche changes. Versatility has value.',
    },
    {
      title: 'Elitism',
      emoji: '👑',
      description:
        'Your high standards can make you judgmental of those with different priorities or tastes. This alienates potential allies and clients. Excellence doesn\'t require looking down on others.',
    },
  ],
};

/**
 * Weaknesses for Metal-O (Yang Metal / 庚金) - The Decisive Architect
 */
const METAL_O_WEAKNESSES: WeaknessesTemplate = {
  code: 'Metal-O',
  baseWeaknesses: [
    {
      title: 'Harshness',
      emoji: '⚔️',
      description:
        'Your direct judgments can cut deeper than necessary, damaging relationships and morale. People need truth, but delivery matters. Being right doesn\'t justify being brutal.',
    },
    {
      title: 'Rigidity',
      emoji: '🔩',
      description:
        'Your strong principles can become inflexibility, refusing to adapt even when circumstances clearly require it. This turns conviction into obstinacy. Principles should guide, not imprison.',
    },
    {
      title: 'Emotional Detachment',
      emoji: '🤖',
      description:
        'Your focus on logic and structure can make you miss emotional needs—yours and others\'. This creates disconnection in relationships. Feelings are data too.',
    },
  ],
};

/**
 * All Day Master weakness templates
 */
export const WEAKNESSES_TEMPLATES: Record<string, WeaknessesTemplate> = {
  'Fire-I': FIRE_I_WEAKNESSES,
  'Fire-O': FIRE_O_WEAKNESSES,
  'Water-I': WATER_I_WEAKNESSES,
  'Water-O': WATER_O_WEAKNESSES,
  'Wood-I': WOOD_I_WEAKNESSES,
  'Wood-O': WOOD_O_WEAKNESSES,
  'Earth-I': EARTH_I_WEAKNESSES,
  'Earth-O': EARTH_O_WEAKNESSES,
  'Metal-I': METAL_I_WEAKNESSES,
  'Metal-O': METAL_O_WEAKNESSES,
};

