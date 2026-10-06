import { BlogArticle } from '../models/models';

export const BLOG_SERIES_META = {
  tagline: 'Every business starts as a problem someone refused to ignore.',
  hashtag: '#FromIdeaToImpact',
  ctaText: 'Read the next part of the journey →',
  eyebrow: 'NEC E-CELL · INSIGHTS',
  title: 'Ideas worth exploring.\nProblems worth solving.',
  subtitle: 'Stories, frameworks and practical insights for students building what comes next.',
  seriesTitle: 'FROM IDEA TO IMPACT',
  seriesSubtitle: 'A 4-Part Entrepreneurship Series for Student Founders',
  stages: [
    { num: '01', label: 'SPOT THE PROBLEM', slug: 'from-idea-to-impact-part-1-spot-the-problem', kicker: 'Problem Discovery' },
    { num: '02', label: 'VALIDATE', slug: 'from-idea-to-impact-part-2-validate-before-you-build', kicker: 'Customer Discovery' },
    { num: '03', label: 'BUILD', slug: 'from-idea-to-impact-part-3-building-the-business', kicker: 'Business Model' },
    { num: '04', label: 'CREATE SUSTAINABLE IMPACT', slug: 'from-idea-to-impact-part-4-sustainable-growth', kicker: 'Scale & Impact' },
  ],
};

