export function buildUserPrompt(
  questionTitle: string,
  questionPreview: string,
  currentAge: number,
  gender: string,
): string {
  const currentYear = new Date().getFullYear();

  return `Answer this question for the user:

"${questionTitle}"

Context: ${questionPreview}

User Details:
- Current age: ${currentAge}
- Current year: ${currentYear}
- Gender: ${gender}

IMPORTANT: All chart data has already been gathered for you. Use the tool results provided below to craft your answer. Do NOT call any tools - the data is already here.`;
}

export function buildContinuationPrompt(
  userPrompt: string,
  toolResults: string[],
): string {
  const hasToolData =
    toolResults.length > 0 &&
    !toolResults.some(
      (ctx) =>
        ctx.includes('[Tool returned no result') ||
        ctx.includes('[ERROR]') ||
        ctx.includes('error'),
    );

  // Transform element names in tool results
  const transformedResults = toolResults.map((result) => {
    // Transform Yin/Yang element patterns
    let transformed = result
      .replace(/Yin\s+Wood/gi, 'Wood-I')
      .replace(/Yang\s+Wood/gi, 'Wood-O')
      .replace(/Yin\s+Fire/gi, 'Fire-I')
      .replace(/Yang\s+Fire/gi, 'Fire-O')
      .replace(/Yin\s+Earth/gi, 'Earth-I')
      .replace(/Yang\s+Earth/gi, 'Earth-O')
      .replace(/Yin\s+Metal/gi, 'Metal-I')
      .replace(/Yang\s+Metal/gi, 'Metal-O')
      .replace(/Yin\s+Water/gi, 'Water-I')
      .replace(/Yang\s+Water/gi, 'Water-O');

    return transformed;
  });

  return `${userPrompt}

${hasToolData ? `CHART DATA (Use this to answer the question):

${transformedResults.join('\n\n')}

Your task: Analyze this chart data and write a compelling, personalized answer that:
1. Answers their question directly and specifically
2. Uses actual years, ages, and timeframes from the data
3. Explains what's happening in their chart in an engaging, non-technical way
4. Separates all technical BaZi terms into the "Why we came to this conclusion" section
5. Transforms all element names (Yin Fire → Fire-I, Yang Fire → Fire-O, etc.)
6. Uses NO markdown formatting (no asterisks, no bold, no ### headers)
7. Writes with conviction and energy - make it exciting and actionable

Remember: The main answer should be entertaining and accessible. Save all technical explanations for the final "Why we came to this conclusion" section.` : `⚠️ WARNING: Chart data collection had issues. Some tools may have failed.

${transformedResults.length > 0 ? transformedResults.join('\n\n') : 'No chart data available.'}

Provide general guidance but acknowledge that specific chart analysis was not fully available.`}

CRITICAL INSTRUCTIONS:
- DO NOT call any tools - all data is provided above
- Write the complete answer following the structure: Opening Hook, The Answer, Action Plan, Closing, Why We Came to This Conclusion
- Include [METRICS] at the very end
- Transform all element names (Yin/Yang → I/O format)
- NO markdown formatting anywhere
- Make it engaging, convincing, and entertaining`;
}
