export interface VotePackage {
  votes: number;
  credits: number;
  label: string;
  description: string;
}

export const VOTE_PACKAGES: VotePackage[] = [
  {
    votes: 10,
    credits: 20,
    label: "Starter",
    description: "Quick feedback round",
  },
  {
    votes: 20,
    credits: 40,
    label: "Standard",
    description: "More votes, better insights",
  },
  {
    votes: 50,
    credits: 100,
    label: "Premium",
    description: "Maximum feedback & accuracy",
  },
];
