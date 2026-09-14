"use client";

import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Flag,
  History,
  Home,
  Leaf,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  Utensils,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes, type FormEvent } from "react";
import { DEMO_CANDIDATES, DEPARTMENT_OPTIONS, INTEREST_OPTIONS } from "@/lib/mock-data";
import { createInitialState, loadState, saveState } from "@/lib/storage";
import type {
  AppState,
  Candidate,
  Dietary,
  FeedbackType,
  Gender,
  GenderScope,
  Location,
  MealDuration,
  MealRecord,
  MealRequest,
  UserProfile,
} from "@/lib/types";

type View =
  | "welcome"
  | "onboarding"
  | "home"
  | "request"
  | "waiting"
  | "candidate"
  | "response"
  | "matched"
  | "feedback"
  | "feedbackDone"
  | "history"
  | "profile"
  | "noMatch"
  | "noResponse";

type RequestDraft = Omit<MealRequest, "id" | "createdAt">;
type IconType = LucideIcon;

const locations: Location[] = ["九食堂", "十食堂", "十一食堂", "十二食堂", "金鹰", "学则路", "其他"];
const dietaryOptions: Dietary[] = ["无", "素食", "清真", "不吃辣", "其他"];
const durations: MealDuration[] = [20, 30, 45, 60];
const scopeOptions: GenderScope[] = ["不限", "仅同性"];
const avatarColors = ["#76619a", "#c47783", "#4f8190", "#d18d56", "#5d8b71", "#5572a4"];

