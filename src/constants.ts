/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnimeStory {
  id: string;
  title: string;
  image: string;
  imageUrl?: string;
  isLive?: boolean;
}

export interface ArticleItem {
  id: string;
  title: string;
  category: string;
  description: string;
  content?: string;
  image: string;
  imageUrl?: string;
  author: string;
  date: string;
  views: string | number;
  likes?: number;
  tags: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  rating: number;
  image: string;
  imageUrl?: string;
  studio: string;
}

export const STORIES: AnimeStory[] = [
  { id: '1', title: 'Solo Leveling', image: 'https://picsum.photos/seed/anime1/200/200', isLive: true },
  { id: '2', title: 'Kaiju No. 8', image: 'https://picsum.photos/seed/anime2/200/200' },
  { id: '3', title: 'Wind Breaker', image: 'https://picsum.photos/seed/anime3/200/200' },
  { id: '4', title: 'Hell\'s Paradise', image: 'https://picsum.photos/seed/anime4/200/200' },
  { id: '5', title: 'Oshi no Ko', image: 'https://picsum.photos/seed/anime5/200/200' },
  { id: '6', title: 'Bleach TYBW', image: 'https://picsum.photos/seed/anime6/200/200' },
];

export const ARTICLES: ArticleItem[] = [
  {
    id: 'n1',
    title: 'THE FALL OF NIGHT CITY: WHY WE NEED MORE CYBERPUNK',
    category: 'FEATURED',
    description: 'An in-depth look at how the genre is evolving in 2026 and why gritty realism is taking over.',
    content: '# The Fall of Night City\n\nNight City is more than a location; it\'s a state of mind. In recent years, we\'ve seen a massive resurgence in the cyberpunk genre, but with a unique twist. The "high tech, low life" mantra is being re-evaluated for a modern audience.\n\n## Gritty Realism\n\nTraditional cyberpunk relied on neon aesthetic alone. New projects like "Neon Ghost" are pushing for something deeper: political intrigue and human consequence.',
    image: 'https://picsum.photos/seed/animecity/800/450',
    author: 'SYSTEM_ADMIN',
    date: 'APR 19, 2026',
    views: '12K',
    likes: 450,
    tags: ['Cyberpunk', 'Editorial']
  },
  {
    id: 'n2',
    title: 'MANGA REVOLUTION: THE RISE OF DIGITAL INDEPENDENTS',
    category: 'CULTURE',
    description: 'Independent artists are bypassing traditional publishers to reach global audiences.',
    content: 'The landscape of manga is shifting. Digital platforms have allowed creators to own their IPs while reaching millions.',
    image: 'https://picsum.photos/seed/animemanga/800/450',
    author: 'KUSANAGI',
    date: 'APR 18, 2026',
    views: '8.5K',
    likes: 230,
    tags: ['Manga', 'Industry']
  }
];

export const RECOMMENDATIONS: Recommendation[] = [
  { id: 'r1', title: 'Psycho-Pass', rating: 4.8, image: 'https://picsum.photos/seed/anime7/300/450', studio: 'Production I.G' },
  { id: 'r2', title: 'Ninja Kamui', rating: 4.5, image: 'https://picsum.photos/seed/anime8/300/450', studio: 'E&H Production' },
  { id: 'r3', title: 'Akira', rating: 5.0, image: 'https://picsum.photos/seed/anime9/300/450', studio: 'TMS' },
];

export const DISCUSSIONS = [
  { id: 'd1', user: 'RONIN_01', content: 'The latest chapter of JJK is actually insane. Gege is cooking something dangerous.', likes: 120, replies: 45 },
  { id: 'd2', user: 'CYBER_PUNK', content: 'Anyone else excited for the new Ghost in the Shell animation style?', likes: 85, replies: 12 },
  { id: 'd3', user: 'SATORU_X', content: 'We need more gritty anime like Monster and Pluto. Thoughts?', likes: 340, replies: 23 },
];
