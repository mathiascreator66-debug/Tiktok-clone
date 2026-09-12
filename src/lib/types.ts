export type FeedVideo = {
  id: string;
  caption: string;
  videoUrl: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  likedByMe: boolean;
  repostedByMe: boolean;
  isOwner: boolean;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
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
