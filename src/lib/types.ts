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

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
};
