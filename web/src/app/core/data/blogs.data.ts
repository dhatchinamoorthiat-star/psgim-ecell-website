import { BlogPost } from '../models/models';
import { BLOG_ARTICLES } from './blog-series.data';

export const blogs: BlogPost[] = BLOG_ARTICLES.map((article) => ({
  id: article.id,
  title: `Part ${article.seriesPart}: ${article.title}`,
  author: article.author,
  date: article.date,
  url: `/blogs/${article.slug}`,
  summary: article.subtitle,
  pending: false,
  slug: article.slug,
  series: article.series,
  seriesPart: article.seriesPart,
  readTime: article.readTime,
  week: article.week,
  category: article.category,
  heroConcept: article.heroConcept,
}));

export const blogsNote =
  'Stories, frameworks and practical insights for student founders — featuring our flagship 4-part series "From Idea to Impact".';

export function sortBlogs(list: BlogPost[]): BlogPost[] {
  return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

