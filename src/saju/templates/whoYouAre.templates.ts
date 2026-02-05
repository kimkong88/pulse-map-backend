/**
 * "Who You Are" section templates for natal report
 * One template per Day Master (10 total)
 * 
 * These are EXTREMELY PERSONAL hooks - the top-level entry point for users
 * Must include: rarity (use {rarity} placeholder), naturally embedded pros/cons, and make them feel seen
 * 
 * Rarity is calculated dynamically in getWhoYouAreContent() using calculateRarity()
 * which considers: Day Master type, patterns, element distribution, and special stars
 * The {rarity} placeholder will be replaced with actual "1 in X" value (e.g., "1 in 1,800,000")
 */

export interface WhoYouAreTemplate {
  code: string; // "Fire-I", "Fire-O", etc.
  paragraphs: string[]; // Full paragraphs with naturally embedded pros/cons (use {rarity} placeholder)
}

/**
 * Template for Fire-I (Yin Fire / 丁火)
 */
const FIRE_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Fire-I',
  paragraphs: [
    `You're the one who stays late perfecting the presentation after everyone else has moved on. Only {rarity} people share your exact combination of Fire-I Day Master type, element distribution, and special traits—that intense focus that uncovers insights others miss entirely isn't a flaw, it's what makes you exceptional.`,
    
    `Your meticulous nature means you see layers of possibility that others don't. You question "Why is it done this way?" not to be difficult, but because you genuinely see how it could be better. This transformative vision elevates ordinary work into something remarkable—your uncompromising quality is why people trust your work.`,
    
    `But here's the thing: that same deep focus that makes you exceptional can also blind you to bigger opportunities. You might perfect something that ultimately doesn't matter, missing the bigger picture. And your high standards? They can prevent you from shipping work that's "good enough," delaying progress while you refine endlessly.`,
    
    `In relationships, you don't do casual—your intensity means you either care deeply or not at all. This creates powerful connections, but it also means you struggle to delegate. You fear others won't meet your standards, creating bottlenecks that limit your growth.`,
    
    `People might call you a perfectionist, but that misses the point. You're not chasing arbitrary standards; you're revealing what something could become if someone actually cared enough to see it through. The challenge isn't your focus—it's remembering that not everything deserves that level of intensity, and sometimes done beats perfect.`,
  ],
};

/**
 * Template for Fire-O (Yang Fire / 丙火)
 */
const FIRE_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Fire-O',
  paragraphs: [
    `You're the person who says "Why don't we just..." and suddenly everyone is mobilized around a vision they didn't even have ten minutes ago. Only {rarity} people share your exact combination of Fire-O Day Master type, element distribution, and special traits—that natural charisma that draws people in and inspires action? It's contagious.`,
    
    `Your radiant energy means ideas don't stay theoretical—they become conversations, projects, movements. You move fast, think big, and inspire others through sheer enthusiasm. This ability to spark change and turn ideas into reality quickly is your superpower.`,
    
    `But here's what you know deep down: sustaining focus on long-term projects is hard. You're energized by variety and new challenges—staying too long on one thing feels like dimming your light. You tend to start many things but finish few, and spreading your energy too thin risks burning you out.`,
    
    `You think out loud, process through conversation, and often discover what you believe by hearing yourself say it. This makes you an incredible catalyst, but people might tell you to "focus more" or "finish what you start." They're missing that your gift isn't in the deep dive—it's in the spark.`,
    
    `The challenge isn't your breadth—it's learning to sustain intensity after the initial excitement fades, and recognizing which fires are worth tending versus which ones can burn out naturally. Your enthusiasm energizes teams and creates momentum, but you need to choose which sparks to fan into flames.`,
  ],
};

/**
 * Template for Water-I (Yin Water / 癸水)
 */
const WATER_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Water-I',
  paragraphs: [
    `You're the one who "just knew" something was off before anyone else noticed. Only {rarity} people share your exact combination of Water-I Day Master type, element distribution, and special traits—that deep intuition that reads between the lines and senses what's coming? It's precision that others can't detect.`,
    
    `Like morning dew that seeps into everything, you perceive patterns and emotions that others miss entirely. You pick up on subtle shifts in mood, intention, and timing before they become obvious. This ability to understand unspoken needs and hidden motivations reveals deeper truths that others can't see.`,
    
    `But here's the flip side: that same intuitive depth can paralyze you. Overthinking becomes a trap—you see so many possibilities and patterns that making decisions feels overwhelming. And you tend to absorb others' emotions and energy, leaving you drained when you should be protected.`,
    
    `In conversations, you read between the lines, catching what people really mean beneath their words. This pattern recognition is powerful, but you struggle to trust your intuition when others dismiss what you sense as "just a feeling." You know you're right, but their doubt makes you second-guess yourself.`,
    
    `People might call you "too sensitive," but that misses the point. Your sensitivity is precision—you're attuned to frequencies others can't detect. The challenge isn't your intuition—it's trusting it when others dismiss it, and learning to protect your energy from the emotions you naturally absorb.`,
  ],
};

