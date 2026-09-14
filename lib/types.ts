export type Gender = "男" | "女" | "其他";
export type GenderScope = "不限" | "仅同性";
export type Location =
  | "九食堂"
  | "十食堂"
  | "十一食堂"
  | "十二食堂"
  | "金鹰"
  | "学则路"
  | "其他";
export type Dietary = "无" | "素食" | "清真" | "不吃辣" | "其他";
export type MealDuration = 20 | 30 | 45 | 60;
export type MealStatus = "等待中" | "已匹配" | "已完成" | "已取消" | "未回应";
export type FeedbackType = "star" | "skip";

export interface UserProfile {
  nickname: string;
  gender: Gender;
  department: string;
  grade: string;
  email: string;
  avatarColor: string;
  interests: string[];
  bio: string;
  verified: boolean;
  defaultDiet: Dietary;
}

export interface MealRequest {
  id: string;
  createdAt: number;
  mealTime: string;
  location: Location;
  food: string;
  budget: string;
  diet: Dietary;
  duration: MealDuration;
  statusText: string;
  scope: GenderScope;
}

export interface Candidate {
  id: string;
  nickname: string;
  gender: Gender;
  department: string;
  grade: string;
  avatarColor: string;
  locations: Location[];
  diet: Dietary;
  duration: MealDuration;
  statusText: string;
  interests: string[];
  bio: string;
  genderScope: GenderScope;
  reliability: number;
  newUser?: boolean;
}

export interface MealRecord {
  id: string;
  requestId: string;
  createdAt: number;
  status: MealStatus;
  mealTime: string;
  location: Location;
  candidateId?: string;
  candidateName?: string;
  feedback?: FeedbackType;
}

export interface ChatMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  createdAt: number;
}

export interface AppState {
  profile: UserProfile | null;
  activeRequest: MealRequest | null;
  activeCandidateId: string | null;
  pendingResponse: "none" | "waiting" | "no-response" | "no-match";
  matchedCandidateId: string | null;
  rejectedCandidateIds: string[];
  blockedIds: string[];
  records: MealRecord[];
  messages: ChatMessage[];
  reports: string[];
}