export const BLOG_ARTICLES: BlogArticle[] = [
  // ARTICLE 1
  {
    id: 'from-idea-to-impact-part-1',
    slug: 'from-idea-to-impact-part-1-spot-the-problem',
    series: 'From Idea to Impact',
    seriesPart: 1,
    totalParts: 4,
    week: 'Week 1',
    readTime: '5–7 min read',
    category: 'Problem Discovery',
    title: 'Before You Build a Startup, Learn to Spot the Problem',
    subtitle: 'Great startups don\'t begin with brilliant ideas — they begin with everyday friction that someone refused to ignore.',
    author: 'NEC E-Cell Editorial',
    date: '2026-10-06',
    publishedAt: 'October 6, 2026',
    heroTagline: 'Opportunity is hidden inside the ordinary.',
    heroConcept: 'split-frame',
    introParagraphs: [
      `You've probably had this exact conversation. You're standing outside your hostel, waiting fifteen minutes for a cab that should have taken two, and someone says, "Somebody should build an app for this." Then everyone laughs, moves on, and forgets about it by dinner.`,
      `Somewhere in Gurgaon in 2014, three former consultants had a version of that same conversation — except they didn't move on. Abhiraj Singh Bhal, Varun Khaitan, and Raghav Chandra kept noticing that while booking a cab or ordering food had become effortless, finding a reliable plumber, electrician, or beautician was still a frustrating, word-of-mouth gamble. That observation, repeated enough times to stop feeling like small talk, became Urban Company — now a publicly listed company serving customers across India and abroad.`,
      `The difference between a hostel joke and a company wasn't a flash of genius. It was the decision to take an everyday annoyance seriously enough to investigate it.`,
      `That's where every entrepreneurial journey actually starts — not with an idea, but with a problem someone noticed and refused to let go of.`
    ],
    sections: [
      {
        id: 'ideas-are-cheap-problems-are-data',
        heading: 'Ideas Are Cheap. Problems Are Data.',
        paragraphs: [
          `Most people think entrepreneurship begins with a "brilliant idea" — some solution nobody's thought of before. In practice, it almost always begins the other way around: someone notices a problem that keeps recurring, and only later does a solution take shape.`,
          `This matters because ideas and problems behave very differently.`,
          `An idea is a guess about what might work. A problem is evidence that something isn't working. When you start from a problem, you already have a reason to build — someone is dealing with real friction, wasting time, money, or effort. When you start from an idea alone, you're hoping a problem exists to justify it. That's a much weaker starting position, and it's why so many "cool idea" ventures quietly die: they were solutions in search of a problem, not the other way around.`,
          `Nithin Kamath's story with Zerodha follows the same pattern from a completely different industry. Before co-founding India's largest discount broker, Kamath spent close to a decade as a trader and sub-broker, including a period where he lost the majority of his trading capital. That experience gave him and his brother Nikhil years of first-hand exposure to what was broken about retail stockbroking in India: high, opaque brokerage fees, poor transparency, and a system that made it hard for ordinary people to participate in the market. Zerodha's name — "zero" plus the Sanskrit word for barrier — was a direct response to problems they had personally lived through, not a concept they brainstormed on a whiteboard.`,
          `Notice what both stories have in common. Neither founder set out to "disrupt" an industry. They were close enough to a problem, for long enough, to understand it better than the people currently ignoring it.`
        ],
        pullQuote: {
          quote: 'An idea is a guess about what might work. A problem is evidence that something isn\'t working.',
          author: 'NEC E-Cell Editorial'
        },
        caseStudy: {
          company: 'Zerodha',
          founders: 'Nithin Kamath & Nikhil Kamath',
          foundedYear: '2010',
          headline: 'Built from a decade of personal trading friction',
          narrative: [
            'Before co-founding India\'s largest discount broker, Nithin Kamath spent close to a decade trading in retail markets.',
            'He experienced high opaque brokerage fees, lack of transparency, and high entry barriers firsthand.',
            'Zerodha (Zero + Rodha/Barrier) directly eliminated the friction he personally lived through.'
          ]
        }
      },
      {
        id: 'where-real-problems-come-from',
        heading: 'Where Real Problems Come From',
        paragraphs: [
          `If you're looking for a business opportunity, you're looking in the wrong place. Opportunities aren't found — they surface, usually through one of these:`
        ],
        listItems: [
          `Personal frustration: You experience a problem directly and assume everyone just puts up with it. Kamath's years as a struggling trader are a textbook example.`,
          `Observation of other people's friction: You notice someone else repeatedly struggling with something, even if it doesn't affect you directly. Urban Company's founders weren't personally unable to find electricians — they observed how widespread and repetitive this frustration was across their social circle.`,
          `Changing behaviour that hasn't been served yet: Sometimes the problem isn't new — it's that people's habits have shifted faster than the market has. When affordable smartphones and cheap data reached small-town India, millions of first-time internet users came online with very different needs, language preferences, and trust patterns than the urban, English-speaking customer most apps were built for. That shift itself became fertile ground for new businesses built around regional language, voice search, and low-bandwidth design.`,
          `Unmet needs hiding behind a bad workaround: If people are already cobbling together an awkward solution — spreadsheets, WhatsApp groups, personal favours — that workaround is a signal. It tells you the need is real enough that people will tolerate an inconvenient fix. The absence of a "proper" solution isn't proof nobody wants one; often it's proof nobody has looked closely enough yet.`
        ],
        infographic: {
          id: 'problem-sources-diagram',
          type: 'sources-radial',
          title: 'The 4 Sources of Real Business Opportunities',
          subtitle: 'Where real startup ideas actually come from',
          content: {
            nodes: [
              { label: 'Personal Frustration', desc: 'Experiencing friction directly (e.g. Zerodha)' },
              { label: 'Observed Friction', desc: 'Watching others struggle (e.g. Urban Company)' },
              { label: 'Changing Behaviour', desc: 'New habits outpacing market solutions' },
              { label: 'Bad Workarounds', desc: 'Spreadsheets, WhatsApp groups, manual fixes' }
            ],
            center: 'Problem Worth Solving'
          }
        }
      },
      {
        id: 'an-idea-is-not-the-same-as-an-opportunity',
        heading: 'An Idea Is Not the Same as an Opportunity',
        paragraphs: [
          `This distinction trips up almost every first-time founder, so it's worth stating plainly.`,
          `An idea is "what if there was an app for X." An opportunity is a specific problem, affecting a specific group of people, that is painful enough, frequent enough, and underserved enough that they would pay — with money, time, attention, or effort — for a better alternative.`,
          `The gap between the two is filled by questions, not enthusiasm:`
        ],
        listItems: [
          `Who exactly has this problem?`,
          `How often do they experience it?`,
          `What are they currently doing about it (nothing counts as an answer)?`,
          `How much pain, time, or money does the current approach cost them?`,
          `Is this problem getting better, worse, or staying the same on its own?`
        ],
        callout: {
          title: 'The Core Test',
          text: 'If you can\'t answer these questions with anything more specific than "everyone" and "always," you likely have an idea, not yet an opportunity.',
          icon: 'target'
        },
        infographic: {
          id: 'idea-vs-opportunity-chart',
          type: 'comparison',
          title: 'Idea vs. Opportunity Matrix',
          subtitle: 'Converting vague statements into validated opportunities',
          content: {
            leftTitle: 'Vague Idea Statement',
            rightTitle: 'Sharpened Opportunity Statement',
            rows: [
              { left: 'What if there was an app for finding plumbers?', right: 'Homeowners in tier-1 cities spend 3+ hours asking WhatsApp groups for verified plumbers because 60% of cold calls go unanswered.' },
              { left: 'Students need a better way to trade stocks.', right: 'Active retail traders lose 20-30% of profit to hidden brokerage fees and complex terminals.' },
              { left: 'An AI platform for student notes.', right: 'Final-year MBA students spend 8 hours/week manually transcribing case studies because current PDFs lack searchable keywords.' }
            ]
          }
        }
      },
      {
        id: 'how-to-train-yourself-to-notice-problems',
        heading: 'How to Train Yourself to Notice Problems',
        paragraphs: [
          `Spotting problems is a skill, not a personality trait, and it improves with deliberate practice. A few habits worth building:`
        ],
        listItems: [
          `Track your own irritations. Keep a running note — physical or digital — of every moment something takes longer, costs more, or works worse than it should. Most people feel this friction and forget it within minutes. Writing it down is what turns a fleeting annoyance into a dataset.`,
          `Watch how people actually behave, not how they say they behave. People are unreliable narrators of their own habits. If you want to understand a problem, watch what someone does when they hit it — which app they abandon, which step they skip, which workaround they reach for — rather than only asking them to describe it.`,
          `Talk to people outside your own bubble. Campus problems, urban middle-class problems, and English-speaking-India problems are heavily overrepresented in student entrepreneurship because they're the problems founders personally experience. Some of India's most consequential opportunities exist outside that bubble — in Tier 2 and Tier 3 cities, in informal-sector work, in regional-language contexts — precisely because fewer founders have looked there closely.`,
          `Ask "why hasn't this been fixed already?" Sometimes the honest answer is that it has been tried and failed for a structural reason — that's valuable information too. Other times, the answer is that nobody with the right access, timing, or technology has looked closely enough yet. Learning to tell these apart is a core entrepreneurial skill.`
        ]
      }
    ],
    studentExercise: {
      heading: 'FOR THE STUDENT ENTREPRENEUR',
      subtitle: 'You don\'t need funding, a co-founder, or a business plan to start this process. You need one week of attention.',
      items: [
        { num: '01', title: 'Observe 5 Recurring Problems', text: 'Observe five recurring problems around your campus, hostel, or daily commute — things that go wrong or feel inefficient more than once.' },
        { num: '02', title: 'Write One-Line Problem Statements', text: 'Write a one-line problem statement for each, in this format: "[Specific group of people] struggles with [specific problem] when [specific situation], because [specific reason]."' },
        { num: '03', title: 'Talk to 3 Affected People', text: 'Talk to three people who experience one of these problems and ask them to describe the last time it happened — not in general, but the actual last occurrence.' },
        { num: '04', title: 'Document Current Workarounds', text: 'Note what they currently use as a workaround — even if it\'s "I just deal with it."' },
        { num: '05', title: 'Select the Living Problem', text: 'Pick the problem that felt most alive in conversation — the one people had the most to say about — and write it up as your working problem statement for next week.' }
      ],
      outcome: 'By the end of this exercise, you won\'t have a business. You\'ll have something more useful: a problem statement grounded in real observation instead of assumption.'
    },
    nextArticleBridge: {
      heading: 'Next Week: Moving from Idea to Evidence',
      text: `Finding the problem is only the beginning. The next question is whether anyone actually wants the solution.\n\nIt's tempting, once you've identified a problem you care about, to jump straight into building. This is where most first-time founders lose months — or years — building something nobody asked for, because they fell in love with their own answer before testing whether the problem was as widespread, urgent, and unsolved as they assumed. Next week, we move from idea to evidence and look at how entrepreneurs validate a problem before writing a single line of code or spending a single rupee on production — including the story of an Indian startup that scrapped its entire original product after listening closely to its own users.`
    },
    sources: [
      { title: 'Urban Company — Elevation Capital founding story', url: 'https://www.elevationcapital.com/stories/urban-company-story' },
      { title: 'Urban Company, Wikipedia', url: 'https://en.wikipedia.org/wiki/Urban_Company' },
      { title: 'Zerodha founder story, Forbes', url: 'https://www.forbes.com/sites/anuraghunathan/2024/11/07/two-billionaire-brothers-zerodha-kamath-built-indias-l' },
      { title: 'Zerodha, Wikipedia', url: 'https://en.wikipedia.org/wiki/Zerodha' },
      { title: 'Startup India Prabhaav 9-Year Factbook, DPIIT', url: 'https://www.startupindia.gov.in/content/sih/en/Prabhaav.html' }
    ],
    seo: {
      title: 'Before You Build a Startup, Learn to Spot the Problem | NEC E-Cell',
      description: 'Great startups don\'t begin with ideas — they begin with problems. Learn how Indian entrepreneurs like Urban Company and Zerodha\'s founders spotted opportunity in everyday friction.',
      primaryKeyword: 'how to identify a business problem',
      secondaryKeywords: ['startup idea vs opportunity', 'entrepreneurship for college students', 'problem statement for startups', 'customer pain points India', 'first-time entrepreneur India'],
      suggestedSlug: '/from-idea-to-impact-part-1-spot-the-problem'
    },
    social: {
      linkedIn: 'Every founder story you admire started the same unglamorous way: someone got irritated by the same problem often enough to actually do something about it. In Part 1 of NEC E-Cell\'s new series, "From Idea to Impact," we break down how entrepreneurs like Urban Company\'s founders and Zerodha\'s Nithin Kamath spotted real, underserved problems long before they had a business plan — and how you can train yourself to do the same on your own campus this week. Read Part 1 and start noticing what everyone else is walking past. #FromIdeaToImpact',
      instagram: 'That thing that annoys you every single day on campus? That might be your first business idea. Swipe into Part 1 of our new 4-week series — From Idea to Impact — and learn how to spot a real problem before you build anything.',
      hashtags: ['#FromIdeaToImpact', '#NECEcell', '#StartupIndia', '#EntrepreneurshipJourney', '#CollegeFounders']
    },
    nextArticle: {
      part: 2,
      title: "Your Idea Isn't the Product. The Customer's Problem Is.",
      slug: 'from-idea-to-impact-part-2-validate-before-you-build',
      teaser: 'From spotting a problem to proving anyone will pay for the fix.'
    }
  },

  // ARTICLE 2
  {
    id: 'from-idea-to-impact-part-2',
    slug: 'from-idea-to-impact-part-2-validate-before-you-build',
    series: 'From Idea to Impact',
    seriesPart: 2,
    totalParts: 4,
    week: 'Week 2',
    readTime: '6–8 min read',
    category: 'Customer Discovery & Validation',
    title: "Your Idea Isn't the Product. The Customer's Problem Is.",
    subtitle: 'Before you spend months building software, learn how Meesho scrapped its original app after listening closely to real users.',
    author: 'NEC E-Cell Editorial',
    date: '2026-10-13',
    publishedAt: 'October 13, 2026',
    heroTagline: 'Validate the problem before you build the solution.',
    heroConcept: 'fork-in-road',
    introParagraphs: [
      `In December 2015, two IIT graduates named Vidit Aatrey and Sanjeev Barnwal launched a startup called Fashnear — an app meant to help people discover fashion boutiques near them. Vidit didn't just build the app and wait for users. He personally catalogued every item in every partner boutique, and for a stretch, he delivered the orders himself — specifically so he could hear customer feedback firsthand.`,
      `That decision to stay close to the ground is what saved the company, just not in the way he expected. Fashnear itself didn't work — boutique owners weren't tech-savvy enough to manage listings, customer acquisition costs were unsustainable, and the unit economics never added up. By most definitions, it had failed.`,
      `But while delivering those orders and interviewing boutique owners, Vidit and Sanjeev kept noticing something odd: a large share of their most active users were homemakers in smaller cities who were already reselling products to friends and family over WhatsApp and Facebook — with no formal tools, no catalogue, no payment system, just personal trust. In August 2016, the founders shut Fashnear down completely and rebuilt around that observation instead. The company they built next was Meesho — today one of India's most recognisable social commerce platforms.`,
      `The lesson here isn't "pivot when things go wrong." It's that Meesho only existed because its founders were close enough to real customers to notice what those customers were already doing — and humble enough to abandon their original idea when the evidence pointed elsewhere.`
    ],
    sections: [
      {
        id: 'falling-in-love-with-the-problem',
        heading: 'Falling in Love With the Problem, Not the Solution',
        paragraphs: [
          `If last week's article convinced you to go find a problem worth solving, this week comes with a warning: the moment you have a promising problem statement, the biggest risk shifts from "not finding a problem" to "falling in love with your own solution before testing it."`,
          `This is the single most common failure mode among first-time founders. You spend a weekend imagining the app, the interface, the business model — and by Monday, you're emotionally invested in an answer nobody has confirmed is correct. From there, every piece of customer feedback starts to feel like an attack instead of information.`,
          `The way out is a shift in mindset: your job in this stage isn't to prove your idea is good. It's to find out whether the problem is as real, frequent, and painful as you assumed — and to stay genuinely open to being wrong.`
        ],
        pullQuote: {
          quote: 'Your job in this stage isn\'t to prove your idea is good. It\'s to find out whether the problem is as real, frequent, and painful as you assumed.',
          author: 'NEC E-Cell Editorial'
        },
        caseStudy: {
          company: 'Meesho (formerly Fashnear)',
          founders: 'Vidit Aatrey & Sanjeev Barnwal',
          foundedYear: '2015',
          headline: 'From boutique delivery failure to multi-billion dollar social commerce',
          narrative: [
            'Fashnear launched as a hyperlocal boutique discovery app where founders personally catalogued inventory and delivered orders.',
            'While boutique discovery failed, they noticed homemakers reselling products over WhatsApp and Facebook.',
            'They completely scrapped Fashnear and built Meesho around what customers were ALREADY doing.'
          ]
        }
      },
      {
        id: 'customer-discovery',
        heading: 'Customer Discovery: Talking to People Before You Build Anything',
        paragraphs: [
          `Customer discovery is the structured practice of talking to potential users before you invest time or money building a solution. It sounds obvious, but most students skip it — because talking to strangers about their problems is slower and less exciting than opening a design tool.`,
          `A few principles make this process actually useful instead of a box-ticking exercise:`
        ],
        listItems: [
          `Ask about the past, not the future. "Would you use an app that does X?" is a weak question — people are generous and imprecise about hypotheticals. "Tell me about the last time you dealt with this problem" forces a real, specific memory, which is far more reliable data.`,
          `Listen for pain, not politeness. People are often too polite to say your idea sounds bad. Watch for what they complain about unprompted, what workaround they've built for themselves, and how much energy they spend describing the problem versus your proposed fix.`,
          `Talk to enough people that patterns emerge. One enthusiastic conversation proves nothing. If eight out of ten people you talk to describe the same friction in similar words, that's a pattern worth building around.`
        ],
        infographic: {
          id: 'questions-comparison-card',
          type: 'comparison',
          title: 'Weak Questions vs. Strong Discovery Questions',
          subtitle: 'How to structure customer interview questions',
          content: {
            leftTitle: 'Weak / Hypothetical Questions',
            rightTitle: 'Strong / Past-Behaviour Questions',
            rows: [
              { left: '"Would you buy an app that organizes campus notes?"', right: '"Walk me through how you prepared your notes for your last end-semester exam."' },
              { left: '"Do you think hostel laundry takes too long?"', right: '"When was the last time your clothes went missing or got delayed in laundry?"' },
              { left: '"How much would you pay for a daily lunch delivery?"', right: '"How much money did you spend on food delivery last week, and what forced you to order out?"' }
            ]
          }
        }
      },
      {
        id: 'building-an-mvp',
        heading: 'Building an MVP: The Smallest Thing That Tests Your Assumption',
        paragraphs: [
          `A Minimum Viable Product (MVP) is not a stripped-down version of your final product — it's the smallest possible experiment that tests whether your core assumption is true. Vidit personally cataloguing boutique inventory and playing delivery person wasn't an inefficiency to be automated away quickly; it was the MVP. It let the founders learn what mattered before they invested in scale.`,
          `This is a crucial reframe for student founders, who often think an MVP means "a basic version of the app." Sometimes the right MVP has no app at all — a WhatsApp group, a Google Form, a spreadsheet, or a founder manually doing the work a piece of software will eventually automate. The goal is speed of learning, not polish.`,
          `A useful test: for every feature or product decision, ask "what assumption does this test, and what would prove it wrong?" If you can't answer that, you're probably building too much, too early.`
        ],
        infographic: {
          id: 'mvp-spectrum-diagram',
          type: 'mvp-spectrum',
          title: 'The MVP Spectrum: From Manual to Code',
          subtitle: 'Choosing the smallest experiment to test your core assumption',
          content: {
            stages: [
              { name: 'Manual Service', desc: 'Doing the service by hand (Vidit delivering orders)', complexity: 'Low Code / Speed' },
              { name: 'WhatsApp / Google Form', desc: 'Collecting requests via no-code tools', complexity: 'No Tech Setup' },
              { name: 'Landing Page Waitlist', desc: 'Testing demand with a simple site', complexity: 'Fast Feedback' },
              { name: 'Concierge / Wizard-of-Oz', desc: 'Front-end looks automated, back-end is manual', complexity: 'High Learning' },
              { name: 'Custom Software Product', desc: 'Fully automated app (build ONLY after validation)', complexity: 'High Investment' }
            ]
          }
        }
      },
      {
        id: 'simple-validation-methods',
        heading: 'Simple Validation Methods Students Can Actually Use',
        paragraphs: [
          `You don't need a research budget or formal training to validate an idea. A few accessible methods:`
        ],
        listItems: [
          `Problem interviews: 15-minute conversations with people who match your target user, focused entirely on understanding their current experience — not pitching your solution.`,
          `Landing page tests: A single page describing your proposed solution, with a way to express interest (email signup, waitlist), to see if strangers — not just friends being polite — respond.`,
          `Concierge MVP: You personally deliver the service by hand, the way Vidit delivered orders himself, before automating any part of it.`,
          `Wizard-of-Oz MVP: The user experiences what looks like a working product, but the "backend" is actually a person manually doing the work behind the scenes.`,
          `Pre-commitment tests: Asking for something with real cost — a small deposit, a signature, a public commitment — is a far stronger validation signal than a verbal "yes, I'd use that."`
        ]
      }
    ],
    studentExercise: {
      heading: 'FOR THE STUDENT ENTREPRENEUR',
      subtitle: 'Take the problem statement you developed last week and put it in front of real people.',
      items: [
        { num: '01', title: 'Interview 8–10 Target Users', text: 'Interview 8–10 people who match your target user and ask them to describe the last time they experienced the problem, in detail.' },
        { num: '02', title: 'Record Verbatim Vocabulary', text: 'Write down their exact words — the phrases they use to describe their frustration are often better marketing copy than anything you\'d invent yourself.' },
        { num: '03', title: 'Quantify Current Friction', text: 'Identify their current workaround, and estimate honestly how much time, money, or effort it costs them.' },
        { num: '04', title: 'Design a Micro-MVP Experiment', text: 'Design one small MVP experiment — a form, a WhatsApp broadcast, a manual service — that tests your core assumption without requiring you to build a full product.' },
        { num: '05', title: 'Set Success Signals in Advance', text: 'Set a clear success signal in advance: decide what result would tell you the problem is real enough to keep going, before you run the experiment — not after, when you\'re tempted to reinterpret the data in your favour.' }
      ],
      outcome: 'Validation gives you confidence based on evidence rather than wishful thinking.'
    },
    nextArticleBridge: {
      heading: 'Next Week: From Evidence to Execution',
      text: `Once an idea survives contact with real customers, the entrepreneur faces the next challenge: turning that validated idea into something people can actually use.\n\nValidation tells you a problem is real and that people want a better answer. It does not tell you how to build that answer, price it, staff it, or deliver it reliably at scale. Next week, we move from evidence to execution and look at how validated ideas actually become functioning businesses — including how an Indian founder built one of the country's biggest beauty brands not by copying the existing e-commerce playbook, but by deliberately choosing a harder, more controlled business model because it fit what her customers actually needed.`
    },
    sources: [
      { title: 'Meesho case study, Elevation Capital', url: 'https://www.elevationcapital.com/stories/meesho-story' },
      { title: 'Meesho founder story and Fashnear pivot, StartupTalky', url: 'https://startuptalky.com/meesho-success-story-2/' },
      { title: 'Meesho case study — Fashnear to marketplace pivot', url: 'https://startupindia.info/case-studies/meesho-case-study/' }
    ],
    seo: {
      title: 'Customer Validation Before You Build: A Student\'s Guide | NEC E-Cell',
      description: 'Before building anything, validate it. Learn how Meesho\'s founders scrapped their first startup after listening to customers — and how you can validate your idea this week.',
      primaryKeyword: 'customer validation for startups',
      secondaryKeywords: ['MVP for students', 'customer discovery process', 'minimum viable product India', 'startup pivot examples India', 'validate business idea before building'],
      suggestedSlug: '/from-idea-to-impact-part-2-validate-before-you-build'
    },
    social: {
      linkedIn: 'Meesho almost didn\'t exist. Its founders\' first startup, Fashnear, failed — but because they stayed close enough to customers to notice what those customers were already doing, they pivoted into one of India\'s biggest social commerce platforms. Part 2 of NEC E-Cell\'s "From Idea to Impact" series covers customer discovery, MVPs, and why the biggest risk after finding a good problem is falling in love with your own solution before testing it. Read Part 2. #FromIdeaToImpact',
      instagram: 'Meesho\'s founders\' first startup literally failed. Then they listened to their customers instead of their own plan — and built a giant. Part 2 of From Idea to Impact is about validating before you build. Link in bio.',
      hashtags: ['#FromIdeaToImpact', '#NECEcell', '#CustomerDiscovery', '#MVP', '#StartupIndia']
    },
    previousArticle: {
      part: 1,
      title: 'Before You Build a Startup, Learn to Spot the Problem',
      slug: 'from-idea-to-impact-part-1-spot-the-problem'
    },
    nextArticle: {
      part: 3,
      title: 'From MVP to Business: What It Actually Takes to Build',
      slug: 'from-idea-to-impact-part-3-building-the-business',
      teaser: 'From a validated problem to building something people can actually use.'
    }
  },

  // ARTICLE 3
  {
    id: 'from-idea-to-impact-part-3',
    slug: 'from-idea-to-impact-part-3-building-the-business',
    series: 'From Idea to Impact',
    seriesPart: 3,
    totalParts: 4,
    week: 'Week 3',
    readTime: '7–9 min read',
    category: 'Business Model & Execution',
    title: 'From MVP to Business: What It Actually Takes to Build',
    subtitle: 'Learn how Nykaa founder Falguni Nayar chose the harder, inventory-led business model because it earned customer trust.',
    author: 'NEC E-Cell Editorial',
    date: '2026-10-20',
    publishedAt: 'October 20, 2026',
    heroTagline: 'Validation tells you what. Building tells you how.',
    heroConcept: 'scaffolding-structure',
    introParagraphs: [
      `In 2012, Falguni Nayar left a secure, high-profile career as Managing Director of Kotak Mahindra Capital — where she had spent nearly two decades advising companies on mergers and IPOs — to start an online beauty platform called Nykaa. She was 49. India's beauty retail market at the time was split between two unappealing extremes: low-quality products sold through local retailers, or expensive international brands sold in a handful of posh malls. Nothing organised or trustworthy existed in between, especially online.`,
      `Nayar could have built Nykaa the way most Indian e-commerce companies were building at the time — as a marketplace, simply connecting buyers and third-party sellers, minimising upfront cost and inventory risk. Instead, she made a harder, more expensive choice: Nykaa would buy products directly from brands and hold its own inventory. It meant more capital tied up, more operational complexity, and slower expansion. But it also meant Nykaa controlled product authenticity, delivery quality, and customer experience from day one — which mattered enormously in a category where counterfeit products were a real and reasonable fear for customers buying beauty products online for the first time.`,
      `That decision — choosing a business model that matched what her customers actually needed, rather than the one that was fastest to launch — is a large part of why Nykaa became one of India's most valuable consumer companies, going public in 2021 at a valuation of nearly $13 billion.`,
      `This is what Week 3 is about: the gap between having a validated idea and having a real, functioning business.`
    ],
    sections: [
      {
        id: 'validation-tells-you-what-building-tells-you-how',
        heading: 'Validation Tells You What. Building Tells You How.',
        paragraphs: [
          `By the end of Week 2, a founder should know that a problem is real and that people want a better solution. What validation doesn't hand you is a business — it hands you a direction. Turning that direction into something people can rely on, pay for, and keep using requires a different set of decisions entirely.`,
          `This is where a lot of promising, validated ideas quietly die. Founders assume that because the problem is real, the business will follow naturally. It won't. Someone still has to decide how the company makes money, what it will and won't do for customers, how it gets built, and how it's delivered reliably — not once, but every single day.`
        ],
        pullQuote: {
          quote: 'Validation tells you a problem is real and that people want a better solution. What validation doesn\'t hand you is a business — it hands you a direction.',
          author: 'NEC E-Cell Editorial'
        },
        caseStudy: {
          company: 'Nykaa',
          founders: 'Falguni Nayar',
          foundedYear: '2012',
          headline: 'Chose inventory ownership over marketplace speed to guarantee authenticity',
          narrative: [
            'Falguni Nayar left Kotak Mahindra Capital at age 49 to address India\'s fragmented beauty market.',
            'Instead of a low-cost marketplace, she chose an inventory-led model to guarantee product authenticity.',
            'Nykaa went public in 2021 at a $13B valuation because trust was the primary moat in beauty retail.'
          ]
        }
      },
      {
        id: 'the-building-blocks-of-a-real-business',
        heading: 'The Building Blocks of a Real Business',
        paragraphs: [
          `A functioning business requires five interlocking structural blocks:`
        ],
        listItems: [
          `Value proposition: This is a specific, honest answer to "why would someone choose this over their current alternative?" Nykaa's value proposition wasn't "an app to buy cosmetics" — plenty of platforms already offered that. It was trustworthy, verified beauty products with real customer education, at a time when nothing like that existed online in India. A sharp value proposition should be specific enough that it would sound wrong for a different business.`,
          `Revenue model: How, exactly, does money change hands? Zerodha built its entire identity around a flat, transparent fee — the opposite of the percentage-based, opaque brokerage most competitors charged, directly answering the pain point its founders had personally experienced as traders. Your revenue model isn't just a pricing decision; it's a direct extension of the problem you set out to solve.`,
          `Resources and team: Nykaa's early team was described, in its founder's own retelling, as small and under-resourced — a modest office, limited capital, a skeletal team. Real businesses rarely start with everything they need. They start with enough people willing to do jobs outside their formal title, the way Meesho's founders personally catalogued inventory during their MVP phase.`,
          `Technology and execution: Technology should serve the value proposition, not substitute for it. A well-built app cannot compensate for an unreliable service underneath it — and conversely, a scrappy, unglamorous back-end can support a great customer experience if the execution is disciplined. What separates successful early-stage companies is rarely technical sophistication; it's consistency.`,
          `Branding and customer experience: Especially in categories built on trust — like beauty products, home services, or financial products — brand is not decoration, it's risk reduction. Nykaa invested early in customer education content precisely because it was asking Indian consumers to trust an unfamiliar channel.`
        ],
        infographic: {
          id: 'business-stack-diagram',
          type: 'business-stack',
          title: 'The 5 Interlocking Blocks of a Business',
          subtitle: 'Turning a validated direction into an operational company',
          content: {
            blocks: [
              { title: 'Value Proposition', desc: 'Specific, honest reason to switch from current alternative' },
              { title: 'Revenue Model', desc: 'Monetisation directly aligned with user trust (e.g. Zerodha flat fee)' },
              { title: 'Resources & Team', desc: 'Versatile founders willing to execute unscalable tasks' },
              { title: 'Tech & Execution', desc: 'Disciplined operations over complex code' },
              { title: 'Brand & Trust', desc: 'Risk-reduction and customer education' }
            ]
          }
        }
      },
      {
        id: 'execution-over-original-idea',
        heading: 'Why Execution Often Matters More Than the Original Idea',
        paragraphs: [
          `It's tempting to believe that the businesses we admire won because they had a uniquely brilliant idea. In practice, most of them were operating in categories other people had already identified — online beauty retail, discount stockbroking, home services marketplaces — none of these were unclaimed white space. What separated the companies that succeeded was disciplined, patient execution: getting the harder business model right, staying close to operational detail, and being willing to do unscalable things (cataloguing every product by hand, delivering orders personally, negotiating brand partnerships one at a time) long enough to earn the right to scale.`,
          `This is uncomfortable for students to hear, because "we had a great idea" is a much better story than "we did unglamorous work consistently for two years." But it's the more accurate one.`
        ],
        infographic: {
          id: 'inventory-vs-marketplace-comparison',
          type: 'comparison',
          title: 'Marketplace vs. Inventory-Led Model (The Nykaa Choice)',
          subtitle: 'Evaluating trade-offs between speed and control',
          content: {
            leftTitle: 'Typical Marketplace Model',
            rightTitle: 'Nykaa Inventory-Led Model',
            rows: [
              { left: 'Zero inventory risk; fast expansion', right: 'High inventory capital; slower initial expansion' },
              { left: 'Low operational control over seller dispatch', right: '100% control over product authenticity & packing' },
              { left: 'Counterfeit risk passed to consumer', right: 'Zero counterfeit risk — direct brand relationships' },
              { left: 'Competes purely on price', right: 'Competes on trust, curation, & customer education' }
            ]
          }
        }
      },
      {
        id: 'start-small-learn-fast',
        heading: 'Start Small, Learn Fast',
        paragraphs: [
          `The instinct among new founders is to build the full vision immediately — every feature, every city, every use case. Nykaa didn't. It started online-only, with a narrow catalogue, before gradually expanding into physical retail stores, private-label products, and fashion. Meesho, after its pivot, tested its new model in parallel with the old one for months before committing fully.`,
          `Starting small isn't a compromise — it's a strategy. A smaller, more focused version of the business is faster to build, cheaper to be wrong about, and generates real customer data faster than a fully-built version ever could. Every constraint you accept early — one product category, one city, one customer segment — is a constraint you can intentionally remove later, once you've proven the model works.`
        ]
      }
    ],
    studentExercise: {
      heading: 'FOR THE STUDENT ENTREPRENEUR',
      subtitle: 'If Week 2 was about testing your idea with real customers, Week 3 is about designing the smallest real version of the business.',
      items: [
        { num: '01', title: 'Draft One-Sentence Value Proposition', text: 'Write a one-sentence value proposition for your idea, specific enough that it would sound wrong applied to a different business.' },
        { num: '02', title: 'Formulate Paper Revenue Model', text: 'Decide your revenue model on paper — who pays, how much, and how often — even if you have zero paying customers yet.' },
        { num: '03', title: 'Inventory Available Resources', text: 'List what you can build with the resources you actually have this month, not the resources you\'d want with funding.' },
        { num: '04', title: 'Commit to One Unscalable Task', text: 'Identify one unscalable thing you\'re willing to do manually — the way Nykaa\'s early team and Meesho\'s founders did — to deliver the experience properly before automating it.' },
        { num: '05', title: 'Define Tight Launch Boundaries', text: 'Set a small, specific launch scope: one customer segment, one city, or one use case, rather than trying to serve everyone from day one.' }
      ],
      outcome: 'A focused, disciplined launch scope accelerates learning while conserving resources.'
    },
    nextArticleBridge: {
      heading: 'Next Week: Scaling & Sustainable Impact',
      text: `Building something people want is a major milestone. But building it once is different from building something that can grow.\n\nA validated, well-built product that works for a hundred customers doesn't automatically work for a hundred thousand. The systems, team structure, and financial discipline required to scale are genuinely different problems from the ones you solve while building the first version. Next week, in the final part of this series, we look at how startups move from "we built something people want" to sustainable, lasting growth — including how companies stayed disciplined about unit economics, retention, and leadership even as they scaled into some of India's most valuable businesses.`
    },
    sources: [
      { title: 'Nykaa origin story, buildd.co', url: 'https://buildd.co/product/nykaa-origin-story' },
      { title: 'Falguni Nayar success story, The Better India', url: 'https://thebetterindia.com/startup/falguni-nayar-success-story-built-nykaa-after-50-11158496' },
      { title: 'Zerodha\'s profitability-first business strategy', url: 'https://www.markhub24.com/post/zerodha-s-profitability-first-business-strategy' }
    ],
    seo: {
      title: 'From MVP to Business: How Startups Actually Get Built | NEC E-Cell',
      description: 'A validated idea isn\'t a business yet. Learn how Nykaa\'s Falguni Nayar and other Indian founders built real, working businesses around validated problems.',
      primaryKeyword: 'how to build a startup business model',
      secondaryKeywords: ['value proposition examples India', 'startup execution over ideas', 'business model basics for students', 'Nykaa business model', 'MVP to business'],
      suggestedSlug: '/from-idea-to-impact-part-3-building-the-business'
    },
    social: {
      linkedIn: 'Falguni Nayar left a senior finance career at 49 to build Nykaa — and chose the harder, more expensive business model (holding inventory) because it matched what her customers actually needed. Part 3 of NEC E-Cell\'s "From Idea to Impact" series is about the unglamorous, decision-heavy work of turning a validated idea into a real business: value proposition, revenue model, execution, and the discipline to start small. Read Part 3. #FromIdeaToImpact',
      instagram: 'Having a validated idea isn\'t the same as having a business. Part 3 of From Idea to Impact breaks down what it actually takes to build — using Nykaa\'s founder as a case study. Link in bio.',
      hashtags: ['#FromIdeaToImpact', '#NECEcell', '#BusinessModel', '#StartupIndia', '#Nykaa']
    },
    previousArticle: {
      part: 2,
      title: "Your Idea Isn't the Product. The Customer's Problem Is.",
      slug: 'from-idea-to-impact-part-2-validate-before-you-build'
    },
    nextArticle: {
      part: 4,
      title: 'Growth Is Not the Goal. Sustainable Impact Is.',
      slug: 'from-idea-to-impact-part-4-sustainable-growth',
      teaser: 'From building something people want once to building something that scales.'
    }
  },

  // ARTICLE 4
  {
    id: 'from-idea-to-impact-part-4',
    slug: 'from-idea-to-impact-part-4-sustainable-growth',
    series: 'From Idea to Impact',
    seriesPart: 4,
    totalParts: 4,
    week: 'Week 4',
    readTime: '7–9 min read',
    category: 'Sustainable Growth & Impact',
    title: 'Growth Is Not the Goal. Sustainable Impact Is.',
    subtitle: 'Closing the loop from Problem to Validation to Building — how Zerodha and Freshworks scaled with unit economics discipline.',
    author: 'NEC E-Cell Editorial',
    date: '2026-10-27',
    publishedAt: 'October 27, 2026',
    heroTagline: 'Sustainable growth is literally supported by everything that came before it.',
    heroConcept: 'sapling-to-tree',
    introParagraphs: [
      `By 2021, Zerodha had become one of the rare bootstrapped unicorns in the world — a company valued at over $2 billion that had never taken a rupee of venture capital. It had done this in an industry, discount stockbroking, where nearly every competitor was burning investor money to acquire customers. Zerodha's founders made a different bet: stay profitable from year one, keep the fee structure simple and transparent, and let word-of-mouth — not advertising spend — drive growth.`,
      `That discipline wasn't incidental. It was the entire growth strategy. Because Zerodha never depended on external capital to survive, it never faced pressure to chase growth at the expense of unit economics. Every new customer had to make sense on its own terms, from day one, not "eventually, once we figure out monetisation." That constraint, uncomfortable as it must have been at times, is precisely what let Zerodha scale into India's largest retail broker without collapsing under its own growth the way many well-funded competitors have.`,
      `Contrast that with Freshworks, the SaaS company built by Girish Mathrubootham, which took a very different path — raising significant venture capital and eventually listing on Nasdaq. Yet Mathrubootham has been just as explicit about discipline in his own way: he has repeatedly said Freshworks only invested in a second product once the first, Freshdesk, had genuinely achieved product-market fit and a proven way to reach customers. He's also been vocal about a mistake many scaling startups make — hiring junior people into senior leadership roles too early, which quietly limits how much better talent you can attract later.`,
      `Two very different companies, two very different funding paths, and the same underlying lesson: growth that isn't built on real discipline — in unit economics, in product-market fit, in who you put in charge — tends to become fragile exactly when it matters most.`
    ],
    sections: [
      {
        id: 'scaling-is-a-different-problem',
        heading: 'Scaling Is a Different Problem Than Building',
        paragraphs: [
          `It's worth being precise about what changes once a business starts to grow. In Week 3, the challenge was building something a small number of people genuinely wanted. In this phase, the challenge is different: can that same experience, quality, and value hold up when the number of customers, transactions, or team members multiplies by ten or a hundred?`,
          `This is where product-market fit becomes the real test, not just a buzzword. It's not a single moment you achieve and move past — it's evidence that shows up in how customers behave at scale: do they keep coming back, do they tell others, does demand pull ahead of your marketing rather than needing to be pushed? Zerodha's near-total reliance on organic growth rather than advertising is itself a sign of strong product-market fit — customers were doing the marketing simply by using and recommending the product.`
        ],
        pullQuote: {
          quote: 'Growth that isn\'t built on real discipline tends to become fragile exactly when it matters most.',
          author: 'NEC E-Cell Editorial'
        },
        caseStudy: {
          company: 'Zerodha & Freshworks',
          founders: 'Kamath Brothers / Girish Mathrubootham',
          foundedYear: '2010 / 2010',
          headline: 'Two distinct funding paths united by unit economics discipline',
          narrative: [
            'Zerodha scaled organically to a $2B+ bootstrapped unicorn with 0 venture capital spend by staying profitable from day one.',
            'Freshworks raised VC capital to list on Nasdaq, but refused to launch a 2nd product until Freshdesk hit undeniable PMF.',
            'Both founders prioritised customer retention over paid acquisition.'
          ]
        }
      },
      {
        id: 'retention-before-acquisition',
        heading: 'Retention Before Acquisition',
        paragraphs: [
          `Founders under growth pressure tend to obsess over new customer acquisition, because it's the most visible, most celebrated metric. But a business that loses customers as fast as it gains them isn't actually growing — it's running in place, and often losing money doing it.`,
          `This is why the discipline both Zerodha and Freshworks demonstrate matters so much: keeping customer acquisition costs low and rational (Zerodha through organic, word-of-mouth growth; Freshworks through proven product-market fit before expansion) forces a company to earn growth through a product worth staying for, rather than buying growth through spending that eventually has to stop.`
        ],
        infographic: {
          id: 'bootstrapped-vs-vc-comparison',
          type: 'comparison',
          title: 'Bootstrapped (Zerodha) vs. VC-Funded (Freshworks) Discipline',
          subtitle: 'Two paths to sustainable, multi-billion dollar scale',
          content: {
            leftTitle: 'Bootstrapped Path (Zerodha)',
            rightTitle: 'VC-Funded Path (Freshworks)',
            rows: [
              { left: 'Profitable from Year 1; zero dilution', right: 'Venture backed; listed on Nasdaq' },
              { left: 'Zero paid advertising; 100% organic growth', right: 'Gated expansion: 2nd product ONLY after Freshdesk PMF' },
              { left: 'Constrained growth protects unit economics', right: 'Capital used for speed after unit economics proven' },
              { left: 'Reinvests profits into ecosystem (Varsity, Rainmatter)', right: 'Disciplined leadership hiring standards' }
            ]
          }
        }
      },
      {
        id: 'systems-hiring-and-leadership',
        heading: 'Systems, Hiring, and Leadership',
        paragraphs: [
          `A startup's earliest processes are usually informal — the founders doing everything personally, decisions made in a WhatsApp group, quality controlled by direct oversight. That approach breaks down as a company scales, simply because founders cannot personally touch every customer interaction once there are thousands of them.`,
          `Mathrubootham's point about leadership hiring is a genuinely underappreciated part of scaling: the people you bring in during a growth phase set the ceiling for how good your next round of hires can be. Placing underqualified people into senior titles early — often because it's cheaper or faster — makes it structurally harder to attract stronger leaders later, because those leaders won't want to report into a weaker layer above them. Scaling well requires being honest about this trade-off before the pressure of rapid growth makes it tempting to cut corners.`
        ]
      },
      {
        id: 'unit-economics-and-financial-discipline',
        heading: 'Unit Economics and Financial Discipline',
        paragraphs: [
          `"Unit economics" sounds like a finance-class term, but the underlying question is simple: does this business make sense one customer, one transaction, one order at a time — or only in aggregate, assuming enough scale eventually makes the math work? Zerodha's flat, low-fee, high-volume model only works because the company kept its cost structure lean enough that each trade, even at a tiny margin, contributed positively. That discipline, maintained deliberately without the cushion of investor capital, is a large part of why Zerodha could scale without the boom-and-bust pattern that has affected other well-funded Indian startups.`,
          `This is the discipline every student founder should internalise early, long before it becomes a matter of survival: growth that depends on losing money on every customer, hoping to fix it later, is not a strategy — it's a bet that the fix will arrive before the money runs out.`
        ],
        infographic: {
          id: 'unit-economics-breakdown',
          type: 'unit-economics',
          title: 'Unit Economics: The Fundamental Equation',
          subtitle: 'Ensuring each single customer generates positive contribution margin',
          content: {
            leftBox: { title: 'Value from One Customer (LTV)', desc: 'Revenue over lifespan' },
            rightBox: { title: 'Cost to Serve One Customer (CAC + COGS)', desc: 'Acquisition + Service costs' },
            condition: 'LTV > 3x CAC',
            note: 'Growth is only sustainable when every customer is unit-profitable from day one.'
          }
        }
      },
      {
        id: 'sustainable-growth-vs-growth-at-any-cost',
        heading: 'Sustainable Growth Versus Growth at Any Cost',
        paragraphs: [
          `Startup culture, in India and globally, often celebrates speed and scale as ends in themselves — user numbers, funding rounds, valuation milestones. But the businesses that last, the ones that create durable economic and social value, tend to be the ones that treated growth as a consequence of doing something well, not a goal to chase directly.`,
          `This distinction has real stakes beyond any single company. According to India's Department for Promotion of Industry and Internal Trade (DPIIT), the country's recognised startup ecosystem has grown from around 500 startups in 2016 to nearly 200,000 by late 2025, creating well over a million direct jobs along the way. That scale of impact — jobs, services, and economic activity built by first-time founders — is only possible because enough of those businesses survived long enough to matter, which is, at its core, a story about discipline as much as ambition.`
        ],
        infographic: {
          id: 'dpiit-ecosystem-chart',
          type: 'growth-chart',
          title: 'India Startup Ecosystem Growth (DPIIT Data)',
          subtitle: 'From ~500 startups in 2016 to 200,000+ creating 1M+ direct jobs',
          content: {
            startYear: '2016 (~500 startups)',
            endYear: '2025/2026 (200,000+ startups)',
            jobs: '1,000,000+ Direct Jobs Created',
            source: 'Source: DPIIT Prabhaav Factbook / PIB Press Release'
          }
        }
      },
      {
        id: 'what-makes-a-business-survive',
        heading: "What Makes a Business Survive Beyond the Founder's Original Idea",
        paragraphs: [
          `By the time a business is genuinely scaling, it usually looks very different from the founder's original idea. Nykaa expanded far beyond its original online-only catalogue into physical retail and private-label products. Freshworks grew from a single product, Freshdesk, into a multi-product platform. Zerodha, having solved brokerage, now reinvests its profits into financial education (Varsity) and an ecosystem fund (Rainmatter) that backs other fintech founders — extending its original mission of removing barriers well beyond its first product.`,
          `This is the final, easily missed lesson of the entire journey: the original idea was never really the point. It was the entry ticket — a real enough problem to justify starting. What determines whether a business survives and creates lasting impact is everything that happened after: the willingness to validate honestly, build with discipline, and keep adapting as the business — and the world around it — changed.`
        ],
        infographic: {
          id: 'master-journey-flow',
          type: 'master-flow',
          title: 'The Master Series Journey: Problem to Impact',
          subtitle: 'The continuous line of thinking behind sustainable entrepreneurship',
          content: {
            steps: [
              { stage: 'PART 1', title: 'SPOT THE PROBLEM', desc: 'Every business starts as an everyday friction' },
              { stage: 'PART 2', title: 'VALIDATE', desc: 'Customer discovery before code (Fashnear → Meesho)' },
              { stage: 'PART 3', title: 'BUILD', desc: 'Harder business models built on trust (Nykaa)' },
              { stage: 'PART 4', title: 'SUSTAINABLE IMPACT', desc: 'Disciplined unit economics & leadership (Zerodha)' }
            ]
          }
        }
      },
      {
        id: 'bringing-the-journey-together',
        heading: 'Bringing the Journey Together',
        paragraphs: [
          `Over four weeks, we've followed one continuous line of thinking: Problem to Idea to Validation to Building to Growth to Impact.`,
          `It started with the discipline to notice a real problem instead of chasing a clever idea. It moved to the humility to test that problem against real customers, and the willingness to change course — the way Meesho's founders did — when the evidence pointed elsewhere. It continued into the patient, often unglamorous work of building a real business around what was learned, the way Nykaa's founder chose a harder model because it served her customers better. And it ends here, with the discipline to grow sustainably rather than chase scale for its own sake — the discipline that let Zerodha and Freshworks build lasting companies instead of fragile ones.`,
          `Entrepreneurship, seen this way, isn't a single moment of inspiration. It's a continuous process of noticing, questioning, building, and adapting — one that doesn't really end, even for the companies that seem to have "made it." If you've made it through all four parts of this series, you already have more of a foundation than most people who call themeselves entrepreneurs ever build. The next problem worth solving is probably closer than you think.`
        ]
      }
    ],
    studentExercise: {
      heading: 'FOR THE STUDENT ENTREPRENEUR',
      subtitle: 'Even if you\'re nowhere near scaling yet, these habits are worth building now, because they\'re far easier to build early than to retrofit later.',
      items: [
        { num: '01', title: 'Define Real Retention Criteria', text: 'Define what retention would mean for your idea — what specific behaviour would tell you a customer is coming back, not just trying you once.' },
        { num: '02', title: 'Calculate Unit Economics Math', text: 'Calculate rough unit economics for your concept: what would it cost to serve one customer, and what would that one customer realistically pay or generate in return?' },
        { num: '03', title: 'Identify Scaling Bottlenecks', text: 'Identify one process you\'re currently doing manually that would break if you had ten times more customers tomorrow — and think about what a simple system to handle it might look like.' },
        { num: '04', title: 'Establish Leadership Standards', text: 'Write down the leadership standard you\'d want to hold yourself to when you eventually hire your first few people, before the pressure of "we need someone now" makes that harder to think clearly about.' },
        { num: '05', title: 'Revisit Week 1 Problem Statement', text: 'Revisit your Week 1 problem statement. Ask honestly: is this still the same problem you\'re solving, or has your understanding of it evolved? Growth almost always means the second answer.' }
      ],
      outcome: 'Building sustainable habits early prevents fragile foundation traps as you grow.'
    },
    nextArticleBridge: {
      heading: 'The Journey Comes Full Circle',
      text: `You have completed all 4 parts of the From Idea to Impact series!\n\nRevisit Part 1 to start noticing everyday problems on your campus, or share this series with your fellow student builders.`
    },
    sources: [
      { title: 'Zerodha\'s profitability-first business strategy, Markhub24', url: 'https://www.markhub24.com/post/zerodha-s-profitability-first-business-strategy' },
      { title: 'How Zerodha built a unicorn without external funding, Beginest', url: 'https://www.beginest.com/blog/how-zerodha-built-a-unicorn-startup-without-external-funding.html' },
      { title: 'Girish Mathrubootham on hiring leaders, Inc42', url: 'https://inc42.com/buzz/freshworks-cofounder-girish-mathrubootham-hires-leaders-who-talk-to-people-from-the-h' },
      { title: 'Freshworks scaling lessons, SaaStr', url: 'https://www.saastr.com/building-a-global-saas-empire-5-bets-that-paid-off-with-freshworks-founder-ceo-girish-m' },
      { title: 'India\'s Startup Revolution, PIB / DPIIT', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2098452&reg=48&lang=2' },
      { title: 'Startup India Prabhaav 9-Year Factbook, DPIIT', url: 'https://www.startupindia.gov.in/content/sih/en/Prabhaav.html' }
    ],
    seo: {
      title: 'Sustainable Startup Growth: Scaling Without Losing the Plot | NEC E-Cell',
      description: 'Growth isn\'t the goal — sustainable impact is. Learn how Zerodha and Freshworks scaled with discipline, and how the full Idea-to-Impact journey comes together.',
      primaryKeyword: 'sustainable startup growth',
      secondaryKeywords: ['unit economics for startups', 'product-market fit explained', 'scaling a startup India', 'startup leadership hiring', 'Zerodha Freshworks growth strategy'],
      suggestedSlug: '/from-idea-to-impact-part-4-sustainable-growth'
    },
    social: {
      linkedIn: 'Zerodha scaled into a $2B+ company without ever taking outside funding. Freshworks scaled by refusing to build a second product until the first had genuine product-market fit. Different paths, same lesson: sustainable growth is built on discipline, not just ambition. In the final part of NEC E-Cell\'s "From Idea to Impact" series, we bring the full journey together — Problem to Idea to Validation to Building to Growth to Impact. Read the finale. #FromIdeaToImpact',
      instagram: 'Growth isn\'t the goal — sustainable impact is. The finale of From Idea to Impact ties the whole journey together, from spotting a problem to building something that lasts. Link in bio.',
      hashtags: ['#FromIdeaToImpact', '#NECEcell', '#StartupGrowth', '#ProductMarketFit', '#StartupIndia']
    },
    previousArticle: {
      part: 3,
      title: 'From MVP to Business: What It Actually Takes to Build',
      slug: 'from-idea-to-impact-part-3-building-the-business'
    },
    nextArticle: {
      part: 1,
      title: 'Before You Build a Startup, Learn to Spot the Problem',
      slug: 'from-idea-to-impact-part-1-spot-the-problem',
      teaser: 'Start the series again from Part 1.'
    }
  }
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  const cleanSlug = slug.replace(/^\//, '');
  return BLOG_ARTICLES.find(a => a.slug === cleanSlug || a.seo.suggestedSlug.replace(/^\//, '') === cleanSlug);
}
