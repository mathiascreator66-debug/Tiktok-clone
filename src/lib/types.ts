export type FeedVideo = {
  id: string;
  caption: string;
  videoUrl: string;
  coverUrl: string | null;
  soundName: string | null;
  /** Gallery music URL — mixes with original track (originalVolume) */
  soundUrl: string | null;
  originalVolume: number;
  soundVolume: number;
  soundTrimStartMs: number;
  soundTrimEndMs: number | null;
  videoTrimStartMs: number;
  videoTrimEndMs: number | null;
  textOverlays: import("./media-edit").TextOverlay[];
  captions: import("./media-edit").CaptionCue[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  bookmarkCount: number;
  likedByMe: boolean;
  repostedByMe: boolean;
  bookmarkedByMe: boolean;
  isOwner: boolean;
  pinned: boolean;
  boostedUntil: string | null;
  hashtags?: string[];
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isPro?: boolean;
    isVerified?: boolean;
  };
  /** Présent si cet élément du fil est une republication */
  repost?: {
    id: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
    };
  } | null;
};

export type CommentUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  imageUrl: string | null;
  likeCount: number;
  likedByMe: boolean;
  user: CommentUser;
  replies: CommentItem[];
};

export type StoryItem = {
  id: string;
  mediaUrl: string;
  caption: string | null;
  soundName: string | null;
  soundUrl: string | null;
  originalVolume: number;
  soundVolume: number;
  soundTrimStartMs: number;
  soundTrimEndMs: number | null;
  createdAt: string;
  expiresAt: string;
  viewedByMe: boolean;
};

export type StoryGroup = {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  stories: StoryItem[];
  hasUnviewed: boolean;
};

export type ProfileLinkItem = {
  id?: string;
  url: string;
  label: string | null;
};

export type StoryCommentItem = {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
};

export type StoryReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};