function localTimeAfter(minutes: number) {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function formatMealTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return (date.getMonth() + 1) + "月" + date.getDate() + "日 " + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

function formatElapsed(seconds: number) {
  if (seconds < 60) {
    return seconds + "秒";
  }
  return Math.floor(seconds / 60) + "分" + String(seconds % 60).padStart(2, "0") + "秒";
}

function makeProfileDraft(): UserProfile {
  return {
    nickname: "",
    gender: "男",
    department: "数学系",
    grade: "大二",
    email: "demo@nju.edu.cn",
    avatarColor: avatarColors[0],
    interests: ["阅读", "音乐"],
    bio: "想找一个时间合适的饭搭子，轻松吃顿饭。",
    verified: false,
    defaultDiet: "无",
  };
}

function makeRequestDraft(): RequestDraft {
  return {
    mealTime: localTimeAfter(30),
    location: "九食堂",
    food: "",
    budget: "",
    diet: "无",
    duration: 30,
    statusText: "随意",
    scope: "不限",
  };
}

function getCandidate(id: string | null) {
  return DEMO_CANDIDATES.find((candidate) => candidate.id === id) ?? null;
}

function dietCompatible(userDiet: Dietary, candidateDiet: Dietary) {
  if (userDiet === "无" || candidateDiet === "无") {
    return true;
  }
  return userDiet === candidateDiet;
}

function findCandidate(
  request: MealRequest,
  profile: UserProfile,
  rejectedIds: string[],
  blockedIds: string[],
) {
  const options = DEMO_CANDIDATES.filter((candidate) => {
    if (rejectedIds.includes(candidate.id) || blockedIds.includes(candidate.id)) {
      return false;
    }
    if (request.location !== "其他" && !candidate.locations.includes(request.location)) {
      return false;
    }
    if (request.location === "其他" && !candidate.locations.includes("其他")) {
      return false;
    }
    if (!dietCompatible(request.diet, candidate.diet)) {
      return false;
    }
    if (Math.abs(candidate.duration - request.duration) > 30) {
      return false;
    }
    if (request.scope === "仅同性" && candidate.gender !== profile.gender) {
      return false;
    }
    if (candidate.genderScope === "仅同性" && candidate.gender !== profile.gender) {
      return false;
    }
    return true;
  });

  const score = (candidate: Candidate) => {
    let value = candidate.newUser ? 0.1 : 0;
    value += candidate.reliability * 0.05;
    value += candidate.diet === request.diet ? 0.12 : 0.04;
    value += candidate.duration === request.duration ? 0.08 : 0;
    return value;
  };

  return options.sort((a, b) => score(b) - score(a))[0] ?? null;
}

function patchRecord(records: MealRecord[], id: string, patch: Partial<MealRecord>) {
  return records.map((record) => (record.id === id ? { ...record, ...patch } : record));
}

function recordForRequest(state: AppState) {
  return state.activeRequest ? state.records.find((record) => record.requestId === state.activeRequest?.id) : undefined;
}

function resolveInitialView(state: AppState): View {
  if (!state.profile) {
    return "welcome";
  }
  if (!state.activeRequest) {
    return "home";
  }
  if (state.pendingResponse === "no-response") {
    return "noResponse";
  }
  if (state.pendingResponse === "no-match") {
    return "noMatch";
  }
  if (state.matchedCandidateId) {
    return "matched";
  }
  if (state.pendingResponse === "waiting") {
    return "response";
  }
  if (state.activeCandidateId) {
    return "candidate";
  }
  return "waiting";
}

function Avatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-9 w-9 text-sm",
    md: "h-12 w-12 text-base",
    lg: "h-16 w-16 text-xl",
  };
  return (
    <div
      className={"flex shrink-0 items-center justify-center rounded-2xl font-semibold text-white shadow-sm " + sizes[size]}
      style={{ backgroundColor: color }}
      aria-label={name + "头像"}
    >
      {name.slice(0, 1)}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger" | "success";
}) {
  const variants = {
    primary: "bg-plum text-white shadow-[0_8px_20px_rgba(91,59,105,0.2)] hover:bg-plumDark",
    secondary: "border border-[#dfd6e1] bg-white text-plum hover:bg-[#faf7fb]",
    quiet: "bg-[#f0ece7] text-ink hover:bg-[#e8e2db]",
    danger: "border border-[#f0caca] bg-[#fff8f8] text-[#a04444] hover:bg-[#fff0f0]",
    success: "bg-[#2f7c55] text-white shadow-[0_8px_20px_rgba(47,124,85,0.18)] hover:bg-[#276947]",
  };
  return (
    <button
      {...props}
      className={"flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 " + variants[variant] + " " + className}
    >
      {children}
    </button>
  );
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "plum" }) {
  const tones = {
    neutral: "bg-[#f1ede8] text-[#655d67]",
    green: "bg-[#e3f2e7] text-[#2f7c55]",
    plum: "bg-[#eee8f1] text-plum",
  };
  return <span className={"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium " + tones[tone]}>{children}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-[#958a97]">{children}</p>;
}

function PageTop({
  title,
  subtitle,
  onBack,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  icon?: IconType;
}) {
  return (
    <div className="flex items-center gap-3 px-5 pb-4 pt-5">
      {onBack ? (
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-plum shadow-sm" aria-label="返回">
          <span aria-hidden="true">‹</span>
        </button>
      ) : null}
      {Icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eee8f1] text-plum">
          <Icon size={19} />
        </div>
      ) : null}
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-xs text-[#8d838e]">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function MealSummary({ request, compact = false }: { request: MealRequest; compact?: boolean }) {
  return (
    <div className={"rounded-2xl border border-[#eee7df] bg-white " + (compact ? "p-3.5" : "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionLabel>这顿饭</SectionLabel>
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <CalendarClock size={16} className="text-plum" />
            <span>{formatMealTime(request.mealTime)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#655d67]">
            <MapPin size={15} className="text-[#9a7c62]" />
            <span>{request.location}</span>
          </div>
        </div>
        <Tag tone="plum">{request.scope}</Tag>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Tag><Utensils size={13} className="mr-1" />{request.food || "吃什么都可以"}</Tag>
        <Tag><Clock3 size={13} className="mr-1" />约{request.duration}分钟</Tag>
        {request.diet !== "无" ? <Tag><Leaf size={13} className="mr-1" />{request.diet}</Tag> : null}
        {request.budget ? <Tag><WalletCards size={13} className="mr-1" />{request.budget}</Tag> : null}
      </div>
    </div>
  );
}

function BottomNav({ view, onNavigate }: { view: View; onNavigate: (next: View) => void }) {
  const items: { label: string; view: View; icon: IconType }[] = [
    { label: "首页", view: "home", icon: Home },
    { label: "记录", view: "history", icon: History },
    { label: "我的", view: "profile", icon: UserRound },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 border-t border-[#e9e2da] bg-[#fbfaf7]/95 px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {items.map((item) => {
        const active = view === item.view;
        const Icon = item.icon;
        return (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={"flex flex-1 flex-col items-center gap-1 py-1 text-xs font-medium " + (active ? "text-plum" : "text-[#958b95]")}
          >
            <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function WelcomePage({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col justify-between px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-plum">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-plum text-white"><Utensils size={18} /></div>
          <span className="font-bold tracking-tight">饭点</span>
        </div>
        <Tag tone="plum">演示版</Tag>
      </div>
      <div className="fade-in pb-8 pt-16">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[30px] bg-[#eee8f1] text-5xl shadow-soft">🍚</div>
        <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-plum">南大仙林 · 即时饭搭子</p>
        <h1 className="max-w-[320px] text-[42px] font-bold leading-[1.12] tracking-[-0.06em] text-ink">半小时后，<br />一起吃饭。</h1>
        <p className="mt-5 max-w-[300px] text-[15px] leading-7 text-[#716974]">面向南大仙林学生的即时饭搭子匹配。只看时间和地点，让一顿饭更容易成局。</p>
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-xs text-[#766d77]">
          <div className="rounded-2xl bg-white/80 p-3"><Clock3 size={17} className="mx-auto mb-1.5 text-plum" /><span>半小时成局</span></div>
          <div className="rounded-2xl bg-white/80 p-3"><UsersRound size={17} className="mx-auto mb-1.5 text-plum" /><span>一次一个人</span></div>
          <div className="rounded-2xl bg-white/80 p-3"><ShieldCheck size={17} className="mx-auto mb-1.5 text-plum" /><span>匹配后聊天</span></div>
        </div>
      </div>
      <div className="pb-2">
        <Button className="w-full" onClick={onStart}>开始使用 <ChevronRight size={18} /></Button>
        <p className="mt-3 text-center text-xs leading-5 text-[#a0979e]">当前为产品演示，页面中的人物均为虚构数据</p>
      </div>
    </div>
  );
}

function OnboardingPage({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: UserProfile;
  setDraft: (draft: UserProfile) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const toggleInterest = (interest: string) => {
    const has = draft.interests.includes(interest);
    setDraft({ ...draft, interests: has ? draft.interests.filter((item) => item !== interest) : [...draft.interests, interest].slice(0, 4) });
  };

  return (
    <div className="px-5 pb-8">
      <PageTop title="先认识一下你" subtitle="只用于这次饭局的基本信息" />
      <div className="mx-5 rounded-2xl border border-[#e6d9ec] bg-[#f3edf5] p-3 text-xs leading-5 text-plum">
        <div className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><span>演示认证：不会连接真实校园认证。南大邮箱仅作为页面示例保存。</span></div>
      </div>
      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div>
          <SectionLabel>小头像</SectionLabel>
          <div className="flex items-center gap-4">
            <Avatar name={draft.nickname || "你"} color={draft.avatarColor} size="lg" />
            <div className="flex flex-wrap gap-2">
              {avatarColors.map((color) => (
                <button type="button" key={color} onClick={() => setDraft({ ...draft, avatarColor: color })} className={"h-8 w-8 rounded-xl border-2 " + (draft.avatarColor === color ? "border-plum" : "border-transparent")} style={{ backgroundColor: color }} aria-label="选择头像颜色" />
              ))}
            </div>
          </div>
        </div>
        <label className="block">
          <SectionLabel>姓名或昵称</SectionLabel>
          <input required value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} placeholder="例如：小明" className="input" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <SectionLabel>性别</SectionLabel>
            <select value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value as Gender })} className="input">
              <option>男</option><option>女</option><option>其他</option>
            </select>
          </label>
          <label>
            <SectionLabel>年级</SectionLabel>
            <select value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} className="input">
              <option>大一</option><option>大二</option><option>大三</option><option>大四</option><option>研究生</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <SectionLabel>院系</SectionLabel>
            <select value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} className="input">
              {DEPARTMENT_OPTIONS.map((department) => <option key={department}>{department}</option>)}
            </select>
          </label>
          <label>
            <SectionLabel>南大邮箱</SectionLabel>
            <input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="input" />
          </label>
        </div>
        <div>
          <SectionLabel>兴趣标签（降低陌生感，不参与匹配）</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => {
              const selected = draft.interests.includes(interest);
              return <button type="button" key={interest} onClick={() => toggleInterest(interest)} className={"rounded-full border px-3 py-2 text-xs " + (selected ? "border-plum bg-[#eee8f1] text-plum" : "border-[#e4ddd6] bg-white text-[#776e78]")}>{interest}</button>;
            })}
          </div>
        </div>
        <label className="block">
          <SectionLabel>一句简单介绍</SectionLabel>
          <textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} rows={3} maxLength={60} className="input resize-none" />
        </label>
        <Button type="submit" className="w-full">模拟认证并进入饭点 <ShieldCheck size={17} /></Button>
      </form>
    </div>
  );
}

function HomePage({
  state,
  onStartRequest,
  onContinue,
}: {
  state: AppState;
  onStartRequest: () => void;
  onContinue: () => void;
}) {
  const latest = state.records[0];
  const active = state.activeRequest;

  return (
    <div className="safe-bottom fade-in">
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-plum">南大仙林 · 饭点</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">嗨，{state.profile?.nickname || "同学"}</h1>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eee8f1] text-plum"><Utensils size={20} /></div>
      </div>
      <div className="mx-5 rounded-2xl border border-[#e4d8ea] bg-[#f3edf5] p-3.5 text-sm leading-6 text-plum">
        <div className="flex gap-2"><Sparkles size={17} className="mt-1 shrink-0" /><span>饭点只关心：什么时候吃、去哪儿吃、能不能顺利碰面。</span></div>
      </div>
      <section className="px-5 pt-7">
        {active ? (
          <div className="mb-4 rounded-3xl bg-plum p-5 text-white shadow-soft">
            <div className="flex items-start justify-between">
              <div><p className="text-xs text-white/65">当前约饭请求</p><h2 className="mt-1 text-xl font-bold">{active.location} · {formatMealTime(active.mealTime)}</h2></div>
              <Tag tone="neutral">进行中</Tag>
            </div>
            <p className="mt-4 text-sm text-white/75">已经发出请求，正在找时间和地点合适的人。</p>
            <Button variant="secondary" onClick={onContinue} className="mt-4 w-full border-white/30 bg-white/10 text-white hover:bg-white/20">继续当前请求 <ChevronRight size={17} /></Button>
          </div>
        ) : (
          <div className="rounded-[30px] border border-[#e9ded5] bg-white p-5 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1e9df] text-[#9b704c]"><Utensils size={23} /></div>
            <p className="mt-5 text-sm font-semibold text-[#8b6a51]">现在想吃饭？</p>
            <h2 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">找个饭搭子，<br />一起去吃。</h2>
            <p className="mt-3 max-w-[270px] text-sm leading-6 text-[#817782]">不用挑很多人。告诉我你什么时候、去哪儿，我只推荐一个合适的人。</p>
            <Button onClick={onStartRequest} className="mt-6 w-full">找个饭搭子 <ChevronRight size={18} /></Button>
          </div>
        )}
      </section>
      <section className="px-5 pt-6">
        <SectionLabel>最近一次约饭</SectionLabel>
        {latest ? (
          <div className="rounded-2xl border border-[#ebe4dc] bg-white p-4">
            <div className="flex items-center justify-between"><div><p className="font-semibold">{latest.candidateName || "正在找饭搭子"}</p><p className="mt-1 text-sm text-[#817782]">{formatMealTime(latest.mealTime)} · {latest.location}</p></div><StatusTag status={latest.status} /></div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#dcd3ca] bg-white/60 p-5 text-sm text-[#8f858e]">还没有记录。下一顿饭，可以从这里开始。</div>
        )}
      </section>
      <section className="px-5 pt-6">
        <SectionLabel>饭点原则</SectionLabel>
        <div className="grid gap-2">
          <Principle icon={UsersRound} title="一次只推荐一个人" text="减少选择压力，让你更快做决定。" />
          <Principle icon={LockKeyhole} title="匹配成功后才开放聊天" text="先确认要一起吃，再交换集合信息。" />
          <Principle icon={SlidersHorizontal} title="兴趣只做自我介绍" text="不拿专业、兴趣和心情给你排序。" />
        </div>
      </section>
    </div>
  );
}

function Principle({ icon: Icon, title, text }: { icon: IconType; title: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-white/75 p-3.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0e9f2] text-plum"><Icon size={17} /></div><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-[#8b818c]">{text}</p></div></div>;
}

function StatusTag({ status }: { status: MealRecord["status"] }) {
  const tone = status === "已匹配" || status === "已完成" ? "green" : status === "未回应" ? "neutral" : status === "已取消" ? "neutral" : "plum";
  return <Tag tone={tone}>{status}</Tag>;
}

function RequestPage({
  draft,
  setDraft,
  onSubmit,
  onBack,
}: {
  draft: RequestDraft;
  setDraft: (draft: RequestDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  return (
    <div className="safe-bottom fade-in">
      <PageTop title="发起约饭" subtitle="告诉我这一顿饭的硬条件" onBack={onBack} icon={Utensils} />
      <form onSubmit={onSubmit} className="space-y-5 px-5 pb-8">
        <div className="rounded-2xl border border-[#e7dcec] bg-[#f3edf5] p-3 text-xs leading-5 text-plum"><div className="flex gap-2"><CircleHelp size={16} className="mt-0.5 shrink-0" /><span>兴趣、专业和当前状态会展示给对方，但不会决定谁被推荐。</span></div></div>
        <label className="block"><SectionLabel>预计吃饭时间</SectionLabel><input required type="datetime-local" value={draft.mealTime} onChange={(event) => setDraft({ ...draft, mealTime: event.target.value })} className="input" /></label>
        <div><SectionLabel>地点</SectionLabel><div className="grid grid-cols-2 gap-2">{locations.map((location) => <button type="button" key={location} onClick={() => setDraft({ ...draft, location })} className={"rounded-xl border px-3 py-3 text-sm " + (draft.location === location ? "border-plum bg-[#eee8f1] font-semibold text-plum" : "border-[#e5ded7] bg-white text-[#665e68]")}>{location}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <label><SectionLabel>想吃什么（可选）</SectionLabel><input value={draft.food} onChange={(event) => setDraft({ ...draft, food: event.target.value })} placeholder="例如：面、盖饭" className="input" /></label>
          <label><SectionLabel>预算（可选）</SectionLabel><select value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: event.target.value })} className="input"><option value="">不填写</option><option>15元以内</option><option>25元以内</option><option>30元以上</option></select></label>
        </div>
        <div><SectionLabel>饮食限制</SectionLabel><div className="flex flex-wrap gap-2">{dietaryOptions.map((diet) => <button type="button" key={diet} onClick={() => setDraft({ ...draft, diet })} className={"rounded-full border px-3.5 py-2.5 text-sm " + (draft.diet === diet ? "border-plum bg-[#eee8f1] font-semibold text-plum" : "border-[#e5ded7] bg-white text-[#665e68]")}>{diet}</button>)}</div></div>
        <div><SectionLabel>预计用餐时长</SectionLabel><div className="grid grid-cols-4 gap-2">{durations.map((duration) => <button type="button" key={duration} onClick={() => setDraft({ ...draft, duration })} className={"rounded-xl border px-2 py-3 text-sm " + (draft.duration === duration ? "border-plum bg-[#eee8f1] font-semibold text-plum" : "border-[#e5ded7] bg-white text-[#665e68]")}>{duration}分钟</button>)}</div></div>
        <div><SectionLabel>当前状态（只展示，不参与匹配）</SectionLabel><div className="grid grid-cols-2 gap-2">{["想聊聊天", "安静吃饭", "赶时间", "随意"].map((statusText) => <button type="button" key={statusText} onClick={() => setDraft({ ...draft, statusText })} className={"rounded-xl border px-3 py-3 text-sm " + (draft.statusText === statusText ? "border-plum bg-[#eee8f1] font-semibold text-plum" : "border-[#e5ded7] bg-white text-[#665e68]")}>{statusText}</button>)}</div></div>
        <div><SectionLabel>匹配范围</SectionLabel><div className="grid grid-cols-2 gap-2">{scopeOptions.map((scope) => <button type="button" key={scope} onClick={() => setDraft({ ...draft, scope })} className={"rounded-xl border px-3 py-3 text-sm " + (draft.scope === scope ? "border-plum bg-[#eee8f1] font-semibold text-plum" : "border-[#e5ded7] bg-white text-[#665e68]")}>{scope}</button>)}</div><p className="mt-2 text-xs text-[#988e98]">这里只提供“不限”和“仅同性”。</p></div>
        <Button type="submit" className="w-full">开始寻找饭搭子 <Compass size={18} /></Button>
      </form>
    </div>
  );
}

function WaitingPage({ request, elapsed, onCancel }: { request: MealRequest; elapsed: number; onCancel: () => void }) {
  return (
    <div className="safe-bottom fade-in px-5">
      <PageTop title="正在找饭搭子" subtitle="演示数据会在几秒后给出一个候选人" icon={Compass} />
      <MealSummary request={request} />
      <div className="mt-5 rounded-3xl border border-[#e8dfd7] bg-white p-7 text-center shadow-card">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#eee8f1] text-plum"><Compass size={34} className="animate-pulse" /></div>
        <h2 className="mt-5 text-xl font-bold">正在寻找合适的饭搭子</h2>
        <p className="mt-2 text-sm leading-6 text-[#817782]">我们只看时间、地点、饮食限制和用餐时长。</p>
        <div className="dotted-loader mt-5"><span /><span /><span /></div>
        <p className="mt-4 text-xs text-[#9b9099]">已等待 {formatElapsed(elapsed)}</p>
      </div>
      <div className="mt-4 rounded-2xl bg-[#f0ece7] p-3.5 text-xs leading-5 text-[#756c74]"><Clock3 size={15} className="mr-1 inline text-plum" />如果暂时没有合适的人，不会让你无限浏览，而是回到发起页重新调整条件。</div>
      <Button variant="quiet" onClick={onCancel} className="mt-5 w-full">取消请求</Button>
    </div>
  );
}

function CandidatePage({ candidate, request, onAccept, onReject }: { candidate: Candidate; request: MealRequest; onAccept: () => void; onReject: () => void }) {
  return (
    <div className="safe-bottom fade-in px-5">
      <PageTop title="找到一个合适的人" subtitle="先看看这一顿饭能不能顺利碰面" icon={UsersRound} />
      <MealSummary request={request} />
      <div className="mt-4 rounded-3xl border border-[#e8dfd7] bg-white p-5 shadow-card">
        <SectionLabel>候选人资料 · 演示数据</SectionLabel>
        <div className="mt-2 flex items-center gap-3">
          <Avatar name={candidate.nickname} color={candidate.avatarColor} size="md" />
          <div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{candidate.nickname}</h2><span className="text-[#2f7c55]"><ShieldCheck size={16} /></span></div><p className="mt-1 text-xs text-[#8b818c]">南大学生已认证 · {candidate.department} · {candidate.grade}</p></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[#f6f2ed] p-3"><p className="text-xs text-[#958b93]">饮食</p><p className="mt-1 text-sm font-semibold">{candidate.diet === "无" ? "无特殊限制" : candidate.diet}</p></div>
          <div className="rounded-2xl bg-[#f6f2ed] p-3"><p className="text-xs text-[#958b93]">用餐时长</p><p className="mt-1 text-sm font-semibold">约{candidate.duration}分钟</p></div>
        </div>
        <div className="mt-3 rounded-2xl bg-[#f6f2ed] p-3"><p className="text-xs text-[#958b93]">当前状态</p><p className="mt-1 text-sm font-semibold">{candidate.statusText}</p></div>
        <div className="mt-4 flex flex-wrap gap-2">{candidate.interests.map((interest) => <Tag key={interest}>{interest}</Tag>)}</div>
        <p className="mt-4 text-sm leading-6 text-[#655d67]">“{candidate.bio}”</p>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-[#a0979e]"><CircleHelp size={14} />兴趣和简介只是帮助你降低陌生感，不会影响匹配顺序。</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onReject}><X size={17} />不太合适</Button>
        <Button onClick={onAccept}>愿意一起吃 <Check size={17} /></Button>
      </div>
    </div>
  );
}

function ResponsePage({ candidate, request, seconds, onAccept, onDecline }: { candidate: Candidate; request: MealRequest; seconds: number; onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="safe-bottom fade-in px-5">
      <PageTop title="等对方确认" subtitle="双方都愿意，才会正式匹配" icon={Clock3} />
      <MealSummary request={request} compact />
      <div className="mt-4 rounded-3xl border border-[#e8dfd7] bg-white p-6 text-center shadow-card">
        <Avatar name={candidate.nickname} color={candidate.avatarColor} size="lg" />
        <h2 className="mt-4 text-xl font-bold">{candidate.nickname} 正在考虑</h2>
        <p className="mt-2 text-sm leading-6 text-[#817782]">给对方一点时间。聊天和具体集合点会在双方确认后开放。</p>
        <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#eee8f1] text-xl font-bold text-plum">{seconds}</div>
        <p className="mt-2 text-xs text-[#9b9099]">模拟等待倒计时</p>
      </div>
      <div className="mt-4 rounded-2xl border border-[#e3d8e7] bg-[#f6f0f7] p-4 text-sm leading-6 text-plum"><Sparkles size={16} className="mr-1 inline" />为了演示完整流程，你可以直接选择对方回应结果。</div>
      <Button variant="success" onClick={onAccept} className="mt-5 w-full">演示：对方接受 <CheckCircle2 size={18} /></Button>
      <Button variant="quiet" onClick={onDecline} className="mt-3 w-full">演示：对方未回应</Button>
    </div>
  );
}

function MatchedPage({
  candidate,
  request,
  messages,
  onSend,
  onMet,
  onCancel,
  onReport,
  onBlock,
}: {
  candidate: Candidate;
  request: MealRequest;
  messages: AppState["messages"];
  onSend: (text: string) => void;
  onMet: () => void;
  onCancel: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  const [draft, setDraft] = useState("");
  const quickMessages = ["我现在出发", "我大约10分钟到", "我们在哪里见？"];

  const send = (text: string) => {
    if (!text.trim()) {
      return;
    }
    onSend(text.trim());
    setDraft("");
  };

  return (
    <div className="safe-bottom fade-in px-5">
      <div className="mb-4 mt-5 rounded-3xl bg-[#e3f2e7] p-5 text-[#286847]">
        <div className="flex items-center gap-2"><CheckCircle2 size={22} /><h1 className="text-xl font-bold">匹配成功</h1></div>
        <p className="mt-2 text-sm leading-6 text-[#3f7658]">现在可以确认集合点并临时聊天了。祝你们吃得开心。</p>
      </div>
      <MealSummary request={request} />
      <div className="mt-4 rounded-2xl border border-[#e8dfd7] bg-white p-4">
        <SectionLabel>你的饭搭子</SectionLabel>
        <div className="flex items-center gap-3"><Avatar name={candidate.nickname} color={candidate.avatarColor} size="sm" /><div><p className="font-semibold">{candidate.nickname}</p><p className="mt-0.5 text-xs text-[#8b818c]">{candidate.department} · {candidate.grade}</p></div><Tag tone="green">已认证</Tag></div>
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#f6f2ed] p-3 text-sm text-[#655d67]"><MapPin size={16} className="mt-0.5 shrink-0 text-[#9a7c62]" /><span>建议集合：{request.location === "金鹰" ? "金鹰入口" : request.location + "门口"}<br /><span className="text-xs text-[#9b9099]">具体位置只在匹配成功后开放</span></span></div>
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl border border-[#e8dfd7] bg-white">
        <div className="flex items-center justify-between border-b border-[#eee7df] px-4 py-3"><div className="flex items-center gap-2 font-semibold"><MessageCircle size={17} className="text-plum" />临时聊天</div><Tag tone="green">已开放</Tag></div>
        <div className="max-h-48 space-y-2 overflow-y-auto p-4">
          {messages.length === 0 ? <p className="py-4 text-center text-sm text-[#9b9099]">还没有消息，可以从下面的快捷消息开始。</p> : messages.map((message) => <div key={message.id} className={"flex " + (message.sender === "me" ? "justify-end" : "justify-start")}><div className={"max-w-[82%] rounded-2xl px-3 py-2 text-sm " + (message.sender === "me" ? "rounded-br-md bg-plum text-white" : "rounded-bl-md bg-[#f0ece7] text-ink")}>{message.text}</div></div>)}
        </div>
        <div className="flex gap-2 overflow-x-auto border-t border-[#eee7df] px-4 py-3 no-scrollbar">{quickMessages.map((message) => <button key={message} onClick={() => send(message)} className="shrink-0 rounded-full bg-[#f0ece7] px-3 py-2 text-xs text-[#665e68]">{message}</button>)}</div>
        <div className="flex gap-2 border-t border-[#eee7df] p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(draft); }} placeholder="匹配后才能聊天" className="input min-h-10 flex-1 rounded-xl py-2.5" /><button onClick={() => send(draft)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum text-white"><Send size={17} /></button></div>
      </div>
      <Button variant="success" onClick={onMet} className="mt-4 w-full">已见面，饭后反馈 <CheckCircle2 size={17} /></Button>
      <div className="mt-4 flex items-center justify-center gap-4 pb-4 text-xs text-[#9a9099]"><button onClick={onCancel} className="hover:text-[#a04444]">取消饭局</button><span>·</span><button onClick={onReport} className="hover:text-[#a04444]">举报</button><span>·</span><button onClick={onBlock} className="hover:text-[#a04444]">拉黑并结束</button></div>
    </div>
  );
}

function FeedbackPage({
  candidate,
  onFeedback,
  onReport,
  onBlock,
}: {
  candidate: Candidate;
  onFeedback: (feedback: FeedbackType) => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  return (
    <div className="safe-bottom fade-in px-5">
      <PageTop title="饭后反馈" subtitle="你的反馈只用于改进后续匹配" icon={CheckCircle2} />
      <div className="mt-2 rounded-3xl border border-[#e8dfd7] bg-white p-6 text-center shadow-card">
        <Avatar name={candidate.nickname} color={candidate.avatarColor} size="lg" />
        <h2 className="mt-5 text-2xl font-bold">以后还愿意和 TA 一起吃饭吗？</h2>
        <p className="mt-3 text-sm leading-6 text-[#817782]">不做 1–5 分评分，也不会公开累计星数。</p>
        <Button variant="success" onClick={() => onFeedback("star")} className="mt-6 w-full"><Star size={17} />愿意再次一起吃</Button>
        <Button variant="secondary" onClick={() => onFeedback("skip")} className="mt-3 w-full">跳过</Button>
      </div>
      <div className="mt-4 rounded-2xl border border-[#eee1e1] bg-[#fffafa] p-4">
        <p className="text-sm font-semibold text-[#704b4b]">遇到问题？</p>
        <p className="mt-1 text-xs leading-5 text-[#9a7777]">可以提交爽约、不当行为举报，或直接拉黑。我们不会把这些信息展示成公开评分。</p>
        <div className="mt-3 flex gap-2"><Button variant="danger" onClick={onReport} className="min-h-10 flex-1 px-2 text-xs"><Flag size={14} />举报</Button><Button variant="danger" onClick={onBlock} className="min-h-10 flex-1 px-2 text-xs">拉黑 TA</Button></div>
      </div>
    </div>
  );
}

function HistoryPage({ records }: { records: MealRecord[] }) {
  return (
    <div className="safe-bottom fade-in">
      <PageTop title="记录" subtitle="只保留饭局记录，不做好友列表" icon={History} />
      <div className="mx-5 rounded-2xl border border-[#e7dcec] bg-[#f3edf5] p-3 text-xs leading-5 text-plum"><div className="flex gap-2"><LockKeyhole size={15} className="mt-0.5 shrink-0" /><span>匹配前不能聊天，也不能主动搜索某个人再次聊天。</span></div></div>
      <div className="mt-5 space-y-3 px-5">
        {records.length === 0 ? <div className="rounded-3xl border border-dashed border-[#dcd3ca] bg-white/60 p-8 text-center"><History size={26} className="mx-auto text-[#b0a5ad]" /><p className="mt-3 font-semibold">还没有饭局记录</p><p className="mt-1 text-sm text-[#9b9099]">完成一次约饭后，记录会出现在这里。</p></div> : records.map((record) => <div key={record.id} className="rounded-2xl border border-[#e9e1d9] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{record.candidateName || "寻找饭搭子"}</p><p className="mt-1 text-sm text-[#817782]">{formatMealTime(record.mealTime)} · {record.location}</p></div><StatusTag status={record.status} /></div>{record.feedback ? <p className="mt-3 text-xs text-[#8c818b]">{record.feedback === "star" ? "已记录：愿意再次一起吃" : "已跳过饭后反馈"}</p> : null}</div>)}
      </div>
    </div>
  );
}

function ProfilePage({ state, onLogout }: { state: AppState; onLogout: () => void }) {
  const profile = state.profile;
  if (!profile) {
    return null;
  }
  return (
    <div className="safe-bottom fade-in">
      <PageTop title="我的" subtitle="管理你的演示资料和安全设置" icon={UserRound} />
      <div className="mx-5 rounded-3xl border border-[#e8dfd7] bg-white p-5 shadow-card">
        <div className="flex items-center gap-3"><Avatar name={profile.nickname} color={profile.avatarColor} size="md" /><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{profile.nickname}</h2><ShieldCheck size={16} className="text-[#2f7c55]" /></div><p className="mt-1 text-xs text-[#8b818c]">{profile.department} · {profile.grade}</p></div></div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#e3f2e7] px-3 py-2.5 text-xs font-semibold text-[#2f7c55]"><CheckCircle2 size={15} />南大学生已认证（模拟）</div>
        <p className="mt-3 text-sm leading-6 text-[#655d67]">“{profile.bio}”</p>
        <div className="mt-3 flex flex-wrap gap-2">{profile.interests.map((interest) => <Tag key={interest}>{interest}</Tag>)}</div>
      </div>
      <div className="mx-5 mt-5 rounded-2xl border border-[#e8dfd7] bg-white p-4"><div className="flex items-center justify-between"><div><p className="font-semibold">饮食限制</p><p className="mt-1 text-xs text-[#958b93]">发起约饭时可以单独调整</p></div><Tag tone="plum">{profile.defaultDiet}</Tag></div></div>
      <div className="mx-5 mt-3 rounded-2xl border border-[#e8dfd7] bg-white p-4"><div className="flex items-center justify-between"><div><p className="font-semibold">黑名单</p><p className="mt-1 text-xs text-[#958b93]">被拉黑的人不会再次推荐</p></div><span className="text-sm text-[#817782]">{state.blockedIds.length} 人</span></div>{state.blockedIds.length > 0 ? <div className="mt-3 space-y-2">{state.blockedIds.map((id) => <div key={id} className="flex items-center gap-2 text-sm text-[#6d646d]"><div className="h-2 w-2 rounded-full bg-[#b77c7c]" />{getCandidate(id)?.nickname || "演示用户"}</div>)}</div> : null}</div>
      <div className="mx-5 mt-3 rounded-2xl border border-[#e8dfd7] bg-white p-4"><div className="flex gap-3"><LockKeyhole size={18} className="mt-0.5 shrink-0 text-plum" /><div><p className="font-semibold">隐私说明</p><p className="mt-1 text-xs leading-5 text-[#817782]">资料只在匹配卡片和成功后的临时饭局中展示。兴趣、专业和心情不参与匹配，也不会公开星数。</p></div></div></div>
      <Button variant="quiet" onClick={onLogout} className="mx-5 mt-5 w-[calc(100%-40px)]">退出模拟登录</Button>
    </div>
  );
}

function EmptyProcessPage({ title, text, action, actionText, icon: Icon }: { title: string; text: string; action: () => void; actionText: string; icon: IconType }) {
  return <div className="px-5"><PageTop title={title} icon={Icon} /><div className="mt-4 rounded-3xl border border-dashed border-[#dcd3ca] bg-white/70 p-8 text-center"><Icon size={34} className="mx-auto text-plum" /><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#817782]">{text}</p><Button onClick={action} className="mt-6 w-full">{actionText}</Button></div></div>;
}

export default function FoodBuddyApp() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [view, setView] = useState<View>("welcome");
  const [hydrated, setHydrated] = useState(false);
  const [profileDraft, setProfileDraft] = useState<UserProfile>(makeProfileDraft);
  const [requestDraft, setRequestDraft] = useState<RequestDraft>(makeRequestDraft);
  const [elapsed, setElapsed] = useState(0);
  const [responseSeconds, setResponseSeconds] = useState(20);
  const [toast, setToast] = useState("");
  const [lastCompletedName, setLastCompletedName] = useState("");
  const [lastCompletedFeedback, setLastCompletedFeedback] = useState<FeedbackType>("skip");

  useEffect(() => {
    const stored = loadState();
    if (stored) {
      setState(stored);
      setView(resolveInitialView(stored));
      if (stored.profile) {
        setProfileDraft(stored.profile);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveState(state);
    }
  }, [state, hydrated]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    if (view !== "waiting" || !state.activeRequest) {
      return;
    }
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - state.activeRequest!.createdAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [view, state.activeRequest?.id]);

  useEffect(() => {
    if (!hydrated || view !== "waiting" || !state.activeRequest || state.activeCandidateId || state.pendingResponse !== "none") {
      return;
    }

    const timer = window.setTimeout(() => {
      const candidate = state.profile ? findCandidate(state.activeRequest!, state.profile, state.rejectedCandidateIds, state.blockedIds) : null;
      if (candidate) {
        setState((previous) => ({ ...previous, activeCandidateId: candidate.id }));
        setView("candidate");
      } else {
        setState((previous) => ({ ...previous, pendingResponse: "no-match" }));
        setView("noMatch");
      }
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [hydrated, view, state.activeRequest?.id, state.activeCandidateId, state.pendingResponse, state.rejectedCandidateIds.join(","), state.blockedIds.join(",")]);

  useEffect(() => {
    if (view !== "response" || state.pendingResponse !== "waiting") {
      return;
    }
    setResponseSeconds(20);
    const timer = window.setInterval(() => setResponseSeconds((previous) => Math.max(previous - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [view, state.pendingResponse]);

  const activeCandidate = getCandidate(state.activeCandidateId || state.matchedCandidateId);
  const activeRecord = recordForRequest(state);

  const updateActiveRecord = (patch: Partial<MealRecord>) => {
    if (!activeRecord) {
      return;
    }
    setState((previous) => ({ ...previous, records: patchRecord(previous.records, activeRecord.id, patch) }));
  };

  const goHome = () => setView("home");

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileDraft.nickname.trim() || !profileDraft.email.includes("@")) {
      showToast("请填写昵称和南大邮箱");
      return;
    }
    const profile = { ...profileDraft, nickname: profileDraft.nickname.trim(), verified: true };
    setState((previous) => ({ ...previous, profile }));
    setView("home");
    showToast("模拟认证完成，欢迎来到饭点");
  };

  const handleRequestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request: MealRequest = { ...requestDraft, id: "request-" + Date.now(), createdAt: Date.now() };
    const record: MealRecord = { id: "record-" + Date.now(), requestId: request.id, createdAt: request.createdAt, status: "等待中", mealTime: request.mealTime, location: request.location };
    setState((previous) => ({
      ...previous,
      activeRequest: request,
      activeCandidateId: null,
      pendingResponse: "none",
      matchedCandidateId: null,
      rejectedCandidateIds: [],
      messages: [],
      records: [record, ...previous.records],
    }));
    setView("waiting");
  };

  const clearActiveRequest = () => {
    setState((previous) => ({
      ...previous,
      activeRequest: null,
      activeCandidateId: null,
      matchedCandidateId: null,
      pendingResponse: "none",
      messages: [],
      rejectedCandidateIds: [],
    }));
  };

  const handleCancel = () => {
    if (activeRecord) {
      updateActiveRecord({ status: "已取消" });
    }
    clearActiveRequest();
    setView("home");
    showToast("已取消这次约饭");
  };

  const handleReject = () => {
    if (!state.activeCandidateId) {
      return;
    }
    const rejectedId = state.activeCandidateId;
    setState((previous) => ({ ...previous, activeCandidateId: null, rejectedCandidateIds: [...previous.rejectedCandidateIds, rejectedId] }));
    setView("waiting");
  };

  const handleAcceptCandidate = () => {
    if (!state.activeCandidateId) {
      return;
    }
    setState((previous) => ({ ...previous, pendingResponse: "waiting" }));
    setView("response");
  };

  const handleNoResponse = () => {
    updateActiveRecord({ status: "未回应", candidateId: state.activeCandidateId || undefined, candidateName: activeCandidate?.nickname });
    setState((previous) => ({ ...previous, pendingResponse: "no-response" }));
    setView("noResponse");
  };

  const handleDemoAccept = () => {
    if (!activeCandidate || !state.activeRequest) {
      return;
    }
    updateActiveRecord({ status: "已匹配", candidateId: activeCandidate.id, candidateName: activeCandidate.nickname });
    setState((previous) => ({ ...previous, matchedCandidateId: activeCandidate.id, pendingResponse: "none", activeCandidateId: null, messages: [{ id: "hello-" + Date.now(), sender: "them", text: "你好，等下在食堂门口见？", createdAt: Date.now() }] }));
    setView("matched");
  };

  const handleSend = (text: string) => {
    setState((previous) => ({ ...previous, messages: [...previous.messages, { id: "message-" + Date.now(), sender: "me", text, createdAt: Date.now() }] }));
  };

  const handleReport = () => {
    setState((previous) => ({ ...previous, reports: [...previous.reports, "report-" + Date.now()] }));
    showToast("已记录举报，感谢你的反馈");
  };

  const handleBlock = () => {
    const id = state.matchedCandidateId || state.activeCandidateId;
    if (id) {
      setState((previous) => ({ ...previous, blockedIds: Array.from(new Set([...previous.blockedIds, id])), reports: [...previous.reports, "block-" + Date.now()] }));
    }
    if (activeRecord) {
      updateActiveRecord({ status: "已取消" });
    }
    clearActiveRequest();
    setView("home");
    showToast("已拉黑并结束这次饭局");
  };

  const handleMet = () => {
    setView("feedback");
  };

  const handleFeedback = (feedback: FeedbackType) => {
    if (!activeCandidate || !activeRecord) {
      setView("home");
      return;
    }
    updateActiveRecord({ status: "已完成", feedback, candidateId: activeCandidate.id, candidateName: activeCandidate.nickname });
    setLastCompletedName(activeCandidate.nickname);
    setLastCompletedFeedback(feedback);
    clearActiveRequest();
    setView("feedbackDone");
  };

  const handleLogout = () => {
    if (!window.confirm("确定退出演示账号吗？本地模拟数据会被清除。")) {
      return;
    }
    window.localStorage.clear();
    const fresh = createInitialState();
    setState(fresh);
    setProfileDraft(makeProfileDraft());
    setRequestDraft(makeRequestDraft());
    setView("welcome");
  };

  const navigate = (next: View) => {
    if (next === "home" || next === "history" || next === "profile") {
      setView(next);
    }
  };

  if (!hydrated) {
    return <main className="app-frame flex min-h-dvh items-center justify-center bg-rice text-sm text-[#8d838e]">正在打开饭点…</main>;
  }

  let page: React.ReactNode;
  if (view === "welcome") {
    page = <WelcomePage onStart={() => setView("onboarding")} />;
  } else if (view === "onboarding") {
    page = <OnboardingPage draft={profileDraft} setDraft={setProfileDraft} onSubmit={handleProfileSubmit} />;
  } else if (view === "home") {
    page = <HomePage state={state} onStartRequest={() => { setRequestDraft(makeRequestDraft()); setView("request"); }} onContinue={() => setView(resolveInitialView(state))} />;
  } else if (view === "request") {
    page = <RequestPage draft={requestDraft} setDraft={setRequestDraft} onSubmit={handleRequestSubmit} onBack={goHome} />;
  } else if (view === "waiting" && state.activeRequest) {
    page = <WaitingPage request={state.activeRequest} elapsed={elapsed} onCancel={handleCancel} />;
  } else if (view === "candidate" && activeCandidate && state.activeRequest) {
    page = <CandidatePage candidate={activeCandidate} request={state.activeRequest} onAccept={handleAcceptCandidate} onReject={handleReject} />;
  } else if (view === "response" && activeCandidate && state.activeRequest) {
    page = <ResponsePage candidate={activeCandidate} request={state.activeRequest} seconds={responseSeconds} onAccept={handleDemoAccept} onDecline={handleNoResponse} />;
  } else if (view === "matched" && activeCandidate && state.activeRequest) {
    page = <MatchedPage candidate={activeCandidate} request={state.activeRequest} messages={state.messages} onSend={handleSend} onMet={handleMet} onCancel={handleCancel} onReport={handleReport} onBlock={handleBlock} />;
  } else if (view === "feedback" && activeCandidate) {
    page = <FeedbackPage candidate={activeCandidate} onFeedback={handleFeedback} onReport={handleReport} onBlock={handleBlock} />;
  } else if (view === "feedbackDone") {
    page = <div className="px-5 pt-20 text-center fade-in"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#e3f2e7] text-[#2f7c55]"><CheckCircle2 size={38} /></div><h1 className="mt-6 text-2xl font-bold">这顿饭记录好了</h1><p className="mt-3 text-sm leading-6 text-[#817782]">{lastCompletedName || "对方"} 的反馈已保存到演示数据中。{lastCompletedFeedback === "star" ? "感谢你留下愿意再次一起吃的反馈。" : "下次需要时，饭点还会继续帮你找人。"}</p><Button onClick={goHome} className="mt-8 w-full">回到首页</Button><Button variant="quiet" onClick={() => setView("history")} className="mt-3 w-full">查看记录</Button></div>;
  } else if (view === "history") {
    page = <HistoryPage records={state.records} />;
  } else if (view === "profile") {
    page = <ProfilePage state={state} onLogout={handleLogout} />;
  } else if (view === "noMatch") {
    page = <EmptyProcessPage title="这次暂时没找到" text="当前条件下没有合适的演示候选人。你可以调整地点、饮食限制或时间，再发起一次。" action={() => { clearActiveRequest(); setRequestDraft(makeRequestDraft()); setView("request"); }} actionText="调整条件再找" icon={Compass} />;
  } else if (view === "noResponse") {
    page = <EmptyProcessPage title="对方暂时没回应" text="我们不会让你一直等，也不会无限展示下一批人。你可以稍后重新发起一次约饭。" action={() => { clearActiveRequest(); setRequestDraft(makeRequestDraft()); setView("request"); }} actionText="重新发起约饭" icon={Clock3} />;
  } else {
    page = <HomePage state={state} onStartRequest={() => setView("request")} onContinue={() => setView(resolveInitialView(state))} />;
  }

  const showNav = Boolean(state.profile) && (view === "home" || view === "history" || view === "profile");

  return (
    <main className="app-frame relative min-h-dvh">
      {page}
      {showNav ? <BottomNav view={view} onNavigate={navigate} /> : null}
      {toast ? <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#302833] px-4 py-2.5 text-xs font-medium text-white shadow-lg">{toast}</div> : null}
    </main>
  );
}