/**
 * Template for Water-O (Yang Water / 壬水)
 */
const WATER_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Water-O',
  paragraphs: [
    `You're the one who finds the elegant solution everyone else missed, the shortcut that wasn't obvious. Only {rarity} people share your exact combination of Water-O Day Master type, element distribution, and special traits—your strategic mind navigates complexity others can't see.`,
    
    `Like ocean currents that shape coastlines, your mind naturally finds paths through complexity. You see multiple routes to any goal, adapting your approach as conditions change. This strategic thinking and systems-level understanding sees connections others miss entirely.`,
    
    `But here's what trips you up: you explore too many options before committing. You think in systems and networks, understanding how different pieces connect, but this can make you appear scattered or indecisive. You're not—you're mapping all possible channels before committing your full force.`,
    
    `You flow around obstacles instead of forcing through them, which is brilliant, but it also means you struggle to choose which path to fully commit to once you've mapped the terrain. Where others see obstacles, you see opportunities to redirect—but sometimes you need to pick a direction and go.`,
    
    `People might say you're "all over the place," but they're missing your method. You're not scattered—you're exploring strategically. The challenge isn't your adaptability—it's choosing which path to fully commit to once you've mapped the terrain, and trusting that one good path is better than perfect knowledge of all paths.`,
  ],
};

/**
 * Template for Wood-I (Yin Wood / 乙木)
 */
const WOOD_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Wood-I',
  paragraphs: [
    `You're the one who builds consensus and makes things happen through connection rather than confrontation. Only {rarity} people share your exact combination of Wood-I Day Master type, element distribution, and special traits—your diplomatic approach isn't weakness, it's strategic power.`,
    
    `Like a vine that finds its way around any obstacle, you naturally navigate resistance without confronting it directly. Your diplomatic skills build consensus and find common ground where others see conflict. This strategic flexibility grows around obstacles, achieving goals through relationships and influence rather than force.`,
    
    `But here's the tension: people might think you're "too accommodating" or avoiding conflict. You're not—you're choosing battles worth fighting and bypassing those that aren't. However, this can make it hard to maintain your direction when you're bending around too many obstacles. You take indirect routes even when direct action might be needed.`,
    
    `You understand that the fastest path isn't always a straight line. Where others exhaust themselves pushing against walls, you find the gaps, the allies, the indirect routes. This ability to achieve goals through relationships and influence is powerful, but it can also make you lose sight of what you actually want.`,
    
    `The challenge isn't your flexibility—it's maintaining your direction when bending around obstacles, and recognizing when a direct approach would serve you better than another diplomatic maneuver. Your strategic power comes from knowing when to grow around and when to stand firm.`,
  ],
};

/**
 * Template for Wood-O (Yang Wood / 甲木)
 */
const WOOD_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Wood-O',
  paragraphs: [
    `You're the one who starts the project and says "let's do this" when everyone else is still debating. Only {rarity} people share your exact combination of Wood-O Day Master type, element distribution, and special traits—your ambition isn't ego, it's your authentic way of leading.`,
    
    `Like a tall tree that grows upward and outward, you naturally lead, initiate, and stand visible. Your pioneering vision sees possibilities before they're obvious, and you move toward them while others are still planning. This momentum-driven approach creates opportunities through action—your natural leadership initiates paths others follow.`,
    
    `But here's what you know: you tend to move too fast without building proper foundations. You grow by moving forward and upward, not by adapting or retreating, but this can leave you without the roots you need to sustain growth. You commit and build, trusting momentum creates opportunities, but sometimes you need to slow down.`,
    
    `People might say you're "too direct" or "too ambitious," but they're missing your clarity. You're not reckless—you simply see the destination and refuse to waste time on doubt. However, this can make you appear too aggressive to others, and you struggle to slow down and build roots while reaching for the sky.`,
    
    `The challenge isn't your ambition—it's remembering to build roots while you reach for the sky. Your pioneering nature is powerful, but sustainable growth requires both upward momentum and deep foundations. You see the destination clearly; now make sure you're building the path to get there.`,
  ],
};

/**
 * Template for Earth-I (Yin Earth / 己土)
 */
const EARTH_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Earth-I',
  paragraphs: [
    `You're the one who develops talent and builds teams that perform at their best. Only {rarity} people share your exact combination of Earth-I Day Master type, element distribution, and special traits—your success comes through others' success, and this isn't servitude, it's your unique form of power.`,
    
    `Like fertile soil that helps things grow, you naturally create conditions for others to develop and thrive. Your supportive nature sees potential in people and situations, then provides what's needed for that potential to manifest. This natural ability to cultivate and develop others' potential creates influence through empowerment rather than direct control.`,
    
    `But here's the risk: you can be taken advantage of by those who don't appreciate your support. You tend to give too much without ensuring worthy returns, and you struggle to set boundaries when cultivating relationships. Your generosity is powerful, but it can also leave you depleted if you're not careful.`,
    
    `You understand that real influence comes through helping others succeed. Where others seek direct control, you shape outcomes by enriching the environment and empowering the right people. This creates compounding returns, but only if you're cultivating relationships and projects worthy of your energy.`,
    
    `People might think you're "too giving," but they're missing your strategy. You're not sacrificing—you're investing. The challenge isn't your generosity—it's ensuring you're cultivating relationships and projects worthy of your energy, and learning to set boundaries so your support doesn't become exploitation.`,
  ],
};

