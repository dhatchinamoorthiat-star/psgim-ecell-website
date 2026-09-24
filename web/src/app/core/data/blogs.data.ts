import { BlogPost } from '../models/models';

export const blogs: BlogPost[] = [
  {
    id: 'sample-blog-1',
    title: 'Why bootstrapped founders beat pitch decks',
    author: 'E-Cell writing team',
    date: '2026-09-01',
    url: null,
    summary: 'A look at how Coimbatore-area founders built revenue before they built slides.',
    pending: true,
  },
];

export const blogsNote =
  'Weekly blogs written by the team on entrepreneurship, posted to our blog portal. Sample entries while the archive is being confirmed.';

export function sortBlogs(list: BlogPost[]): BlogPost[] {
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
