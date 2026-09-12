export type FeedVideo = {
  id: string;
  caption: string;
  videoUrl: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
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
