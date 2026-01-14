/**
 * Life Themes templates for natal report
 * Covers 5 traditional fortune areas: Career, Wealth, Relationships, Health, Learning
 * One template per Day Master (10 total)
 */

export interface LifeThemeItem {
  title: string; // Section title
  emoji: string; // Visual icon
  description: string; // 2-3 sentences explaining how this type shows up (BASE template)
  examples?: string[]; // 5-7 specific examples (job titles, income styles, etc.)
  advice?: string[]; // 3-4 actionable tips
  environments?: string; // For career: work settings
  warningAreas?: string; // For health: areas to watch
  personalInsights?: string[]; // NEW: Dynamic additions unique to user's chart (Ten Gods, Patterns, Stars, Elements)
}

export interface LifeThemesTemplate {
  code: string; // "Fire-I", "Fire-O", etc.
  career: LifeThemeItem; // 사업운
  wealth: LifeThemeItem; // 재물운
  relationships: LifeThemeItem; // 연애운
  health: LifeThemeItem; // 건강운
  learning: LifeThemeItem; // 학업운
}

/**
 * Life Themes for Fire-I (Yin Fire / 丁火) - The Focused Refiner
 * 
 * Key Characteristics:
 * - Concentrated, inward-burning intensity
 * - Transformative through refinement
 * - Quality over quantity
 * - Depth over breadth
 * - Meticulous attention to detail
 */
const FIRE_I_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Fire-I',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at precision work requiring deep expertise and refinement. Quality matters more than speed—you thrive in roles where excellence is valued over output volume. You need autonomy to perfect your craft without constant interruptions, and you perform best when given time to dive deep into complex problems.',
    examples: [
      'Quality Assurance Engineer',
      'Research Scientist',
      'Copy Editor / Proofreader',
      'Master Craftsperson (woodworking, metalwork)',
      'Product Designer (UX/UI)',
      'Technical Writer / Documentation Specialist',
      'Code Reviewer / Software Debugger',
      'Lab Technician / Analyst',
      'Jewelry Designer',
      'Sound Engineer'
    ],
    environments:
      'Small focused teams, independent contractor work, R&D labs, design studios, remote roles with deep focus time, companies that value craftsmanship over speed',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You earn through skill mastery and reputation, not volume or hustle. Premium pricing for refined work is your path—clients pay for your expertise and attention to detail. Your income grows steadily as your reputation for quality deepens. You\'re not built for get-rich-quick schemes or high-volume sales; sustainable wealth comes from becoming the best at what you do.',
    examples: [
      'High-ticket consulting ($200-500+/hour)',
      'Specialized contract work (premium rates for expertise)',
      'Craft/artisan products with premium pricing',
      'Expert coaching or specialized mentoring',
      'Royalties from carefully crafted content',
      'Niche technical expertise (rare skills = high demand)',
      'Freelance editing or design (quality reputation)',
      'Premium service businesses (boutique agencies)'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You need depth over breadth in all relationships. Casual doesn\'t work for you—you either care deeply or not at all. You bond through shared intensity, mutual respect for craft, and meaningful one-on-one time. Small talk feels draining; you want real connection. Your relationships may be fewer, but they run deep. You\'re loyal, attentive, and fully present when you commit.',
    advice: [
      'Seek partners who respect your need for focused alone time',
      'Don\'t mistake your intensity for inflexibility—learn to adapt',
      'Share your process with loved ones so they understand your focus',
      'Remember: not every interaction needs to be profound',
      'Schedule quality time deliberately—you won\'t do it spontaneously',
      'Your attention is your love language—give it consciously'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your concentrated mental intensity takes a physical toll if unmanaged. You dive so deep into work that you forget basic needs—eating, sleeping, moving. Your inward-burning energy can lead to burnout, eye strain, and tension from prolonged sitting. You need structured breaks because you won\'t take them naturally. Physical movement is essential to balance your mental fire.',
    advice: [
      'Use timers to force breaks every 90 minutes',
      'Physical exercise to discharge mental tension (yoga, walking, swimming)',
      'Protect your eyes: 20-20-20 rule (every 20 min, look 20 feet away for 20 sec)',
      'Watch caffeine—you\'ll overdo it to maintain focus',
      'Establish a firm bedtime routine (insomnia from overthinking is common)',
      'Stretch regularly to prevent posture issues'
    ],
    warningAreas:
      'Eye strain, tension headaches, insomnia from mental overactivity, digestive issues from irregular eating, lower back pain from prolonged sitting, burnout from not pacing yourself',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn through deep, deliberate practice—not skimming or cramming. Mastery over breadth. You need time to digest, experiment, and perfect before moving on. Structured learning environments that reward depth work best for you. You thrive in one-on-one settings or small seminars where you can ask detailed questions. Self-paced courses where you can go deep are ideal.',
    examples: [
      'Graduate-level research programs',
      'Traditional apprenticeships (hands-on mastery)',
      'Deep technical courses (not surface-level tutorials)',
      'One-on-one mentorship with experts',
      'Self-paced online programs with high standards',
      'Certification programs requiring mastery',
      'Specialized bootcamps (coding, design, craft)',
      'University extension courses (focused, specific topics)'
    ],
  },
};

