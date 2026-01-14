/**
 * "Who You Are" section templates for natal report
 * One template per Day Master (10 total)
 */

export interface WhoYouAreTemplate {
  code: string; // "Fire-I", "Fire-O", etc.
  paragraphs: string[];
}

/**
 * Template for Fire-I (Yin Fire / 丁火)
 */
const FIRE_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Fire-I',
  paragraphs: [
    // Paragraph 1: Core energy - SHORT
    `You're driven by concentrated intensity. Unlike those who radiate energy outward, yours burns inward—like a focused flame that directs all its heat toward a single point. This isn't weakness; it's precision.`,

    // Paragraph 2: How it manifests - SHORT
    `As a Refiner, you don't just improve things—you fundamentally transform them. What looks "finished" to someone else is raw material to you, waiting to be refined into its purest form.`,

    // Paragraph 3: Your approach - SHORT
    `Your meticulous nature means you see layers of possibility that others miss entirely. You question "Why is it done this way?" not to be difficult, but because you genuinely see how it could be better.`,

    // Paragraph 4: Real examples - SHORT
    `This shows up everywhere. You're the one who stays late perfecting the presentation after everyone else has moved on. In relationships, you don't do casual—your intensity means you either care deeply or not at all.`,

    // Paragraph 5: The edge case - SHORT
    `People might call you a perfectionist, but that misses the point. You're not chasing arbitrary standards; you're revealing what something could become if someone actually cared enough to see it through. The challenge isn't your focus—it's remembering that not everything deserves that level of intensity.`,
  ],
};

/**
 * Template for Fire-O (Yang Fire / 丙火)
 */
const FIRE_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Fire-O',
  paragraphs: [
    // Paragraph 1: Core energy - SHORT
    `You're driven by radiant, outward-directed energy. Like the sun, your presence naturally draws attention and illuminates everything around you. Where others need to "warm up" socially or professionally, you're already at full brightness.`,

    // Paragraph 2: How it manifests - SHORT
    `As a Catalyst, you spark change wherever you go. Your expressive nature means ideas don't stay theoretical—they become conversations, projects, movements.`,

    // Paragraph 3: Your approach - SHORT
    `You're the person who says "Why don't we just..." and suddenly everyone is mobilized around a vision they didn't even have ten minutes ago. You move fast, think big, and inspire others through sheer enthusiasm.`,

    // Paragraph 4: Real examples - SHORT
    `You're energized by variety and new challenges—staying too long on one thing feels like dimming your light. You think out loud, process through conversation, and often discover what you believe by hearing yourself say it.`,

    // Paragraph 5: The edge case - SHORT
    `People might tell you to "focus more" or "finish what you start," but they're missing that your gift isn't in the deep dive—it's in the spark. The challenge isn't your breadth—it's learning to sustain intensity after the initial excitement fades, and recognizing which fires are worth tending versus which ones can burn out naturally.`,
  ],
};

/**
 * Template for Water-I (Yin Water / 癸水)
 */
const WATER_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Water-I',
  paragraphs: [
    `You're driven by intuitive depth. Like morning dew that seeps into everything, you perceive patterns and emotions that others miss entirely. This isn't about being emotional—it's about understanding the hidden currents beneath the surface.`,
    
    `As an Oracle, you don't just observe—you sense what's coming. Your intuitive nature means you pick up on subtle shifts in mood, intention, and timing before they become obvious to others.`,
    
    `You naturally understand people's unspoken needs and motivations. Where others see random events, you see patterns and connections that reveal deeper truths.`,
    
    `This shows up everywhere. You're the one who "just knew" something was off before anyone else noticed. In conversations, you read between the lines, catching what people really mean beneath their words.`,
    
    `People might call you "too sensitive," but that misses the point. Your sensitivity is precision—you're attuned to frequencies others can't detect. The challenge isn't your intuition—it's trusting it when others dismiss what you sense as "just a feeling."`,
  ],
};

/**
 * Template for Water-O (Yang Water / 壬水)
 */
const WATER_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Water-O',
  paragraphs: [
    `You're driven by strategic flow. Like ocean currents that shape coastlines, your mind naturally finds paths through complexity that others can't see. This isn't luck—it's navigation.`,
    
    `As a Navigator, you don't force solutions—you find them. Your strategic nature means you see multiple routes to any goal, adapting your approach as conditions change.`,
    
    `You think in systems and networks, understanding how different pieces connect and influence each other. Where others see obstacles, you see opportunities to redirect and flow around resistance.`,
    
    `This shows up in how you solve problems. You're the one who finds the elegant solution everyone else missed, the shortcut that wasn't obvious, the connection nobody thought to make.`,
    
    `People might say you're "all over the place," but they're missing your method. You're not scattered—you're exploring all possible channels before committing your full force. The challenge isn't your adaptability—it's choosing which path to fully commit to once you've mapped the terrain.`,
  ],
};

/**
 * Template for Wood-I (Yin Wood / 乙木)
 */
const WOOD_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Wood-I',
  paragraphs: [
    `You're driven by adaptive growth. Like a vine that finds its way around any obstacle, you naturally navigate resistance without confronting it directly. This isn't weakness—it's strategic flexibility.`,
    
    `As a Diplomat, you don't break through barriers—you grow around them. Your diplomatic nature means you achieve goals through relationships, influence, and patient positioning rather than force.`,
    
    `You understand that the fastest path isn't always a straight line. Where others exhaust themselves pushing against walls, you find the gaps, the allies, the indirect routes that get you where you're going.`,
    
    `This shows up in how you operate. You're the one who builds consensus, finds common ground, and makes things happen through connection rather than confrontation.`,
    
    `People might think you're "too accommodating," but they're missing your strategy. You're not avoiding conflict—you're choosing battles worth fighting and bypassing those that aren't. The challenge isn't your flexibility—it's maintaining your direction when bending around too many obstacles.`,
  ],
};

