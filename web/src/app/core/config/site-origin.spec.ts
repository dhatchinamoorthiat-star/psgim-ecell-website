import config from '../../../../site.config.json';
import { SITE_ORIGIN, absoluteUrl } from './site-origin';

describe('site origin', () => {
  it('comes from site.config.json', () => {
    expect(SITE_ORIGIN).toBe(config.origin);
  });

  it('builds absolute URLs from site paths only', () => {
    expect(absoluteUrl('/events/demo-day')).toBe(`${SITE_ORIGIN}/events/demo-day`);
    expect(() => absoluteUrl('events')).toThrow();
    expect(() => absoluteUrl('//evil.example/x')).toThrow();
  });
});