/**
 * Life Themes for Fire-O (Yang Fire / 丙火) - The Radiant Catalyst
 * 
 * Key Characteristics:
 * - Outward-radiating energy and charisma
 * - Natural initiator and catalyst
 * - High visibility and influence
 * - Fast starter but needs sustainability support
 * - Inspiring and energizing to others
 */
const FIRE_O_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Fire-O',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at starting things, leading people, and creating momentum. Your natural charisma and energy make you effective in visible, high-influence roles. You thrive in environments where you can inspire, initiate, and catalyze change. Best when paired with strong executors who handle follow-through while you generate ideas and direction.',
    examples: [
      'Sales Leader / Business Development',
      'Startup Founder / Entrepreneur',
      'Marketing Director / Brand Strategist',
      'Public Speaker / Motivational Coach',
      'Creative Director',
      'Event Producer / Promoter',
      'Teacher / Workshop Facilitator',
      'Content Creator / Influencer',
      'Political Campaigner',
      'Product Launch Specialist'
    ],
    environments:
      'Fast-paced startups, sales-driven companies, creative agencies, public-facing roles, entrepreneurship, media and entertainment, consulting firms with visibility',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You generate wealth through influence, network, and momentum creation. Multiple income streams work better than one stable job—you thrive on variety and opportunity. Your earning potential is high but can be inconsistent without structure. Best strategy: monetize your visibility and ability to start things, then partner with implementers for sustainability.',
    examples: [
      'Commission-based sales (high upside)',
      'Equity in startups (founder or early employee)',
      'Speaking fees and workshops',
      'Brand partnerships and sponsorships',
      'Multiple business ventures simultaneously',
      'Consulting retainers (selling vision and strategy)',
      'Online course creation (selling enthusiasm)',
      'Affiliate marketing (leveraging network)'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You bring excitement, warmth, and energy to relationships. People are drawn to your charisma and passion. You fall fast and love intensely—but sustaining that initial spark requires conscious effort. You need partners who can match your energy or ground your intensity. Boredom is your enemy; novelty and shared adventures keep you engaged.',
    advice: [
      'Partner with someone who appreciates your spontaneity but adds stability',
      'Schedule date nights—you won\'t maintain routines naturally',
      'Your enthusiasm is contagious, but listen actively too',
      'Don\'t mistake initial spark for long-term compatibility',
      'Cultivate depth alongside excitement (the flame needs fuel)',
      'Be honest about your need for variety and stimulation'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'You burn hot and bright—but burnout is your primary risk. Your high-energy output is unsustainable without recovery periods. You tend to push through exhaustion until you crash. Your immune system weakens when overextended. Learning to pace yourself is critical for long-term vitality. You need regular physical discharge for your intense energy.',
    advice: [
      'Build recovery time into your schedule (treat it as non-negotiable)',
      'High-intensity exercise to match your energy (HIIT, sports, dance)',
      'Watch for adrenal fatigue from constant high output',
      'Sleep hygiene is crucial (your mind races at night)',
      'Limit stimulants—you already run hot naturally',
      'Take real vacations (not working vacations)'
    ],
    warningAreas:
      'Burnout and exhaustion, weakened immune system from overwork, stress-related inflammation, cardiovascular strain from constant intensity, sleep disruption from overstimulation, digestive issues from irregular eating',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn best through active engagement, discussion, and real-world application. Passive lectures bore you—you need interaction, movement, and immediate relevance. You grasp concepts quickly but may not retain details without reinforcement. Group learning energizes you. Short, intense learning sprints work better than long, slow study. You excel when you can teach others immediately after learning.',
    examples: [
      'Interactive workshops and seminars',
      'Bootcamp-style intensive programs',
      'Study groups and peer learning',
      'On-the-job training (learning by doing)',
      'Short-form video courses (micro-learning)',
      'Teaching or presenting to solidify knowledge',
      'Debate and discussion-based classes',
      'Experiential learning (travel, immersion)'
    ],
  },
};

/**
 * Life Themes for Water-I (Yin Water / 癸水) - The Intuitive Oracle
 * 
 * Key Characteristics:
 * - Deep intuition and perceptiveness
 * - High emotional intelligence
 * - Subtle, indirect influence
 * - Adaptable like mist or dew
 * - Sensitive to undercurrents and unspoken dynamics
 */