/**
 * Template for Earth-O (Yang Earth / 戊土)
 */
const EARTH_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Earth-O',
  paragraphs: [
    `You're the one people turn to in crisis, the reliable presence that doesn't panic. Only {rarity} people share your exact combination of Earth-O Day Master type, element distribution, and special traits—that grounded presence that provides stability and structure isn't stubbornness, it's foundation.`,
    
    `Like a mountain that stands unchanged through seasons, you naturally provide stability, structure, and reliable strength. People and projects can build on you, knowing you won't shift unpredictably. You provide the immovable center that allows everything else to function—where others waver, you remain constant.`,
    
    `But here's the tension: people might call you "inflexible" or "too rigid." You're not—you're deliberate about what's worth changing and what's worth protecting. However, this steadfast nature can make it hard to recognize when the ground itself needs to shift. You hold ground when others chase trends, but sometimes the ground needs to move.`,
    
    `Your reliability is your superpower. You're the foundation that holds when everything else shakes, the person who doesn't panic in crisis. This creates trust and stability, but it can also make you resistant to necessary change. You're deliberate, but sometimes deliberation becomes stagnation.`,
    
    `The challenge isn't your stability—it's recognizing when the ground itself needs to shift. Your steadfast nature is valuable, but real strength comes from knowing when to hold firm and when to adapt. You provide the foundation others need; now make sure that foundation can evolve when necessary.`,
  ],
};

/**
 * Template for Metal-I (Yin Metal / 辛金)
 */
const METAL_I_TEMPLATE: WhoYouAreTemplate = {
  code: 'Metal-I',
  paragraphs: [
    `You're the one who notices the small things that make the difference, who polishes until it shines. Only {rarity} people share your exact combination of Metal-I Day Master type, element distribution, and special traits—that refined precision that creates quality and beauty isn't pickiness, it's craftsmanship.`,
    
    `Like a carefully cut diamond, you naturally identify and create quality, value, and beauty through meticulous attention. Your discerning nature sees the difference between good and exceptional, and you're unwilling to settle for less when excellence is possible. This attention to detail transforms ordinary work into something remarkable.`,
    
    `But here's what you know: that same precision that creates lasting value can also trap you. You invest time in details that transform work, but you might also refuse to release work that isn't "truly ready"—even when it's excellent. You see the difference between good and exceptional, but sometimes "excellent" is better than "perfect."`,
    
    `You don't mass-produce—you perfect. This makes your work trusted and valued, but it can also mean you move slower than others. Where others rush to finish, you refine. This creates lasting value, but it can also delay opportunities while you polish endlessly.`,
    
    `People might say you're "too particular," but they're missing your gift. You're not being difficult—you're maintaining standards that create lasting value. The challenge isn't your precision—it's knowing when "excellent" is better than "perfect," and recognizing that sometimes done is better than perfect.`,
  ],
};

/**
 * Template for Metal-O (Yang Metal / 庚金)
 */
const METAL_O_TEMPLATE: WhoYouAreTemplate = {
  code: 'Metal-O',
  paragraphs: [
    `You're the one who makes the tough call, delivers the hard truth, and takes action when everyone else is still debating. Only {rarity} people share your exact combination of Metal-O Day Master type, element distribution, and special traits—that decisive clarity that cuts through confusion isn't aggression, it's efficiency.`,
    
    `Like a sword that cuts through with precision, you naturally see what needs to be done and act on it directly. Your decisive nature cuts through ambiguity, politics, and confusion to get to the core of what matters. You have strong principles and clear judgment—where others waffle, you evaluate, decide, and execute.`,
    
    `But here's the tension: people might call you "too harsh" or "too rigid." You're not being mean—you're being honest and efficient. However, this directness can make you forget that not every situation requires a blade. Some problems dissolve rather than being cut, and your decisive clarity can miss the nuance that softer approaches might reveal.`,
    
    `You don't dance around issues—you address them. This creates clarity and momentum, but it can also create friction. Your integrity is powerful, but your directness can make others feel attacked even when you're just being clear. You trust your assessment and take responsibility, but sometimes the assessment needs more input.`,
    
    `The challenge isn't your directness—it's remembering that not every situation requires a blade, and some problems dissolve rather than being cut. Your decisive clarity is valuable, but real strength comes from knowing when to cut through and when to let things unfold. You make the tough calls; now make sure you're choosing the right tools for each situation.`,
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
