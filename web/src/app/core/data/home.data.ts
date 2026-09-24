import { WhyContent, WhatHappensContent, EcellWayContent } from '../models/models';

export const why: WhyContent = {
  kicker: 'Why E-Cell?',
  heading: 'Entrepreneurship starts before the startup.',
  lede: 'You don’t need a company name, a pitch deck or a million-dollar idea to think like an entrepreneur. Sometimes, it starts with a question.',
  questions: [
    'Why is this done this way?',
    'What if we tried something different?',
    'Could this problem become an opportunity?',
  ],
  body: 'E-Cell PSGIM exists to create a space for those questions. Through experiences, conversations, collaborations and challenges, we encourage students to explore ideas, develop perspectives and turn curiosity into action.',
};

export const whatHappens: WhatHappensContent = {
  kicker: 'What happens here',
  heading: 'Build. Connect. Experiment. Collaborate. Share.',
  cards: [
    { title: 'Build', body: 'Turn an idea into something people can actually see, use or question.' },
    { title: 'Connect', body: 'Meet founders, alumni, industry voices, students and people who think differently.' },
    { title: 'Experiment', body: 'Workshops, challenges, competitions and projects that take entrepreneurship outside the classroom.' },
    { title: 'Collaborate', body: 'Because good ideas don’t care which department, college or country you come from.' },
    { title: 'Share', body: 'Stories, conversations, lessons and the things we learn along the way.' },
  ],
};

export const ecellWay: EcellWayContent = {
  kicker: 'The E-Cell way',
  heading: 'How we try to work',
  items: [
    { left: 'Curious', right: 'Comfortable', note: 'Ask better questions.' },
    { left: 'Action', right: 'Intention', note: 'Ideas are nice. Execution is nicer.' },
    { left: 'People', right: 'Titles', note: 'The best idea doesn’t always come from the person with the biggest title.' },
    { left: 'Failure', right: 'Pretending', note: 'If something doesn’t work, we learn why.' },
    { left: 'Collaboration', right: 'Competition', note: 'Build together whenever you can.' },
  ],
};