const WATER_I_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Water-I',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at reading people, sensing patterns, and understanding hidden dynamics. Your intuitive gifts make you invaluable in roles requiring emotional intelligence, timing, and nuanced understanding. You thrive in one-on-one settings or small teams where depth matters more than scale. Best in supportive or advisory roles where your insights guide decisions.',
    examples: [
      'Therapist / Counselor / Psychologist',
      'Human Resources Specialist',
      'User Researcher / UX Researcher',
      'Mediator / Conflict Resolution Specialist',
      'Strategic Advisor / Consultant',
      'Talent Scout / Recruiter',
      'Social Worker',
      'Life Coach / Career Coach',
      'Market Research Analyst',
      'Cultural Consultant'
    ],
    environments:
      'Healthcare and counseling, HR departments, research institutions, nonprofits, small consulting firms, remote work with flexible hours, environments valuing emotional intelligence',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You earn through insight, timing, and understanding people\'s needs. Your wealth comes from being in the right place at the right time, reading markets or people correctly. You\'re not built for aggressive hustle—you build wealth through patient positioning and knowing when to act. Service-based income where you solve complex interpersonal or emotional problems works best.',
    examples: [
      'Coaching and counseling services',
      'Consulting on timing and strategy',
      'Matchmaking or relationship services',
      'Intuitive advising (career, life transitions)',
      'Recruitment fees (finding right-fit talent)',
      'Freelance research and insights',
      'Writing about psychology or human behavior',
      'Healing or wellness services'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You feel deeply and sense your partner\'s needs before they speak them. This makes you an incredibly attentive, caring partner—but also vulnerable to absorbing their emotional state. You need partners who reciprocate your emotional depth and respect your sensitivity. You bond through emotional intimacy and shared vulnerability. Surface-level connections leave you empty.',
    advice: [
      'Set emotional boundaries—you absorb others\' feelings too easily',
      'Seek partners who value emotional intelligence',
      'Don\'t sacrifice your needs to keep the peace',
      'Your intuition is usually right—trust it in relationships',
      'Regular alone time to process and recharge is essential',
      'Communicate directly sometimes—subtlety isn\'t always received'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your emotional sensitivity makes you vulnerable to stress and anxiety. You absorb the energy of your environment and the people around you, which can be draining. Your physical health is directly tied to your emotional state—unresolved feelings manifest physically. You need regular emotional processing and a calm, supportive environment to stay well.',
    advice: [
      'Establish strong emotional boundaries to prevent energy drain',
      'Regular therapy or journaling to process feelings',
      'Calming practices: meditation, gentle yoga, nature walks',
      'Protect your sleep—emotional overload disrupts rest',
      'Limit exposure to negative or chaotic environments',
      'Stay hydrated (Water element—physical hydration matters)'
    ],
    warningAreas:
      'Anxiety and emotional overwhelm, stress-related digestive issues, weakened immune system from emotional drain, insomnia from overthinking, chronic fatigue from absorbing others\' energy, psychosomatic symptoms',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn through osmosis, observation, and emotional connection to material. You absorb information from your environment naturally. One-on-one learning with a mentor you trust works best—you need emotional safety to learn deeply. You excel at subjects involving human behavior, patterns, and systems thinking. Time to reflect and integrate is essential.',
    examples: [
      'Mentorship and apprenticeship models',
      'Psychology and social sciences',
      'Case study-based learning (real human stories)',
      'Reflective practices (journaling while learning)',
      'Small seminar-style classes',
      'Self-paced online learning with community',
      'Immersive experiences (cultural, therapeutic)',
      'Learning through observation and shadowing'
    ],
  },
};

/**
 * Life Themes for Water-O (Yang Water / 壬水) - The Strategic Navigator
 * 
 * Key Characteristics:
 * - Strategic, systems-level thinking
 * - Adaptive intelligence and flexibility
 * - Big-picture understanding
 * - Flows around obstacles
 * - Powerful but patient like ocean currents
 */
const WATER_O_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Water-O',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at strategy, systems design, and navigating complexity. Your ability to see multiple paths and adapt makes you invaluable in uncertain, changing environments. You thrive in roles requiring big-picture thinking, organizational design, or long-term planning. Best when you can shape strategy without getting bogged down in execution details.',
    examples: [
      'Strategic Consultant / Management Consultant',
      'Chief Strategy Officer',
      'Business Analyst / Systems Analyst',
      'Product Strategist',
      'Urban Planner / Policy Analyst',
      'Investment Strategist',
      'Organizational Development Specialist',
      'Operations Manager',
      'Game Designer (systems thinking)',
      'Supply Chain Strategist'
    ],
    environments:
      'Consulting firms, corporate strategy departments, tech companies (product strategy), government policy, think tanks, finance and investment, fast-changing industries requiring adaptation',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You build wealth through strategic positioning, diversification, and patience. You see opportunities others miss by understanding systems and flow. Multiple income streams and long-term investments suit you better than single big bets. Your wealth compounds over time as you continuously adapt to changing conditions. Risk management through flexibility is your edge.',
    examples: [
      'Diversified investment portfolios',
      'Strategic consulting (high-value advisory)',
      'Building multiple businesses over time',
      'Real estate investing (patient accumulation)',
      'Options and derivatives trading (systems understanding)',
      'Advisory board positions (strategic insight)',
      'Royalties from intellectual property',
      'Passive income through scalable systems'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You approach relationships strategically, perhaps too much so. You analyze patterns and optimize—but intimacy requires vulnerability, not just intelligence. You need partners who can draw out your emotional side and appreciate your depth without feeling managed. You\'re loyal and protective but can seem detached. Your love shows through problem-solving and long-term commitment.',
    advice: [
      'Share feelings, not just analysis—vulnerability builds intimacy',
      'Resist the urge to "solve" your partner—sometimes they just need presence',
      'Your strategic mind can make you seem calculating—soften your approach',
      'Commit fully when you choose—your flexibility can read as distance',
      'Balance planning with spontaneity in relationships',
      'Express affection directly, not just through actions'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your mental intensity and tendency to overthink can manifest as stress and tension. You\'re prone to analysis paralysis, which creates anxiety. Your adaptive nature means you often neglect your body\'s signals while focusing on strategy. You need physical movement to discharge mental energy and prevent stagnation. Kidney and bladder health (Water organs) require attention.',
    advice: [
      'Regular cardiovascular exercise to move stagnant energy',
      'Swimming or water-based activities (elemental alignment)',
      'Mindfulness to quiet the strategic mind',
      'Stay hydrated—chronic dehydration is common',
      'Address stress before it becomes chronic',
      'Regular health checkups (you ignore symptoms while strategizing)'
    ],
    warningAreas:
      'Chronic stress and anxiety from overthinking, kidney and urinary system issues, lower back pain from tension, high blood pressure from mental strain, sleep disruption from racing thoughts, chronic fatigue from mental overwork',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn through systems thinking, pattern recognition, and connecting disparate concepts. You excel at synthesizing complex information into coherent frameworks. You prefer self-directed learning where you can explore connections at your own pace. Case studies, simulations, and real-world problem-solving engage you more than rote memorization.',
    examples: [
      'MBA programs and business strategy courses',
      'Systems thinking and complexity science',
      'Self-paced online learning with freedom to explore',
      'Case study competitions and simulations',
      'Strategy games and scenario planning exercises',
      'Interdisciplinary studies (connecting fields)',
      'Executive education programs',
      'Reading widely across domains to find patterns'
    ],
  },
};