/**
 * Template for Wood-O (Yang Wood / 甲木)
 */
const WOOD_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Wood-O',
  paragraphs: [
    `You're driven by pioneering ambition. Like a tall tree that grows upward and outward, you naturally lead, initiate, and stand visible. This isn't ego—it's your authentic way of existing in the world.`,
    
    `As a Trailblazer, you don't wait for permission—you create the path. Your pioneering nature means you see possibilities before they're obvious and move toward them while others are still planning.`,
    
    `You grow by moving forward and upward, not by adapting or retreating. Where others hedge and calculate, you commit and build, trusting that momentum creates opportunities.`,
    
    `This shows up in your approach to everything. You're the one who starts the project, launches the initiative, and says "let's do this" when everyone else is still debating feasibility.`,
    
    `People might say you're "too direct" or "too ambitious," but they're missing your clarity. You're not reckless—you simply see the destination and refuse to waste time on doubt. The challenge isn't your ambition—it's remembering to build roots while you reach for the sky.`,
  ],
};

/**
 * Template for Earth-I (Yin Earth / 己土)
 */
const EARTH_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Earth-I',
  paragraphs: [
    `You're driven by nurturing cultivation. Like fertile soil that helps things grow, you naturally create conditions for others to develop and thrive. This isn't servitude—it's your unique form of power.`,
    
    `As a Cultivator, you don't impose structure—you enable growth. Your supportive nature means you see potential in people and situations, then provide what's needed for that potential to manifest.`,
    
    `You understand that real influence comes through helping others succeed. Where others seek direct control, you shape outcomes by enriching the environment and empowering the right people.`,
    
    `This shows up in how you work. You're the one who develops talent, builds teams, and creates systems that help others perform at their best. Your success comes through others' success.`,
    
    `People might think you're "too giving," but they're missing your strategy. You're not sacrificing—you're investing in compounding returns. The challenge isn't your generosity—it's ensuring you're cultivating relationships and projects worthy of your energy.`,
  ],
};

/**
 * Template for Earth-O (Yang Earth / 戊土)
 */
const EARTH_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Earth-O',
  paragraphs: [
    `You're driven by grounded presence. Like a mountain that stands unchanged through seasons, you naturally provide stability, structure, and reliable strength. This isn't stubbornness—it's foundation.`,
    
    `As a Guardian, you don't chase trends—you hold ground. Your steadfast nature means people and projects can build on you, knowing you won't shift unpredictably.`,
    
    `You provide the immovable center that allows everything else to function. Where others waver with changing conditions, you remain constant, giving others something solid to anchor to.`,
    
    `This shows up everywhere you go. You're the one people turn to in crisis, the reliable presence that doesn't panic, the foundation that holds when everything else shakes.`,
    
    `People might call you "inflexible," but they're missing your value. You're not rigid—you're deliberate about what's worth changing and what's worth protecting. The challenge isn't your stability—it's recognizing when the ground itself needs to shift.`,
  ],
};

/**
 * Template for Metal-I (Yin Metal / 辛金)
 */
const METAL_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Metal-I',
  paragraphs: [
    `You're driven by refined precision. Like a carefully cut diamond, you naturally identify and create quality, value, and beauty through meticulous attention. This isn't pickiness—it's craftsmanship.`,
    
    `As an Artisan, you don't mass-produce—you perfect. Your discerning nature means you see the difference between good and exceptional, and you're unwilling to settle for less when excellence is possible.`,
    
    `You understand that real value comes from careful refinement. Where others rush to finish, you invest time in details that transform something ordinary into something remarkable.`,
    
    `This shows up in everything you touch. You're the one who notices the small things that make the difference, who polishes until it shines, who refuses to release work that isn't truly ready.`,
    
    `People might say you're "too particular," but they're missing your gift. You're not being difficult—you're maintaining standards that create lasting value. The challenge isn't your precision—it's knowing when "excellent" is better than "perfect."`,
  ],
};

/**
 * Template for Metal-O (Yang Metal / 庚金)
 */
const METAL_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Metal-O',
  paragraphs: [
    `You're driven by decisive clarity. Like a sword that cuts through with precision, you naturally see what needs to be done and act on it directly. This isn't aggression—it's efficiency.`,
    
    `As an Architect, you don't dance around issues—you address them. Your decisive nature means you cut through ambiguity, politics, and confusion to get to the core of what matters.`,
    
    `You have strong principles and clear judgment. Where others waffle and compromise endlessly, you evaluate, decide, and execute—trusting your assessment and taking responsibility for the outcome.`,
    
    `This shows up in how you operate. You're the one who makes the tough call, delivers the hard truth, and takes action when everyone else is still debating.`,
    
    `People might call you "too harsh" or "too rigid," but they're missing your integrity. You're not being mean—you're being honest and efficient. The challenge isn't your directness—it's remembering that not every situation requires a blade, and some problems dissolve rather than being cut.`,
  ],
};

/**
 * All Day Master templates
 */
export const WHO_YOU_ARE_TEMPLATES: Record<string, WhoYouAreTemplate> = {
  'Fire-I': FIRE_I_TEMPLATE,
  'Fire-O': FIRE_O_TEMPLATE,
  'Water-I': WATER_I_TEMPLATE,
  'Water-O': WATER_O_TEMPLATE,
  'Wood-I': WOOD_I_TEMPLATE,
  'Wood-O': WOOD_O_TEMPLATE,
  'Earth-I': EARTH_I_TEMPLATE,
  'Earth-O': EARTH_O_TEMPLATE,
  'Metal-I': METAL_I_TEMPLATE,
  'Metal-O': METAL_O_TEMPLATE,
};

