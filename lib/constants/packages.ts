export interface VotePackage {
  votes: number;
  credits: number;
  label: string;
  description: string;
  isFree: boolean;
}

export const VOTE_PACKAGES: VotePackage[] = [
  {
    votes: 20,
    credits: 0,
    label: "Starter",
    description: "Free with every upload",
    isFree: true,
  },
  {
    votes: 50,
    credits: 5,
    label: "Standard",
    description: "More votes, better insights",
    isFree: false,
  },
  {
    votes: 100,
    credits: 12,
    label: "Premium",
    description: "Maximum feedback & accuracy",
    isFree: false,
  },
];