/**
 * Life Themes for Wood-I (Yin Wood / 乙木) - The Diplomatic Climber
 * 
 * Key Characteristics:
 * - Flexible and adaptive like vines
 * - Grows through relationships and positioning
 * - Diplomatic and indirect approach
 * - Patient and strategic in advancement
 * - Thrives by finding the right support
 */
const WOOD_I_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Wood-I',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at building relationships, navigating politics, and advancing through strategic positioning. Your diplomatic skills and ability to adapt make you effective in complex social environments. You thrive in roles requiring networking, relationship management, and consensus-building. Success comes through patience, timing, and knowing whose support to cultivate.',
    examples: [
      'Account Manager / Client Relations',
      'Diplomat / Foreign Service Officer',
      'Public Relations Specialist',
      'Community Manager',
      'Partnership Development',
      'Fundraising / Development Officer',
      'Executive Assistant to leadership',
      'Talent Agent / Artist Manager',
      'Lobbyist / Government Relations',
      'Customer Success Manager'
    ],
    environments:
      'Relationship-driven companies, nonprofits, agencies (PR, talent), diplomatic corps, customer-facing roles, networking-heavy industries, companies with matrix organizations',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You build wealth through relationships, connections, and strategic partnerships. Your network is your net worth. You earn by facilitating connections, managing relationships, and positioning yourself in the right circles. Relationship-based businesses and commission structures suit you. Wealth accumulates steadily as your network deepens and your reputation for being well-connected grows.',
    examples: [
      'Commission-based sales through relationships',
      'Real estate (relationship-driven market)',
      'Affiliate and partnership income',
      'Referral-based businesses',
      'Networking and introduction fees',
      'Event planning and coordination',
      'Broker or agent roles (connecting parties)',
      'Joint ventures and profit-sharing arrangements'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You approach relationships with diplomacy and adaptability. You\'re skilled at reading what others need and adjusting accordingly—but this can lead to losing yourself in relationships. You need partners who encourage your independence and don\'t require constant accommodation. You bond through shared social circles and mutual friends. Harmony matters deeply to you.',
    advice: [
      'Maintain your identity—don\'t over-adapt to partners',
      'Choose partners who value your diplomatic skills, not just benefit from them',
      'It\'s okay to disagree—conflict doesn\'t mean the relationship is failing',
      'Your flexibility is strength, but have non-negotiables',
      'Surround yourself with friends who support your relationship',
      'Don\'t avoid difficult conversations to keep peace'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your tendency to adapt to others can lead to stress from suppressed needs and emotions. You may avoid conflict to the point of internal tension. Your flexibility serves you well, but chronic accommodation without boundaries creates health issues. Liver and gallbladder (Wood organs) are vulnerable. You need movement and flow—stagnation causes problems.',
    advice: [
      'Yoga and stretching (flexibility is your nature—use it physically)',
      'Express emotions rather than suppressing them',
      'Set boundaries to prevent resentment buildup',
      'Regular movement to prevent stagnation (walks, dance)',
      'Liver-supporting practices (limit alcohol, eat greens)',
      'Speak up about your needs before resentment builds'
    ],
    warningAreas:
      'Stress from unexpressed emotions, liver and digestive issues, tension headaches from suppressed conflict, joint and tendon problems from stagnation, anxiety from people-pleasing, chronic fatigue from over-adaptation',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn best in collaborative, social environments where relationships support learning. Study groups energize you. You absorb knowledge through discussion, mentorship, and observing respected figures. You need connection to material—stories and human context make concepts stick. Learning in isolation feels harder; you thrive with peer support and guidance.',
    examples: [
      'Study groups and collaborative learning',
      'Mentorship programs (learning from relationships)',
      'Networking events and conferences',
      'Peer-to-peer learning platforms',
      'Social learning apps (community-based)',
      'Internships and apprenticeships (relationship-based)',
      'MBA and executive programs (cohort model)',
      'Learning through teaching and explaining to others'
    ],
  },
};

