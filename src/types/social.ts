export interface UserProfile {
  user_id: string;
  nickname: string | null;
  bio: string | null;
  share_token: string | null;
  friend_code: string | null;
  updated_at?: string;
}

export interface FriendCodeResult {
  user_id: string;
  nickname: string | null;
  bio: string | null;
  movie_count: number;
  friendship_status: FriendshipStatus | null;
  friendship_id: number | null;
}

export type FriendshipStatus = "pending" | "accepted";

export interface Friendship {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

export interface FriendSearchResult {
  user_id: string;
  nickname: string;
  movie_count: number;
  friendship_status: FriendshipStatus | null;
  friendship_id: number | null;
}

export type ActivityType = "added_watched" | "added_watchlist" | "added_favorite";

export interface FriendActivity {
  id: number;
  user_id: string;
  movie_id: number;
  activity_type: ActivityType;
  created_at: string;
  movie_title: string;
  movie_poster: string | null;
  movie_year: number | null;
  movie_imdb_id: string | null;
  friend_nickname: string | null;
}

export interface MovieRecommendation {
  id: number;
  from_user_id: string;
  to_user_id: string;
  movie_title: string;
  movie_year: number | null;
  movie_poster: string | null;
  movie_imdb_id: string | null;
  movie_genre: string | null;
  movie_imdb_rating: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  from_nickname?: string | null;
  to_nickname?: string | null;
}

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "movie_recommendation";

export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  from_user_id: string | null;
  reference_id: number | null;
  is_read: boolean;
  created_at: string;
  from_nickname?: string | null;
}

export interface PublicProfile {
  user_id: string;
  nickname: string;
  bio: string | null;
  watched_count: number;
  watchlist_count: number;
  favorite_count: number;
  total_count: number;
  friendship_status: FriendshipStatus | null;
  friendship_id: number | null;
}
