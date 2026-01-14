/**
 * Prompt for generating introduction hook for natal report
 */
export function generateIntroductionPrompt(context: {
  title: string;
  behavior: string;
  coreTrait: string;
  archetype: string;
  element: string;
  polarity: string;
  visualMetaphor: string;
  chartStrength: 'Strong' | 'Weak' | 'Balanced';
  patterns: string[];
}): string {
  const patternsText =
    context.patterns.length > 0
      ? `\nSpecial Patterns: ${context.patterns.join(', ')}`
      : '';

  return `
Generate a 3-4 sentence introduction for a personality report.

PERSONALITY TYPE: ${context.title}

IDENTITY BREAKDOWN:
- Core Trait: ${context.coreTrait}
- Archetype: ${context.archetype}
- Behavioral Style: ${context.behavior} (supporting modifier, weave in naturally)
- Element: ${context.element} (Fire=intense/focused, Water=adaptable/deep, Earth=stable/grounded, Metal=precise/structured, Wood=growth-oriented/expansive)
- Polarity: ${context.polarity} (Yin=inward/reflective, Yang=outward/expressive)
- Chart Strength: ${context.chartStrength}${patternsText}

Style Guidelines:
- Write like 16 Personalities: insightful, narrative-driven, "you" statements
- Use the "Paradox Hook" approach: correct common misconceptions about this type
- Build narrative tension that resolves into deeper truth
- Make it specific and relatable, not generic traits
- Use DIRECT language a 10-year-old could understand

Requirements:
- Professional but simple tone (like 16 Personalities)
- NO Chinese terms, NO mystical language
- NO direct mentions of "Fire" or "Yin" - use IMPLIED traits (e.g., "intense focus" for Fire, "inward energy" for Yin)
- Use MINIMAL metaphors - prefer direct statements about behavior
- Reference archetype and patterns if present
- Focus on personality patterns, not fortune telling
- 80-120 words

AVOID HEAVY METAPHORS:
❌ "like a focused flame—burn away everything unnecessary"
❌ "an alchemist who transmutes raw chaos"
❌ "like heat shaping clay"

INSTEAD BE DIRECT:
✅ "You focus intensely on one thing at a time"
✅ "You strip away unnecessary details to find what matters"
✅ "You transform ideas into refined results"

Example - Direct and Clear:
"Most people see your attention to detail and think you're rigid or inflexible. They don't understand that your intense focus is a choice. You're not a perfectionist who gets stuck—you're someone who refuses to do shallow work. When you commit to something, you go all in. You don't just complete projects, you transform them into something better than anyone expected. This intensity can be misunderstood, but it's your superpower."

IMPORTANT: Use the example as inspiration for STYLE and TONE, not as a rigid template to follow. Each type should have unique phrasing and flow.

Generate for: ${context.title}

Return ONLY the introduction text, no additional commentary.
`.trim();
}
