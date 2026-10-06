import { EventItem } from '../models/models';

export const sampleEvents: EventItem[] = [
  {
    id: 'founders-on-campus-sep',
    title: 'Founders on Campus — bootstrapped SaaS from Coimbatore',
    initiative: 'founders-on-campus',
    date: '2026-09-18',
    time: '6:00 PM',
    venue: 'Auditorium',
    audience: 'Open to all',
    summary: 'A Coimbatore founder on going from a college side-project to a profitable software business without raising a rupee.',
    turnout: null,
    registration: null,
    pending: true,
  },
  {
    id: 'bootcamp-oct',
    title: '48-Hour Bootcamp — problem statements from local industry',
    initiative: 'bootcamp',
    date: '2026-10-04',
    endDate: '2026-10-06',
    time: 'Fri – Sun',
    venue: null,
    audience: 'Teams of 4',
    summary: 'A full build weekend. Problem statements from local manufacturers and D2C brands. Mentors on site throughout.',
    turnout: null,
    registration: 'open',
    pending: true,
  },
  {
    id: 'nec-kickoff',
    title: 'NEC kick-off & orientation',
    initiative: 'nec-drive',
    date: '2026-08-22',
    time: null,
    venue: 'Seminar Hall',
    audience: null,
    summary: 'The campaign team and open attendees walked through the NEC task list, timeline and how to get involved.',
    turnout: '~120 attended',
    registration: null,
    pending: true,
  },
  {
    id: 'idea-clinic-jul',
    title: 'Idea Clinic — one-on-one feedback with mentors',
    initiative: 'idea-clinic',
    date: '2026-07-30',
    time: null,
    venue: null,
    audience: '14 teams',
    summary: 'Fourteen teams, twenty-minute slots, one written next step each. Three were fast-tracked to the Bootcamp.',
    turnout: '~45 attended',
    registration: null,
    pending: true,
  },
  {
    id: 'ideathon-2026-finals',
    title: 'Ideathon 2026 finals',
    initiative: 'ideathon',
    date: '2026-03-12',
    time: null,
    venue: null,
    audience: '₹25k prize pool',
    summary: 'Nine teams pitched live to a panel of alumni and investors. The top three took a mentoring block into the summer.',
    turnout: '~200 attended',
    registration: null,
    pending: true,
  },
];