/**
 * Life Themes for Wood-O (Yang Wood / 甲木) - The Pioneering Trailblazer
 * 
 * Key Characteristics:
 * - Bold and direct like towering trees
 * - Natural pioneer and leader
 * - Growth-oriented and ambitious
 * - Strong and upward-reaching
 * - Can be stubborn and inflexible
 */
const WOOD_O_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Wood-O',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at starting new initiatives, leading teams, and blazing trails. Your boldness and directness make you effective in roles requiring courage, vision, and decisive action. You thrive in entrepreneurial environments or leadership positions where you can set direction. You\'re not built for following—you need autonomy and the freedom to forge your own path.',
    examples: [
      'Entrepreneur / Startup Founder',
      'Executive Leader (CEO, VP)',
      'Project Leader / Program Director',
      'Business Development (new markets)',
      'Pioneering Researcher',
      'Military Officer / Commander',
      'Expedition Leader / Explorer',
      'Activist / Movement Organizer',
      'Real Estate Developer',
      'Innovation Director'
    ],
    environments:
      'Startups and entrepreneurship, leadership positions, pioneering industries (green tech, space), military and structured leadership, new market development, anywhere requiring bold initiative',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You build wealth through bold moves, expansion, and seizing opportunities that others fear. You\'re willing to take calculated risks for growth. Entrepreneurship and equity stakes suit you better than salary. Your wealth comes from building, not managing—you create new value rather than optimizing existing systems. Growth-focused investing aligns with your nature.',
    examples: [
      'Startup equity and entrepreneurship',
      'Real estate development (building new)',
      'Growth stock investing',
      'Venture capital and angel investing',
      'Building and selling businesses',
      'Franchise development and expansion',
      'New market entry and territory building',
      'Commission-based roles with unlimited upside'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You approach relationships with honesty and directness. You lead naturally, even in partnerships, and need partners who can match your strength or appreciate your direction. You\'re protective and loyal but can be dominating if not careful. You bond through shared adventures and mutual respect. You need independence even in committed relationships.',
    advice: [
      'Balance leadership with partnership—not every decision is yours',
      'Your directness can feel harsh—soften your delivery sometimes',
      'Choose partners who have their own strength and direction',
      'Make space for your partner to lead sometimes',
      'Your stubbornness can damage relationships—practice flexibility',
      'Express affection, not just protection'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your driven nature can lead to pushing your body beyond healthy limits. You ignore warning signs in pursuit of goals. Your liver and tendons (Wood organs) are vulnerable from constant forward drive without rest. You need vigorous physical activity to channel your energy, but also structured recovery. Stubbornness can prevent you from seeking help when needed.',
    advice: [
      'Vigorous exercise to channel your drive (running, martial arts, team sports)',
      'Scheduled rest days—treat recovery as seriously as training',
      'Address injuries promptly (don\'t push through)',
      'Stretching to prevent tendon issues from intensity',
      'Manage stress through physical outlets, not just willpower',
      'Regular health checkups (don\'t wait for crisis)'
    ],
    warningAreas:
      'Overuse injuries from pushing too hard, liver stress from intensity, tendon and ligament strains, high blood pressure from constant drive, headaches from tension, burnout from refusing to rest',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn through action, challenge, and real-world application. Theoretical learning bores you—you want practical, applicable knowledge. You excel in competitive learning environments where you can prove yourself. You need clear goals and measurable progress. Leadership development, business strategy, and skill-based learning engage you most.',
    examples: [
      'Executive MBA and leadership programs',
      'Military academy and officer training',
      'Competitive certifications (CFA, PMP)',
      'Action-based learning (simulations, challenges)',
      'Entrepreneurship bootcamps',
      'Learning through building and launching projects',
      'Sports and physical training (discipline transfers)',
      'Outdoor leadership programs (Outward Bound)'
    ],
  },
};

/**
 * Life Themes for Earth-I (Yin Earth / 己土) - The Nurturing Cultivator
 * 
 * Key Characteristics:
 * - Nurturing and supportive like fertile soil
 * - Patient cultivation of talent and relationships
 * - Creates conditions for others to thrive
 * - Productive and resourceful
 * - Can over-accommodate to own detriment
 */
