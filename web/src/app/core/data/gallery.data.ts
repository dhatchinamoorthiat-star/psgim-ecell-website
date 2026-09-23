import { GalleryAlbum, GalleryItem } from '../models/models';

export const albums: GalleryAlbum[] = [
  { id: 'all', label: 'All' },
  { id: 'events', label: 'Events' },
  { id: 'workshops', label: 'Workshops' },
  { id: 'ideathon', label: 'Ideathon' },
  { id: 'nec', label: 'NEC' },
  { id: 'community', label: 'Community' },
];

export const gallery: GalleryItem[] = [
  { file: 'bootcamp.jpg', caption: 'Bootcamp ’26', album: 'workshops', ratio: 'landscape' },
  { file: 'founders-on-campus.jpg', caption: 'Founders on Campus', album: 'events', ratio: 'portrait' },
  { file: 'ideathon.jpg', caption: 'Ideathon finals', album: 'ideathon', ratio: 'landscape' },
  { file: 'nec-kickoff.jpg', caption: 'NEC kick-off', album: 'nec', ratio: 'square' },
  { file: 'idea-clinic.jpg', caption: 'Idea Clinic', album: 'workshops', ratio: 'portrait' },
  { file: 'team-offsite.jpg', caption: 'Team offsite', album: 'community', ratio: 'landscape' },
  { file: 'workshop-series.jpg', caption: 'Workshop series', album: 'workshops', ratio: 'square' },
  { file: 'campus-drive.jpg', caption: 'Campus drive', album: 'nec', ratio: 'portrait' },
];

export const galleryNote = 'Photography goes in once the shared drive is set up. Tiles without an image are labelled placeholders.';
