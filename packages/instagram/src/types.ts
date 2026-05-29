/** Q2 Graph API media fields (snake_case as returned by Graph). */
export type GraphMediaFields = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

/** Scrape-shaped post fields (camelCase internal convention). */
export type ScrapePostFields = {
  shortcode: string;
  caption?: string;
  likes?: number;
  comments?: number;
  url?: string;
  mediaType?: "reel" | "carousel" | "image";
  thumbnailUrl?: string;
  videoUrl?: string;
  carouselUrls?: string[];
  postedAt?: string;
};

export type CollectSource = "scrape" | "graph";

/** Q1 — one merged payload per shortcode for `instagram_post_raw` snapshots. */
export type MergedInstagramPostPayload = {
  shortcode: string;
  sources: CollectSource[];
  graph?: GraphMediaFields;
  scrape?: ScrapePostFields;
};

export type GraphUserFields = {
  id: string;
  username?: string;
};