const EARTH_I_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Earth-I',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at developing talent, building teams, and creating supportive environments. Your success comes through empowering others—you make people better. You thrive in management, mentoring, and roles where patience and cultivation lead to long-term results. You build sustainable systems and relationships that compound over time.',
    examples: [
      'People Manager / Team Leader',
      'Mentor / Executive Coach',
      'Teacher / Professor',
      'Human Resources Director',
      'Nonprofit Program Director',
      'Talent Development Specialist',
      'Community Organizer',
      'Training and Development Manager',
      'School Administrator',
      'Organizational Development Consultant'
    ],
    environments:
      'Education institutions, nonprofit organizations, people-focused companies, HR departments, coaching and development firms, community organizations, anywhere valuing long-term talent cultivation',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You build wealth slowly and sustainably through patience, relationships, and compounding efforts. You\'re not seeking quick wins—you plant seeds that grow over time. Real estate, long-term investments, and businesses built on strong foundations suit you. Your wealth often comes through helping others succeed first. Passive income through systems you\'ve built works well.',
    examples: [
      'Real estate investing (patient appreciation)',
      'Dividend-paying stocks (compound growth)',
      'Building training or coaching businesses',
      'Creating educational products or courses',
      'Franchise ownership (systems-based)',
      'Rental income from property management',
      'Consulting retainers with long-term clients',
      'Revenue-sharing from developed talent'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You nurture and support your loved ones naturally—but can lose yourself in caretaking. You create safe spaces for partners to grow and thrive. You bond through acts of service and patient support. You need partners who reciprocate care and don\'t take advantage of your giving nature. Your love is steady, loyal, and enduring.',
    advice: [
      'Establish boundaries—giving without receiving creates resentment',
      'Choose partners who nurture you back',
      'Your acts of service are love—but also use words',
      'It\'s okay to ask for what you need directly',
      'Don\'t enable dependence—empower independence',
      'Self-care isn\'t selfish—you can\'t pour from an empty cup'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your tendency to care for others while neglecting yourself creates health issues. You give until depleted. Your digestive system (Earth organ) is vulnerable—stress manifests there first. You need regular nourishment, both physical and emotional. Grounding practices and maintaining your own reserves are essential for long-term health.',
    advice: [
      'Prioritize regular, nourishing meals (you skip them when busy)',
      'Set firm boundaries on caretaking energy',
      'Grounding practices: gardening, walking barefoot, nature time',
      'Address digestive issues early (stress shows up here)',
      'Regular rest days—caregiving is exhausting',
      'Say no to protect your health reserves'
    ],
    warningAreas:
      'Digestive issues from stress and irregular eating, chronic fatigue from over-giving, weight gain from emotional eating, weakened immunity from depletion, anxiety from boundary issues, burnout from caretaker exhaustion',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn through patient practice, repetition, and hands-on application. You build solid foundations before moving forward. You excel in structured, cumulative learning where each concept builds on the last. Teaching others solidifies your own knowledge. You need supportive learning environments where mistakes are safe.',
    examples: [
      'Teaching certification and pedagogy',
      'Gradual skill-building programs',
      'Hands-on training with mentorship',
      'Community college and extension courses',
      'Peer learning in supportive cohorts',
      'Long-term degree programs (steady progress)',
      'Learning through creating educational content',
      'Workshops focused on practical application'
    ],
  },
};

/**
 * Life Themes for Earth-O (Yang Earth / 戊土) - The Steadfast Guardian
 * 
 * Key Characteristics:
 * - Solid and stable like mountains
 * - Protective and reliable
 * - Grounded and practical in approach
 * - Creates security and foundation for others
 * - Can be rigid and resistant to change
 */
const EARTH_O_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Earth-O',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at providing stability, reliability, and foundational strength. Your ability to remain calm in crisis makes you invaluable in high-pressure environments. You thrive in roles requiring consistency, security, and practical execution. You build things that last—infrastructure, systems, and organizations with solid foundations.',
    examples: [
      'Operations Manager / COO',
      'Project Manager (execution focus)',
      'Security Director / Risk Manager',
      'Infrastructure Engineer',
      'Construction Manager',
      'Logistics and Supply Chain Manager',
      'Quality Control Director',
      'Facilities Manager',
      'Emergency Response Coordinator',
      'Compliance Officer'
    ],
    environments:
      'Manufacturing and operations, construction and engineering, logistics and supply chain, security and risk management, government and infrastructure, established companies valuing stability',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You build wealth through reliability, practical investments, and steady accumulation. You\'re not a risk-taker—you prefer proven, stable paths to prosperity. Real assets (property, tangible goods) feel safer than volatile markets. Your wealth comes from consistent execution and protecting what you\'ve built. Conservative strategies with long time horizons work best.',
    examples: [
      'Rental property and real estate holdings',
      'Government bonds and stable investments',
      'Blue-chip dividend stocks',
      'Owning essential services businesses',
      'Commodities and tangible assets',
      'Franchise ownership (proven systems)',
      'Pension and retirement fund building',
      'Fixed income from reliable sources'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You provide security, stability, and protection in relationships. You\'re the rock others lean on. You show love through actions and reliability—you\'re there when needed. You need partners who appreciate your steadiness and don\'t mistake it for lack of passion. You bond through building something together and facing challenges as a team.',
    advice: [
      'Balance stability with openness to change',
      'Your protective nature can feel controlling—give space',
      'Show vulnerability—strength doesn\'t mean never needing support',
      'Compromise sometimes—your way isn\'t always the only way',
      'Express affection verbally, not just through provision',
      'Let partners contribute—you don\'t have to carry everything'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your stability can become stagnation if you don\'t maintain movement and flexibility. You\'re prone to weight gain and digestive slowness from lack of activity. Your strength makes you ignore health issues until they become serious. Your spleen and stomach (Earth organs) need attention. You need consistent, sustainable health routines rather than intense bursts.',
    advice: [
      'Regular moderate exercise (walking, steady cardio, strength training)',
      'Don\'t ignore warning signs—your toughness is your weakness',
      'Healthy eating routines (you gravitate toward comfort food)',
      'Flexibility training to counter rigidity (yoga, stretching)',
      'Regular preventive health checkups',
      'Movement breaks if you have sedentary work'
    ],
    warningAreas:
      'Weight gain from sedentary lifestyle, digestive issues from poor diet, joint stiffness from lack of movement, high cholesterol from rich foods, diabetes risk from comfort eating, delayed treatment from ignoring symptoms',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn through structured, proven methods and hands-on experience. You trust established curricula and credible institutions. You build knowledge systematically, layer by layer. You excel in practical, applied learning rather than abstract theory. You need to see how knowledge will be used before you commit to learning it.',
    examples: [
      'Traditional university degrees',
      'Vocational and technical training',
      'Professional certifications (PMP, Six Sigma)',
      'Military training programs',
      'Trade apprenticeships',
      'Structured corporate training',
      'Engineering and applied sciences',
      'Learning through manuals and proven procedures'
    ],
  },
};

