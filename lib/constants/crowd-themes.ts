export interface CrowdTheme {
  cardBg: string;
  cardBorder: string;
  stageBg: string;
  laserColors: [string, string, string, string];
  scoreGlow: string;
  labelColor: string;
  counterColor: string;
  counterBorder: string;
  crowdHead: string;
  crowdBody: string;
  dimNameColor: string;
  dimBarBg: string;
  dimFillHigh: string;
  dimFillMid: string;
}

export const CROWD_THEMES: Record<string, CrowdTheme> = {
  tiktok: {
    cardBg: "#0a0a10",
    cardBorder: "#1a1a24",
    stageBg: `radial-gradient(ellipse at 50% -10%, hsl(262,83%,58%,0.25) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 0%, hsl(320,80%,50%,0.12) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 0%, hsl(200,80%,50%,0.12) 0%, transparent 40%),
      linear-gradient(180deg, #0c0c14 0%, #08080e 100%)`,
    laserColors: [
      "hsl(262,83%,58%)",
      "hsl(320,80%,55%)",
      "hsl(200,80%,55%)",
      "hsl(262,83%,58%)",
    ],
    scoreGlow:
      "0 0 60px hsl(262,83%,58%,0.5), 0 0 120px hsl(262,83%,58%,0.2)",
    labelColor: "hsl(262,83%,75%)",
    counterColor: "#71717a",
    counterBorder: "#1a1a24",
    crowdHead: "#52525b",
    crowdBody: "#3f3f46",
    dimNameColor: "#71717a",
    dimBarBg: "#1a1a24",
    dimFillHigh: "hsl(262,83%,58%)",
    dimFillMid: "hsl(262,60%,45%)",
  },
  spotify: {
    cardBg: "#060e0a",
    cardBorder: "#122a1a",
    stageBg: `radial-gradient(ellipse at 50% -10%, hsl(145,70%,42%,0.25) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 0%, hsl(160,60%,40%,0.12) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 0%, hsl(120,50%,45%,0.12) 0%, transparent 40%),
      linear-gradient(180deg, #080e0a 0%, #050a07 100%)`,
    laserColors: [
      "hsl(145,70%,45%)",
      "hsl(160,60%,50%)",
      "hsl(120,50%,50%)",
      "hsl(145,70%,45%)",
    ],
    scoreGlow:
      "0 0 60px hsl(145,70%,42%,0.5), 0 0 120px hsl(145,70%,42%,0.2)",
    labelColor: "hsl(145,60%,65%)",
    counterColor: "#5a7a66",
    counterBorder: "#122a1a",
    crowdHead: "#3a5a45",
    crowdBody: "#2e4a38",
    dimNameColor: "#5a7a66",
    dimBarBg: "#122a1a",
    dimFillHigh: "hsl(145,70%,42%)",
    dimFillMid: "hsl(145,50%,32%)",
  },
  radio: {
    cardBg: "#0e0a06",
    cardBorder: "#2a2010",
    stageBg: `radial-gradient(ellipse at 50% -10%, hsl(38,80%,50%,0.25) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 0%, hsl(25,70%,45%,0.12) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 0%, hsl(50,70%,50%,0.12) 0%, transparent 40%),
      linear-gradient(180deg, #0e0c08 0%, #0a0806 100%)`,
    laserColors: [
      "hsl(38,80%,50%)",
      "hsl(25,70%,50%)",
      "hsl(50,70%,55%)",
      "hsl(38,80%,50%)",
    ],
    scoreGlow:
      "0 0 60px hsl(38,80%,50%,0.5), 0 0 120px hsl(38,80%,50%,0.2)",
    labelColor: "hsl(38,60%,65%)",
    counterColor: "#7a6a4a",
    counterBorder: "#2a2010",
    crowdHead: "#5a4a30",
    crowdBody: "#4a3e28",
    dimNameColor: "#7a6a4a",
    dimBarBg: "#2a2010",
    dimFillHigh: "hsl(38,80%,50%)",
    dimFillMid: "hsl(38,60%,38%)",
  },
  sync: {
    cardBg: "#060a0e",
    cardBorder: "#102028",
    stageBg: `radial-gradient(ellipse at 50% -10%, hsl(195,80%,45%,0.25) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 0%, hsl(210,70%,45%,0.12) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 0%, hsl(175,60%,45%,0.12) 0%, transparent 40%),
      linear-gradient(180deg, #080c10 0%, #060a0c 100%)`,
    laserColors: [
      "hsl(195,80%,45%)",
      "hsl(210,70%,50%)",
      "hsl(175,60%,50%)",
      "hsl(195,80%,45%)",
    ],
    scoreGlow:
      "0 0 60px hsl(195,80%,45%,0.5), 0 0 120px hsl(195,80%,45%,0.2)",
    labelColor: "hsl(195,60%,65%)",
    counterColor: "#4a6a7a",
    counterBorder: "#102028",
    crowdHead: "#30505a",
    crowdBody: "#28424e",
    dimNameColor: "#4a6a7a",
    dimBarBg: "#102028",
    dimFillHigh: "hsl(195,80%,45%)",
    dimFillMid: "hsl(195,60%,34%)",
  },
};

export const CROWD_SILHOUETTES = [
  { head: 8, body: 20, width: 12, delay: 0 },
  { head: 7, body: 18, width: 10, delay: 0 },
  { head: 9, body: 22, width: 14, delay: 0.4 },
  { head: 7, body: 16, width: 10, delay: 0 },
  { head: 8, body: 24, width: 12, delay: 0.7 },
  { head: 8, body: 20, width: 12, delay: 0 },
  { head: 7, body: 18, width: 10, delay: 0.2 },
  { head: 9, body: 22, width: 14, delay: 0 },
  { head: 8, body: 20, width: 12, delay: 0.5 },
  { head: 7, body: 16, width: 10, delay: 0 },
];

export const LASER_POSITIONS = [
  { left: "20%", rotate: "15deg" },
  { left: "40%", rotate: "5deg" },
  { left: "60%", rotate: "-5deg" },
  { left: "80%", rotate: "-15deg" },
];
