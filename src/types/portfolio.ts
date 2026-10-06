export type PortfolioImageItem = {
  id: string;
  filename: string;
  status: string;
  sizeBytes: number;
  thumbnailUrl: string | null;
  color: string | null;
  isCover: boolean;
};