/**
 * Life Themes for Metal-I (Yin Metal / 辛金) - The Precise Artisan
 * 
 * Key Characteristics:
 * - Refined discernment and aesthetic sense
 * - Precision and attention to detail
 * - Creates beauty and elegance
 * - High standards for quality
 * - Can be critical and perfectionist
 */
const METAL_I_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Metal-I',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at work requiring taste, refinement, and attention to aesthetic detail. Your ability to distinguish quality from mediocrity makes you invaluable in creative and precision fields. You thrive in roles where beauty, elegance, and craftsmanship matter. You need autonomy to perfect your work without compromise. Excellence is non-negotiable.',
    examples: [
      'Graphic Designer / UI/UX Designer',
      'Jewelry Designer / Goldsmith',
      'Architect (aesthetic focus)',
      'Fashion Designer / Stylist',
      'Art Director',
      'Fine Dining Chef / Pastry Chef',
      'Photographer / Cinematographer',
      'Interior Designer',
      'Copywriter (precision language)',
      'Museum Curator'
    ],
    environments:
      'Design studios, luxury brands, creative agencies, boutique firms, high-end hospitality, art and culture institutions, anywhere quality and aesthetics are paramount',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You earn through specialized skills, refined taste, and creating premium products or services. You command higher prices for superior quality—your clients pay for refinement and excellence. Your wealth comes from mastery in a specific domain where few can match your standards. Niche expertise and luxury markets suit you best.',
    examples: [
      'Premium design services (luxury pricing)',
      'Fine art creation and sales',
      'Luxury goods and high-end products',
      'Specialized consulting (taste and curation)',
      'Custom craftsmanship (bespoke pricing)',
      'High-end real estate styling',
      'Premium content creation (refined aesthetic)',
      'Expert curation and connoisseurship'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You seek refinement and quality in relationships as in all things. You\'re drawn to elegant, cultured partners who share your appreciation for beauty. You show love through thoughtful gestures and creating aesthetic experiences. You need partners who match your standards but don\'t make you feel judged. Superficiality repels you; you want depth with elegance.',
    advice: [
      'Not everyone shares your standards—accept differences',
      'Your critical eye can make partners feel inadequate—soften',
      'Show appreciation for effort, not just perfection',
      'Your love language is quality time and thoughtful gestures—communicate this',
      'Don\'t let perfectionism prevent intimacy',
      'Find beauty in imperfection sometimes'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your perfectionism creates stress and tension in your body. Your critical nature turns inward, making you overly harsh on yourself. Your lungs and respiratory system (Metal organs) are vulnerable, especially to stress and environmental toxins. You need refinement in your health practices too—quality nutrition, clean environments, and elegant movement practices.',
    advice: [
      'Mindful practices to quiet self-criticism (meditation, journaling)',
      'Clean air and environment (lungs are sensitive)',
      'Quality nutrition over convenience (your body deserves refinement)',
      'Elegant movement practices (Pilates, ballet, tai chi)',
      'Skincare and self-care rituals (align with your aesthetic nature)',
      'Address perfectionism with therapy or coaching'
    ],
    warningAreas:
      'Respiratory issues from stress or environment, anxiety from self-criticism, skin problems from internal tension, weakened immunity from perfectionist stress, insomnia from overthinking, eating disorders from body image issues',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn through observation, refinement, and studying masters. You appreciate elegant explanations and beautiful presentations of ideas. You need high-quality learning materials and instructors—mediocre teaching frustrates you. You excel in creative and aesthetic subjects. You learn by refining your work through countless iterations.',
    examples: [
      'Fine arts education (conservatory, design school)',
      'Master classes with renowned experts',
      'Aesthetic subjects (art history, design, architecture)',
      'High-quality online courses with excellent production',
      'One-on-one coaching with masters',
      'Apprenticeships with craftspeople',
      'Cultural immersion and travel (aesthetic exposure)',
      'Learning through creating and refining portfolio work'
    ],
  },
};