export const linkedInEvents: EventItem[] = [
  {
    id: 'un-day-2025',
    title: 'UN Day 2025 — Rebooting Sustainability: Youth Startups in the E-Waste Economy',
    date: '2025-10-23',
    time: '2:00 PM – 4:30 PM',
    venue: 'CAL Lab, PSG Institute of Management',
    audience: 'Open to all',
    summary:
      'A workshop marking United Nations Day 2025, exploring how sustainability and innovation can power the e-waste economy and shape responsible entrepreneurship.',
    description:
      'Organized in association with Green Era Recyclers, the session brought together management students, young entrepreneurs and sustainability advocates to explore solutions for responsible production and consumption, aligned with the UN Sustainable Development Goals. Highlights included a keynote on the e-waste economy, a "Pitch the Future" ideation sprint, and a UN Day oath for responsible innovation.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Prasanth Omanakuttan', designation: 'Founder', org: 'Green Era Recyclers' },
    gallery: [
      { src: '/events/un-day-2025/01.jpg', alt: 'UN Day 2025 event poster' },
      { src: '/events/un-day-2025/02-recap.jpg', alt: 'Students and faculty at the UN Day 2025 workshop' },
    ],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_psgim-unsdg-unday-activity-7388789673655066624-j4lj',
    hashtags: ['PSGIM', 'ECell', 'UNDay2025', 'CircularEconomy', 'Sustainability', 'Entrepreneurship', 'EwasteEconomy'],
  },
  {
    id: 'yes-26-business-pitch',
    title: "YES '26 — Business Pitch Competition",
    date: '2026-02-27',
    time: null,
    venue: 'PSG Institute of Management',
    audience: 'Open to all · Registration fee ₹300 (includes lunch)',
    summary:
      'A business pitch competition at YES \'26, where student founders presented startup concepts for expert feedback and prize money.',
    description:
      'Part of YES \'26, a programme of workshops and expert talks designed to build entrepreneurial thinking. The Business Pitch Competition gave participants the chance to present their startup concept, receive expert feedback, and compete for prizes.',
    turnout: null,
    registration: 'closed',
    pending: false,
    gallery: [{ src: '/events/yes-26/01.jpg', alt: "YES '26 Business Pitch Competition poster" }],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_yes26-entrepreneurship-psgim-activity-7431925851857788928-wRld',
    hashtags: ['YES26', 'Entrepreneurship', 'PSGIM', 'BusinessPitch', 'Innovation'],
  },
  {
    id: 'sustainability-certifications-tuv-sud',
    title: 'Sustainability Certifications and Career Opportunities',
    date: '2026-03-04',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A session on sustainability-driven careers and the industry certifications that support them, led by a certification-industry expert.',
    description:
      'The session introduced students to key concepts in sustainability, the certifications organizations require, and the growing importance of environmental compliance, alongside career opportunities and skill development in sustainability and management systems.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'S. Loganathan', designation: 'General Manager – Management Systems', org: 'TÜV SÜD South Asia Pvt. Ltd.' },
    gallery: [{ src: '/events/sustainability-tuv-sud/01.jpg', alt: 'Sustainability certifications session with TÜV SÜD' }],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_sustainability-ecell-skilldevelopment-activity-7437122123149660160-7f52',
    hashtags: ['Sustainability', 'ECell', 'SkillDevelopment', 'Entrepreneurship', 'FutureCareers'],
  },
  {
    id: 'ipr-awareness-cii',
    title: 'IPR Awareness Program with CII',
    date: '2026-04-09',
    time: null,
    venue: null,
    audience: 'Students and faculty',
    summary:
      'An awareness program on Intellectual Property Rights, covering patents, trademarks, copyrights and the filing process, delivered with the Confederation of Indian Industry.',
    description:
      'The session gave a comprehensive understanding of patents, trademarks and copyrights, along with practical insights into the IPR filing process — from prior art search to application and examination — bridging the gap between creativity and legal protection.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Mahalakshmi Suresh', designation: 'Executive Officer – IPR', org: 'Confederation of Indian Industry (CII)' },
    gallery: [{ src: '/events/ipr-awareness-cii/01.jpg', alt: 'IPR Awareness Program session with CII' }],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_ecellpsgim-ipr-innovation-activity-7448072024205205504-pVhZ',
    hashtags: ['ECellPSGIM', 'IPR', 'Innovation', 'Entrepreneurship', 'Startups', 'CII', 'PSGIM'],
  },
  {
    id: 'in-between-the-chapters',
    title: 'In Between the Chapters — Storytelling Session',
    date: '2026-03-12',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A storytelling workshop guiding participants to weave connections between ideas and craft narratives that bridge existing storylines.',
    description:
      'Facilitated by Alan Hadle Hamilton, the session encouraged students to think beyond conventional perspectives. Participants actively contributed to discussions, brainstormed creatively and developed unique story concepts, strengthening both storytelling ability and teamwork.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Alan Hadle Hamilton' },
    gallery: [
      { src: '/events/in-between-the-chapters/01.jpg', alt: 'In Between the Chapters storytelling session, photo 1' },
      { src: '/events/in-between-the-chapters/02.jpg', alt: 'In Between the Chapters storytelling session, photo 2' },
      { src: '/events/in-between-the-chapters/03.jpg', alt: 'In Between the Chapters storytelling session, photo 3' },
      { src: '/events/in-between-the-chapters/04.jpg', alt: 'In Between the Chapters storytelling session, photo 4' },
    ],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_inbetweenthechapters-storytellingsession-activity-7442056034590035968-P1f4',
    hashtags: ['InBetweenTheChapters', 'StorytellingSession', 'EcellPSGIM', 'PSGIM'],
  },
  {
    id: 'wildcard-ventures',
    title: 'Wildcard Ventures',
    date: '2026-09-10',
    time: null,
    venue: null,
    audience: 'Open to all',
    summary:
      'A rapid-ideation challenge: build a startup concept from three random words and pitch it in sixty seconds.',
    description:
      'Participants received three random words, built a startup idea incorporating all three, and submitted a 60-second video pitch on Instagram. Registration closed 7 September 2026, video submissions were due 9 September, and pitching concluded 10 September. Winners and all participants received certificates.',
    turnout: null,
    registration: 'closed',
    pending: false,
    gallery: [{ src: '/events/wildcard-ventures/01.jpg', alt: 'Wildcard Ventures challenge poster' }],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_wildcardventures-ecellpsgim-nec2026-activity-7502228774638321664-XFmz',
    hashtags: ['WildcardVentures', 'ECellPSGIM', 'NEC2026', 'Entrepreneurship', 'StartupChallenge', 'Innovation'],
  },
];

