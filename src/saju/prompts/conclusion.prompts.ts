/**
 * Prompt for generating the conclusion/wrap-up of natal report
 * LLM synthesizes the user's unique combination and provides empowering send-off
 */

export function generateConclusionPrompt(context: {
  identity: {
    title: string;
    element: string;
    polarity: string;
    coreTrait: string;
    archetype: string;
    behavior: string;
    visualMetaphor: string;
  };
  strengthTitles: string;
  weaknessTitles: string;
  patterns: string;
  careerInsights: string;
  wealthInsights: string;
  elementDominant: string;
  elementMissing: string;
}): string {
  return `
Write a powerful 3-4 sentence conclusion for a personality report.

CONTEXT - What We've Already Covered:
- Identity: ${context.identity.title} (${context.identity.element}-${context.identity.polarity})
- Core traits: ${context.identity.coreTrait}, ${context.identity.archetype}, ${context.identity.behavior}
- Visual metaphor: ${context.identity.visualMetaphor}

- Strengths discussed: ${context.strengthTitles}
- Weaknesses discussed: ${context.weaknessTitles}
- Special patterns: ${context.patterns || 'none'}

- Career insights provided: ${context.careerInsights || 'none'}
- Wealth insights provided: ${context.wealthInsights || 'none'}
- Element distribution: Dominant in ${context.elementDominant || 'balanced'}, Missing ${context.elementMissing || 'none'}

WHAT THIS CONCLUSION SHOULD DO:
1. Synthesize their UNIQUE COMBINATION (how do these traits interact/amplify each other?)
2. Provide the "so what?"—what does this combination mean for their life path?
3. Acknowledge their main tension/challenge (from their weaknesses)
4. End with empowerment—remind them of their unique value

WHAT THIS CONCLUSION SHOULD NOT DO:
❌ Don't repeat career/wealth examples already given
❌ Don't list strengths again
❌ Don't give new actionable advice (we covered that)
❌ Don't summarize section by section
❌ Don't use generic platitudes ("You can do anything!")

CRITICAL - LANGUAGE REQUIREMENTS:
❌ NO Chinese terms (no Bazi, no pillar names, no element names in Chinese)
❌ NO mystical language (no fortune, destiny, cosmic, spiritual references)
❌ NO explicit "chart" references (or use minimally/naturally)
❌ NO translated terms (keep it like 16 Personalities—personality traits only)
✅ DO use personality language (traits, patterns, tendencies, strengths)
✅ DO reference elements naturally if needed (Fire = intensity/focus, Water = flow, etc.)
✅ DO sound like modern psychology/personality typing

TONE:
- Professional and insightful (exactly like 16 Personalities)
- Acknowledges complexity (both gifts and challenges)
- Empowering but realistic
- Non-mystical, personality-focused
- "You" statements
- DIRECT language a 10-year-old could understand (avoid heavy metaphors)

STRUCTURE EXAMPLE:
"You have a rare combination: [synthesize traits naturally]. This means [practical implication]. 
Your challenge isn't [the obvious thing]—it's [the deeper insight]. [Empowering truth about their value]."

Generate the conclusion (3-4 sentences only):
  `.trim();
}

