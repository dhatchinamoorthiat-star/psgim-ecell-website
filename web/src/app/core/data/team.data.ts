import { FacultyMember, Patron, TeamRole, NecTeam } from '../models/models';

export const faculty: FacultyMember[] = [
  { name: 'Dr. Venketalakshmi', role: 'Faculty Coordinator', org: 'PSGIM E-Cell', photo: 'venketalakshmi.jpg' },
  { name: 'Dr. Vijay Vardhan', role: 'Faculty Coordinator', org: 'PSGIM E-Cell', photo: 'vijay-vardhan.jpg' },
];

export const patron: Patron = { name: 'Dr. Srividya', role: 'Director, PSG Institute of Management' };

export const roles: TeamRole[] = [
  { role: 'Lead', name: 'Nimisha Sivakumar', remit: 'Overall delivery, faculty liaison' },
  { role: 'Technical', name: 'Dhatchina Moorthi TA', remit: 'Website, tooling, data' },
  { role: 'Content & outreach', name: null, remit: 'Copy, event write-ups, collaborations' },
  { role: 'Design & social', name: null, remit: 'Post templates, calendar, publishing' },
  { role: 'Events', name: null, remit: 'Logistics, speakers, venues' },
  { role: 'Analytics', name: null, remit: 'Weekly metrics to the coordinators' },
];

export const rolesNote = 'Assigned from the core team. Roles are confirmed with the faculty coordinators each cycle.';

export const necTeam: NecTeam = {
  lead: { name: 'Nimisha Sivakumar', role: 'Team Leader', photo: 'nimisha-sivakumar.jpg' },
  members: [
    { name: 'Sakia NS', photo: 'sakia-ns.jpg' },
    { name: 'Suthaarshiny R S', photo: 'suthaarshiny-r-s.jpg' },
    { name: 'Susrutha Dhanaraj', photo: 'susrutha-dhanaraj.jpg' },
    { name: 'Shabharish M', photo: 'shabharish-m.jpg' },
    { name: 'Nithin Teja S', photo: 'nithin-teja-s.jpg' },
    { name: 'Jeyashri', photo: 'jeyashri.jpg' },
    { name: 'Pranav S V', photo: 'pranav-s-v.jpg' },
    { name: 'Shiva Monish R', photo: 'shiva-monish-r.jpg' },
    { name: 'Charan Balaji', photo: 'charan-balaji.jpg' },
    { name: 'Prabodhini A', photo: 'prabodhini-a.jpg' },
    { name: 'Ajjay Marshal', photo: 'ajjay-marshal.jpg' },
    { name: 'Sruthi B', photo: 'sruthi-b.jpg' },
    { name: 'Amrutha Sivaani', photo: 'amrutha-sivaani.jpg' },
    { name: 'Shanjai K', photo: 'shanjai-k.jpg' },
    { name: 'Hefna Frenchia D', photo: 'hefna-frenchia-d.jpg' },
    { name: 'V Shrinidhi', photo: 'v-shrinidhi.jpg' },
    { name: 'Jegadharani', photo: 'jegadharani.jpg' },
    { name: 'Akshaya Nadar', photo: 'akshaya-nadar.jpg' },
    { name: 'Kamali Shree U S', photo: 'kamali-shree-u-s.jpg' },
    { name: 'Athmika A', photo: 'athmika-a.jpg' },
    { name: 'Khavya S', photo: 'khavya-s.jpg' },
    { name: 'Dhatchina Moorthi TA', photo: 'dhatchina-moorthi-ta.jpg' },
  ],
  note: 'Photos are being added — members without one show their initials.',
};

export const necTeamSize = necTeam.members.length + 1; // = 23