export const pdfReportEvents: EventItem[] = [
  {
    id: 'bschool-bistro-inauguration',
    title: 'B-School Bistro — Inauguration of the Student-Run Café',
    date: '2024-08-07',
    time: null,
    venue: 'PSG Institute of Management',
    audience: null,
    summary:
      'The inauguration of a student-run café at PSGIM, marking a step toward hands-on entrepreneurial and experiential learning.',
    description:
      'The B-School Bistro is envisioned as more than a café — a hub for students to explore entrepreneurial opportunities, apply ideas, and collaborate on projects, giving them practical experience managing and operating a business. The inauguration was graced by chef and entrepreneur Ms. Shreeya Adka.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Shreeya Adka', designation: 'Chef & Entrepreneur' },
    gallery: [
      { src: '/events/bschool-bistro-inauguration/01.jpg', alt: 'Ribbon-cutting at the B-School Bistro inauguration' },
      { src: '/events/bschool-bistro-inauguration/02.jpg', alt: 'Ms. Shreeya Adka at the B-School Bistro opening' },
    ],
    hashtags: [],
  },
  {
    id: 'talk-series-food-business',
    title: 'E-Cell Talk Series 1 — The Future of Food Business',
    date: '2024-08-07',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A talk on trends, innovations and entrepreneurial opportunities shaping the food business, from cloud kitchens to sustainable practices.',
    description:
      'Ms. Shreeya Adka highlighted key industry shifts, including the rise of cloud kitchens, AI-driven personalization, and sustainable food practices, and emphasized resilience, creativity and customer engagement as crucial to entrepreneurial success.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Shreeya Adka' },
    gallery: [{ src: '/events/talk-series-food-business/01.jpg', alt: 'Ms. Shreeya Adka delivers the E-Cell Talk Series session' }],
    hashtags: [],
  },
  {
    id: 'talk-series-global-tech-collab',
    title: 'E-Cell Talk Series 2 — Global Collaboration Opportunities for Tech Startups',
    date: '2024-09-13',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A session on India–Israel innovation collaboration and emerging tech opportunities, with the Director of Israel\'s Innovation Task Force.',
    description:
      'Dr. Andy David gave a 360-degree overview of the evolving innovation landscape and the potential for India–Israel collaboration, sparking discussion on AI advancements across healthcare and automotive. Special invitees joined from Yellow Network, CII, Young Indians and UVA. In an informal interaction, he urged students to identify market gaps, think critically, and build networking and soft skills alongside technical ones.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Dr. Andy David', designation: 'Director, Innovation Task Force', org: "Israel's Ministry of Foreign Affairs" },
    gallery: [
      { src: '/events/talk-series-global-tech-collab/01.jpg', alt: 'Dr. Andy David leads the global tech collaboration session' },
      { src: '/events/talk-series-global-tech-collab/02.jpg', alt: 'Invited speakers and guests at the session' },
    ],
    hashtags: [],
  },
  {
    id: 'freshers-core-committee',
    title: 'Welcoming the Freshers to E-Cell & Formation of Core Committee',
    date: '2024-10-10',
    time: null,
    venue: null,
    audience: null,
    summary: 'E-Cell welcomed its new freshers and formed its core committee for the year.',
    turnout: null,
    registration: null,
    pending: false,
    gallery: [
      { src: '/events/freshers-core-committee/01.jpg', alt: 'E-Cell members assemble for core committee induction' },
      { src: '/events/freshers-core-committee/02.jpg', alt: 'Welcoming freshers to E-Cell' },
      { src: '/events/freshers-core-committee/03.jpg', alt: 'E-Cell team celebrates the new core committee' },
    ],
    hashtags: [],
  },
  {
    id: 'talent-night-2024',
    title: 'Talent Night — Student Expo 2024',
    date: '2024-10-24',
    time: null,
    venue: 'PSG Institute of Management',
    audience: null,
    summary:
      'An annual showcase of student talent and entrepreneurial stalls, organized jointly by E-Cell and the Student Council.',
    description:
      'Alongside performances, E-Cell set up stalls across Food, Fashion and Self-Care categories, entirely organized and managed by PSGIM students, inaugurated by Dr. Srividya. The evening closed with a prize distribution ceremony recognizing the top-performing stalls.',
    turnout: null,
    registration: null,
    pending: false,
    gallery: [
      { src: '/events/talent-night-2024/01.jpg', alt: 'Talent Night stall inauguration by Dr. Srividya' },
      { src: '/events/talent-night-2024/02.jpg', alt: 'PSGIM students manage stalls at Talent Night Expo' },
    ],
    hashtags: [],
  },
  {
    id: 'un-day-2024',
    title: 'United Nations Day Celebration 2024',
    date: '2024-10-24',
    time: null,
    venue: 'PSG Institute of Management',
    audience: null,
    summary:
      'A campus-wide display on global unity and sustainable development, with student stalls linked to the UN Sustainable Development Goals.',
    description:
      'Marking UN Day 2024 under the theme "Global unity and sustainable development," students decorated tree trunks in the parking area with flyers on each SDG, each linked to a student-led stall showcasing real-life projects aligned with that goal — an interactive, campus-wide display of PSGIM\'s commitment to sustainability and global awareness.',
    turnout: null,
    registration: null,
    pending: false,
    gallery: [
      { src: '/events/un-day-2024/01.jpg', alt: 'UN SDG awareness display at UN Day 2024' },
      { src: '/events/un-day-2024/02.jpg', alt: 'Student stall at UN Day 2024, photo 1' },
      { src: '/events/un-day-2024/03.jpg', alt: 'Student stall at UN Day 2024, photo 2' },
      { src: '/events/un-day-2024/04.jpg', alt: 'Student stall at UN Day 2024, photo 3' },
      { src: '/events/un-day-2024/05.jpg', alt: 'Student stall at UN Day 2024, photo 4' },
      { src: '/events/un-day-2024/06.jpg', alt: 'Student stall at UN Day 2024, photo 5' },
      { src: '/events/un-day-2024/07.jpg', alt: 'Student stall at UN Day 2024, photo 6' },
      { src: '/events/un-day-2024/08.jpg', alt: 'Student stall at UN Day 2024, photo 7' },
      { src: '/events/un-day-2024/09.jpg', alt: 'Student stall at UN Day 2024, photo 8' },
    ],
    hashtags: [],
  },
  {
    id: 'talk-series-telecom',
    title: 'E-Cell Talk Series 3 — Telecommunication Industry',
    date: '2024-11-14',
    time: null,
    venue: null,
    audience: null,
    summary:
      'An in-depth look at trends, challenges and startup opportunities in telecom, from a Cluster Business Head at Vodafone Idea.',
    description:
      'Mr. Puneet Krishnan covered the industry\'s evolution and future opportunities, including strategies through the 2017–2018 telecom mergers, post-merger challenges like cultural integration and network unification, the impact of OTT platforms, rural connectivity improvements, and the need for diverse business models.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Puneet Krishnan', designation: 'Cluster Business Head', org: 'Vodafone Idea Ltd.' },
    gallery: [
      { src: '/events/talk-series-telecom/01.jpg', alt: 'Mr. Puneet Krishnan speaks at the Telecom Industry session' },
      { src: '/events/talk-series-telecom/02.jpg', alt: 'Telecom industry panel led by Mr. Puneet Krishnan' },
    ],
    hashtags: [],
  },
  {
    id: 'roll-the-ball',
    title: 'Roll the Ball — Entrepreneurial Fun Game for E-Cell Members',
    date: '2024-11-14',
    time: null,
    venue: null,
    audience: 'E-Cell members',
    summary:
      'A circular team game where members quizzed each other on the entrepreneurial ecosystem, building teamwork along the way.',
    description:
      'Participants sat in a circle with a ball at the center; whoever hit the ball in a direction prompted the receiver to answer a question, rolling play and discussion around the group. A simple format aimed at effective teamwork and togetherness.',
    turnout: null,
    registration: null,
    pending: false,
    gallery: [{ src: '/events/roll-the-ball/01.jpg', alt: 'E-Cell members play Roll the Ball' }],
    hashtags: [],
  },
  {
    id: 'beyond-the-pitch-funding',
    title: 'Beyond the Pitch — Understanding Funding Options and Evaluation Metrics for Startups',
    date: '2025-01-23',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A talk-series session on structuring effective pitches, startup funding routes, and the metrics investors use to evaluate them.',
    description:
      'Mr. Pradeep Pathiyamveettil gave hands-on guidance on pitch structure and common startup pitfalls, helping participants refine their business ideas, develop market-ready startups, and present confidently to potential investors.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Pradeep Pathiyamveettil', designation: 'Co-founder', org: 'Aavishkaar Venture Management Services Pvt. Ltd.' },
    gallery: [
      { src: '/events/beyond-the-pitch-funding/01.jpg', alt: 'Mr. Pradeep Pathiyamveettil leads the startup funding workshop' },
      { src: '/events/beyond-the-pitch-funding/02.jpg', alt: 'Insights on startup evaluation metrics' },
    ],
    hashtags: [],
  },
  {
    id: 'biz-quiz-2025',
    title: 'BIZ-QUIZ 2025 — Entrepreneurial Quiz for E-Cell Members',
    date: '2025-02-13',
    time: null,
    venue: 'CAL Lab, PSG Institute of Management',
    audience: 'E-Cell members',
    summary:
      'A multi-round business-acumen quiz testing E-Cell members\' entrepreneurship knowledge, led by the club\'s Faculty Coordinator.',
    description:
      'Led by Dr. Vijaykumar N, Faculty Coordinator of E-Cell, the quiz featured multiple rounds challenging participants\' knowledge of entrepreneurship, concluding with recognition of the top-performing teams.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Dr. Vijaykumar N', designation: 'Faculty Coordinator, E-Cell' },
    gallery: [
      { src: '/events/biz-quiz-2025/01.jpg', alt: 'BIZ-QUIZ 2025 participants showcase business acumen' },
      { src: '/events/biz-quiz-2025/02.jpg', alt: 'Top teams recognized at BIZ-QUIZ 2025' },
    ],
    hashtags: [],
  },
  {
    id: 'panel-first-gen-entrepreneurs',
    title: 'Breaking Barriers — The Journey of First-Generation Entrepreneurs',
    date: '2025-02-20',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A panel discussion with three first-generation entrepreneurs on scaling a business, market adaptability, and navigating uncertainty.',
    description:
      'Panelists Premnath Selvakumarasamy (Managing Partner, Agro India Exporters), Ranjith Kumar K (Founder, Moringa Promise Wellness) and Cibi Chakravarthi (Founder, Vairra) shared their entrepreneurial journeys, offering insight into business scalability, market adaptability, and the strategic mindset needed to navigate uncertainty as a first-generation founder.',
    turnout: null,
    registration: null,
    pending: false,
    gallery: [
      { src: '/events/panel-first-gen-entrepreneurs/01.jpg', alt: 'First-generation entrepreneur panelists share insights, photo 1' },
      { src: '/events/panel-first-gen-entrepreneurs/02.jpg', alt: 'First-generation entrepreneur panelists share insights, photo 2' },
      { src: '/events/panel-first-gen-entrepreneurs/03.jpg', alt: 'Industry leaders share entrepreneurial stories, photo 1' },
      { src: '/events/panel-first-gen-entrepreneurs/04.jpg', alt: 'Industry leaders share entrepreneurial stories, photo 2' },
    ],
    hashtags: [],
  },
  {
    id: 'workshop-listen-observe-assess',
    title: 'Listen, Observe, Assess and Respond — A Guide to Thoughtful Action',
    date: '2025-03-06',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A workshop on community radio, podcasting and effective communication, and how observation and listening sharpen it.',
    description:
      'Speakers shared experiences on engaging audiences and the role of broadcasting, discussed the difference between community and commercial radio, and spoke to the growth potential of the industry and the impact of radio as a "blind media."',
    turnout: null,
    registration: null,
    pending: false,
    gallery: [
      { src: '/events/workshop-listen-observe-assess/01.jpg', alt: 'Community radio experts discuss thoughtful communication' },
      { src: '/events/workshop-listen-observe-assess/02.jpg', alt: 'Speakers on podcasting and broadcast engagement' },
      { src: '/events/workshop-listen-observe-assess/03.jpg', alt: 'Interactive workshop on radio as "blind media"' },
    ],
    hashtags: [],
  },
  {
    id: 'young-entrepreneurship-summit-2025',
    title: 'Young Entrepreneurship Summit 2025',
    date: '2025-03-24',
    endDate: '2025-03-25',
    time: null,
    venue: 'ALPS Anaikatti (Day 1); PSG Institute of Management (Day 2)',
    audience: 'Open to participants across India',
    summary:
      'E-Cell\'s flagship two-day summit: a Day 1 bootcamp with resource experts, followed by the VisionVent business plan competition on Day 2.',
    description:
      'Held with sponsors Zen Consultech Pvt Ltd. and Luminescent Chemical India, the Day 1 Bootcamp at the ALPS Anaikatti facility featured sessions from Ramesh Chandran (Founder, Bio Basics) and Dr. Radhika Meenakshi Shankar (Founder, Wise Owl Consulting Services). On Day 2, participants competed in VisionVent, the Business Plan Competition. Winners: Hariprasad (PSG Tech); Sanika J, Yamini M and Oviyaa Sri A V (Dr. N.G.P. Arts and Science College); Ashik D, Sreesanth S S and Gokul Kannan G B (Amrita College of Engineering & Technology, Nagercoil).',
    turnout: null,
    registration: null,
    pending: false,
    gallery: [
      { src: '/events/yes-2025/01.jpg', alt: 'Participants pitch business ideas at Young Entrepreneurship Summit 2025' },
      { src: '/events/yes-2025/02.jpg', alt: 'Day 1 bootcamp with Ramesh Chandran and Dr. Radhika Meenakshi Shankar at ALPS Anaikatti' },
      { src: '/events/yes-2025/03.jpg', alt: 'Business Plan Competition ideas at Young Entrepreneurship Summit 2025' },
      { src: '/events/yes-2025/04.jpg', alt: 'Event gathering at the Young Entrepreneurship Summit 2025 bootcamp' },
    ],
    hashtags: [],
  },
  {
    id: 'talk-series-scaling-flavors',
    title: 'Scaling Flavors — Business Growth Lessons from a Young Entrepreneur',
    date: '2025-08-21',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A talk-series session on scaling a food business, drawn from a young entrepreneur\'s own experience overcoming challenges and building sustainable partnerships.',
    description:
      'The session gave students a comprehensive look at the food business landscape and the entrepreneur\'s journey, sharing experiences about overcoming challenges, building sustainable partnerships, and scaling a business efficiently.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Mohammed Rameez Raja' },
    gallery: [
      { src: '/events/talk-series-scaling-flavors/01.jpg', alt: 'Mohammed Rameez Raja shares scaling lessons in food business' },
      { src: '/events/talk-series-scaling-flavors/02.jpg', alt: 'E-Cell students in dialogue with guest entrepreneur Mohammed Rameez Raja' },
    ],
    hashtags: [],
  },
];

export const events: EventItem[] = [...linkedInEvents, ...pdfReportEvents, ...sampleEvents];

export const eventsNote = 'Confirmed past events, sourced from our LinkedIn posts and the official 2024-25 E-Cell activity report, alongside illustrative placeholders while the rest of the calendar is finalized with the office.';

export function splitEvents(list: EventItem[], now: Date = new Date()): { upcoming: EventItem[]; past: EventItem[] } {
  const upcoming: EventItem[] = [];
  const past: EventItem[] = [];
  for (const ev of list) {
    const end = new Date(ev.endDate ?? ev.date);
    // end-of-day for the comparison date
    end.setHours(23, 59, 59, 999);
    if (end.getTime() >= now.getTime()) {
      upcoming.push(ev);
    } else {
      past.push(ev);
    }
  }
  upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { upcoming, past };
}
