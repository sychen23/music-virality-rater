export interface Dimension {
  key: string;
  name: string;
  emoji: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

export interface Context {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji for display
  dimensions: [Dimension, Dimension, Dimension, Dimension];
}

export const CONTEXTS: Context[] = [
  {
    id: "tiktok",
    name: "TikTok / Reels",
    description: "Short-form viral content for social media",
    icon: "📱",
    dimensions: [
      {
        key: "hook",
        name: "Hook",
        emoji: "🎣",
        description: "How quickly does it grab attention in the first 3 seconds?",
        lowLabel: "Slow start",
        highLabel: "Instant hook",
      },
      {
        key: "stickiness",
        name: "Stickiness",
        emoji: "🧠",
        description: "How likely is it to get stuck in your head?",
        lowLabel: "Forgettable",
        highLabel: "Total earworm",
      },
      {
        key: "moveability",
        name: "Moveability",
        emoji: "💃",
        description: "Does it make you want to dance or create a trend?",
        lowLabel: "No movement",
        highLabel: "Can't sit still",
      },
      {
        key: "uniqueness",
        name: "Uniqueness",
        emoji: "✨",
        description: "Does it stand out from everything else?",
        lowLabel: "Sounds generic",
        highLabel: "One of a kind",
      },
    ],
  },
  {
    id: "spotify",
    name: "Spotify Discover",
    description: "Playlist-ready tracks for streaming discovery",
    icon: "🎧",
    dimensions: [
      {
        key: "replay",
        name: "Replay Value",
        emoji: "🔁",
        description: "Would you listen to this again and again?",
        lowLabel: "One-time listen",
        highLabel: "On repeat",
      },
      {
        key: "production",
        name: "Production Quality",
        emoji: "🎛️",
        description: "How polished and professional does it sound?",
        lowLabel: "Rough demo",
        highLabel: "Studio quality",
      },
      {
        key: "emotion",
        name: "Emotional Impact",
        emoji: "💖",
        description: "How strongly does it make you feel something?",
        lowLabel: "No feeling",
        highLabel: "Deep feels",
      },
      {
        key: "playlist",
        name: "Playlist Fit",
        emoji: "📋",
        description: "How easily does it fit into popular playlists?",
        lowLabel: "Hard to place",
        highLabel: "Perfect fit",
      },
    ],
  },
  {
    id: "radio",
    name: "Radio / Mainstream",
    description: "Broadcast-ready tracks for mass appeal",
    icon: "📻",
    dimensions: [
      {
        key: "singalong",
        name: "Sing-Along Factor",
        emoji: "🎤",
        description: "How easy is it to sing or hum along?",
        lowLabel: "Hard to follow",
        highLabel: "Everyone sings",
      },
      {
        key: "energy",
        name: "Energy Level",
        emoji: "⚡",
        description: "Does it energize the listener?",
        lowLabel: "Low energy",
        highLabel: "High energy",
      },
      {
        key: "structure",
        name: "Song Structure",
        emoji: "🏗️",
        description: "How well-structured is the verse-chorus flow?",
        lowLabel: "Confusing",
        highLabel: "Perfect flow",
      },
      {
        key: "crossover",
        name: "Crossover Appeal",
        emoji: "🌍",
        description: "Could this appeal to multiple demographics?",
        lowLabel: "Niche only",
        highLabel: "Universal",
      },
    ],
  },
  {
    id: "sync",
    name: "Sync / Licensing",
    description: "Music for film, TV, ads, and games",
    icon: "🎬",
    dimensions: [
      {
        key: "mood",
        name: "Mood Setting",
        emoji: "🎭",
        description: "How effectively does it set a mood or scene?",
        lowLabel: "No atmosphere",
        highLabel: "Instant vibe",
      },
      {
        key: "versatility",
        name: "Versatility",
        emoji: "🔄",
        description: "Could this work across different types of content?",
        lowLabel: "Very specific",
        highLabel: "Fits anything",
      },
      {
        key: "instrumental",
        name: "Instrumental Quality",
        emoji: "🎹",
        description: "How strong is the instrumental arrangement?",
        lowLabel: "Weak backing",
        highLabel: "Rich layers",
      },
      {
        key: "licensability",
        name: "Licensability",
        emoji: "📝",
        description: "How likely would a music supervisor pick this?",
        lowLabel: "Unlikely",
        highLabel: "Highly licensable",
      },
    ],
  },
];

export function getContextById(id: string): Context | undefined {
  return CONTEXTS.find((c) => c.id === id);
}