/**
 * Life Themes for Metal-O (Yang Metal / 庚金) - The Decisive Architect
 * 
 * Key Characteristics:
 * - Clear judgment and decisiveness
 * - Structural thinking and systems design
 * - Principled and firm
 * - Creates order from chaos
 * - Can be harsh and inflexible
 */
const METAL_O_LIFE_THEMES: LifeThemesTemplate = {
  code: 'Metal-O',
  career: {
    title: 'Career & Work',
    emoji: '💼',
    description:
      'You excel at making tough decisions, creating structure, and bringing order to chaos. Your clarity and conviction make you effective in leadership, crisis management, and roles requiring firm judgment. You thrive in environments needing clear direction and decisive action. You build frameworks, systems, and organizations with solid bones.',
    examples: [
      'Executive Leadership (CEO, General Counsel)',
      'Judge / Legal Professional',
      'Systems Architect / Technical Architect',
      'Strategic Planner',
      'Management Consultant (restructuring)',
      'Crisis Manager / Turnaround Specialist',
      'Military Leadership',
      'Compliance and Ethics Officer',
      'Organizational Designer',
      'Investment Banker (deal structuring)'
    ],
    environments:
      'Law firms, executive suites, consulting firms, military, finance and investment banking, tech companies (architecture roles), anywhere requiring decisive leadership and structural thinking',
  },
  wealth: {
    title: 'Money & Wealth',
    emoji: '💰',
    description:
      'You build wealth through decisive action, structural investments, and value creation through reorganization. You see opportunities in broken systems that need fixing. Your wealth comes from clear strategy, disciplined execution, and the courage to make tough calls. You excel at structuring deals and creating frameworks for value generation.',
    examples: [
      'Private equity and restructuring',
      'Real estate development (large-scale)',
      'Business turnarounds and acquisitions',
      'High-stakes consulting fees',
      'Legal partnership (senior level)',
      'Executive compensation and equity',
      'Infrastructure investing',
      'Building systems-based businesses'
    ],
  },
  relationships: {
    title: 'Love & Relationships',
    emoji: '❤️',
    description:
      'You bring clarity, protection, and strong boundaries to relationships. Your partner knows where they stand—you\'re direct and honest. You show love through providing, protecting, and solving problems. You need partners who respect your principles and don\'t need you to be soft all the time. You bond through mutual respect and shared values.',
    advice: [
      'Soften your delivery—truth doesn\'t require harshness',
      'Vulnerability isn\'t weakness—let your guard down',
      'Your partner needs emotional connection, not just solutions',
      'Flexibility in relationships doesn\'t mean abandoning principles',
      'Express warmth and affection, not just respect',
      'Apologize when wrong—your integrity demands it'
    ],
  },
  health: {
    title: 'Health & Wellness',
    emoji: '🏥',
    description:
      'Your rigid discipline can become inflexibility that stresses your body. You push through pain and ignore signals—your toughness is your vulnerability. Your lungs and respiratory system (Metal organs) are susceptible. Your intense focus creates physical tension. You need structured fitness but also recovery and flexibility work.',
    advice: [
      'Structured fitness with proper recovery (don\'t overtrain)',
      'Breathing exercises for lung health and stress',
      'Flexibility training to counter rigidity (yoga, mobility work)',
      'Address respiratory issues promptly',
      'Schedule downtime—rest is part of performance',
      'Regular massages or bodywork to release tension'
    ],
    warningAreas:
      'Respiratory issues from stress, muscle tension from rigidity, overuse injuries from intense training, high blood pressure from intensity, skin problems from internal heat, delayed healing from pushing through injuries',
  },
  learning: {
    title: 'Learning & Growth',
    emoji: '🧠',
    description:
      'You learn through structured systems, clear frameworks, and logical progression. You excel at understanding architectures and first principles. You need organized, efficient learning—wasted time frustrates you. You value credentials and proven methodologies. You learn by building frameworks and teaching others with clarity.',
    examples: [
      'Law school and legal education',
      'MBA and executive education',
      'Engineering and computer science',
      'Military academies',
      'Professional certifications (CPA, CFA, PE)',
      'Systems thinking and architecture courses',
      'Philosophy and ethics (principled thinking)',
      'Learning through building frameworks and models'
    ],
  },
};

/**
 * All Day Master life theme templates
 */
export const LIFE_THEMES_TEMPLATES: Record<string, LifeThemesTemplate> = {
  'Fire-I': FIRE_I_LIFE_THEMES,
  'Fire-O': FIRE_O_LIFE_THEMES,
  'Water-I': WATER_I_LIFE_THEMES,
  'Water-O': WATER_O_LIFE_THEMES,
  'Wood-I': WOOD_I_LIFE_THEMES,
  'Wood-O': WOOD_O_LIFE_THEMES,
  'Earth-I': EARTH_I_LIFE_THEMES,
  'Earth-O': EARTH_O_LIFE_THEMES,
  'Metal-I': METAL_I_LIFE_THEMES,
  'Metal-O': METAL_O_LIFE_THEMES,
};

