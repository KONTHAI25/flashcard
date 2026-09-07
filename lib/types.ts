export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  interval: number; // days
  ease: number; // SM-2 ease factor
  due: number; // timestamp ms
  streak: number;
  createdAt: number;
}

export interface Deck {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
}
