"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, Bookmark, Check, CheckCircle2, Copy, Film, Hash,
  Heart, Loader2, MessageSquare, Pencil, Search,
  UserCheck, UserMinus, UserPlus, UserX, Users, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type {
  ActivityType, FriendActivity, FriendCodeResult, Friendship,
  FriendSearchResult, MovieRecommendation, UserProfile,
} from "@/types/social";

// ─── types ───────────────────────────────────────────────────────────────────

type FriendRow = { friendship: Friendship; nickname: string | null; other_id: string };
type Tab = "friends" | "requests" | "activity" | "find";
type ActivitySubTab = "feed" | "recs";

// ─── session cache ────────────────────────────────────────────────────────────

let _sessionFriends: FriendRow[] | null = null;
let _sessionReceived: FriendRow[] | null = null;
let _sessionSent: FriendRow[] | null = null;
let _sessionActivityFeed: FriendActivity[] | null = null;
let _sessionRecsList: MovieRecommendation[] | null = null;

// ─── helpers ─────────────────────────────────────────────────────────────────

function groupByDate(items: FriendActivity[]): Array<{ label: string; items: FriendActivity[] }> {
  const map = new Map<string, FriendActivity[]>();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  for (const item of items) {
    const d = new Date(item.created_at); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = new Date(item.created_at).toLocaleDateString("en-US", {
      month: "long", day: "numeric",
      ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }),
    });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
}

function Avatar({ nickname, size = "md" }: { nickname: string | null; size?: "sm" | "md" | "lg" }) {
  const letter = nickname ? nickname[0].toUpperCase() : "?";
  const cls = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-14 w-14 text-xl" : "h-9 w-9 text-sm";
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full border border-[#1E2D3D] bg-gradient-to-br from-[#1A2436] to-[#0F1927] font-bold text-[#B49A70]", cls)}>
      {letter}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function FriendsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [nickSaving, setNickSaving] = useState(false);
  const [nickError, setNickError] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Friends
  const [friends, setFriends] = useState<FriendRow[]>(_sessionFriends ?? []);
  const [received, setReceived] = useState<FriendRow[]>(_sessionReceived ?? []);
  const [sent, setSent] = useState<FriendRow[]>(_sessionSent ?? []);
  const [friendsLoading, setFriendsLoading] = useState(_sessionFriends === null);

  // Tabs
  const [tab, setTab] = useState<Tab>("friends");
  const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>("feed");

  // Activity + recs
  const [activityFeed, setActivityFeed] = useState<FriendActivity[]>(_sessionActivityFeed ?? []);
  const [recsList, setRecsList] = useState<MovieRecommendation[]>(_sessionRecsList ?? []);
  const [activityLoading, setActivityLoading] = useState(false);

  // Find — nickname
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  // Find — friend code
  const [codeInput, setCodeInput] = useState("");
  const [codePreview, setCodePreview] = useState<FriendCodeResult | null>(null);
  const [codeLooking, setCodeLooking] = useState(false);
  const [codeMsg, setCodeMsg] = useState("");

  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  // ── auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // ── data loading
  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single();
    if (data) { setProfile(data); setNickInput(data.nickname ?? ""); setBioInput(data.bio ?? ""); }
  }, [user]);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    if (_sessionFriends === null) setFriendsLoading(true);
    const { data: fships } = await supabase.from("friendships").select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (!fships || fships.length === 0) {
      _sessionFriends = []; _sessionReceived = []; _sessionSent = [];
      setFriends([]); setReceived([]); setSent([]); setFriendsLoading(false); return;
    }
    const otherIds = fships.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    const { data: profiles } = await supabase.from("user_profiles").select("user_id, nickname").in("user_id", otherIds);
    const nickMap = new Map(profiles?.map(p => [p.user_id, p.nickname]) ?? []);
    const rows: FriendRow[] = fships.map(f => {
      const other_id = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      return { friendship: f, nickname: nickMap.get(other_id) ?? null, other_id };
    });
    _sessionFriends = rows.filter(r => r.friendship.status === "accepted");
    _sessionReceived = rows.filter(r => r.friendship.status === "pending" && r.friendship.addressee_id === user.id);
    _sessionSent = rows.filter(r => r.friendship.status === "pending" && r.friendship.requester_id === user.id);
    setFriends(_sessionFriends); setReceived(_sessionReceived); setSent(_sessionSent);
    setFriendsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadProfile();
    void loadFriends();
  }, [user, loadProfile, loadFriends]);

  // ── activity — reload every tab visit, show cached while refreshing
  useEffect(() => {
    if (tab !== "activity" || !user) return;
    async function load() {
      if (_sessionActivityFeed === null) setActivityLoading(true);
      const [{ data: acts }, { data: recs }] = await Promise.all([
        supabase.rpc("get_friends_activity", { p_user_id: user!.id, limit_count: 60 }),
        supabase.from("movie_recommendations").select("*")
          .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
          .order("created_at", { ascending: false }),
      ]);
      _sessionActivityFeed = acts ?? [];
      setActivityFeed(_sessionActivityFeed!);
      if (recs && recs.length > 0) {
        const userIds = [...new Set([...recs.map((r: any) => r.from_user_id as string), ...recs.map((r: any) => r.to_user_id as string)])];
        const { data: np } = await supabase.from("user_profiles").select("user_id, nickname").in("user_id", userIds);
        const nm = new Map(np?.map((p: any) => [p.user_id as string, p.nickname as string | null]) ?? []);
        _sessionRecsList = recs.map((r: any) => ({ ...r, from_nickname: nm.get(r.from_user_id) ?? null, to_nickname: nm.get(r.to_user_id) ?? null }));
        setRecsList(_sessionRecsList);
      } else { _sessionRecsList = []; setRecsList([]); }
      setActivityLoading(false);
    }
    void load();
  }, [tab, user]);

  // ── nickname search debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearchDone(false); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.rpc("search_users_by_nickname", { search_query: q });
      if (!cancelled) { setSearchResults(data ?? []); setSearchDone(true); setSearching(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

  // ── friend code debounce
  useEffect(() => {
    const code = codeInput.trim();
    if (code.length < 3) { setCodePreview(null); setCodeMsg(""); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCodeLooking(true); setCodePreview(null); setCodeMsg("");
      const { data, error } = await supabase.rpc("get_user_by_friend_code", { p_code: code });
      if (!cancelled) {
        setCodeLooking(false);
        if (error || !data || data.length === 0) setCodeMsg("No user found with that code.");
        else setCodePreview(data[0] as FriendCodeResult);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [codeInput]);

  // ── actions
  const saveNickname = async () => {
    if (!user || nickSaving) return;
    const val = nickInput.trim();
    if (!val) { setNickError("Nickname cannot be empty."); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(val)) { setNickError("3–20 chars, letters/numbers/underscores only."); return; }
    setNickSaving(true); setNickError("");
    const { error } = await supabase.from("user_profiles").update({ nickname: val, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (error) setNickError(error.code === "23505" ? "Nickname already taken." : "Could not save.");
    else { setProfile(p => p ? { ...p, nickname: val } : p); setEditingNick(false); }
    setNickSaving(false);
  };

  const saveBio = async () => {
    if (!user || bioSaving) return;
    setBioSaving(true);
    await supabase.from("user_profiles").update({ bio: bioInput.trim() || null, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    setProfile(p => p ? { ...p, bio: bioInput.trim() || null } : p);
    setEditingBio(false); setBioSaving(false);
  };

  const copyFriendCode = async () => {
    if (!profile?.friend_code) return;
    await navigator.clipboard.writeText(profile.friend_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const sendRequest = async (targetId: string) => {
    if (!user) return;
    setActionLoading(targetId);
    await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: targetId });
    setSearchResults(prev => prev.map(r => r.user_id === targetId ? { ...r, friendship_status: "pending" as const, friendship_id: -1 } : r));
    await loadFriends(); setActionLoading(null);
  };

  const acceptRequest = async (id: number) => {
    setActionLoading(id);
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    await loadFriends(); setActionLoading(null);
  };

  const declineRequest = async (id: number) => {
    setActionLoading(id);
    await supabase.from("friendships").delete().eq("id", id);
    await loadFriends(); setActionLoading(null);
  };

  const removeFriend = async (id: number) => {
    setActionLoading(id);
    await supabase.from("friendships").delete().eq("id", id);
    await loadFriends(); setActionLoading(null);
  };

  const cancelRequest = async (id: number) => {
    setActionLoading(id);
    await supabase.from("friendships").delete().eq("id", id);
    await loadFriends();
    setSearchResults(prev => prev.map(r => r.friendship_id === id ? { ...r, friendship_status: null, friendship_id: null } : r));
    setActionLoading(null);
  };

  const sendRequestByCode = async () => {
    if (!codePreview || !user) return;
    setActionLoading("code");
    await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: codePreview.user_id });
    await loadFriends();
    setCodePreview(prev => prev ? { ...prev, friendship_status: "pending" as const, friendship_id: -1 } : prev);
    setActionLoading(null);
  };

  if (authLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#B49A70]" />
    </div>
  );
  if (!user) return null;

  const pendingCount = received.length;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "friends",  label: "Friends",  count: friends.length },
    { key: "requests", label: "Requests", count: pendingCount },
    { key: "activity", label: "Activity" },
    { key: "find",     label: "Find" },
  ];

  return (
    <main className="min-h-screen w-full bg-[#070C13] text-[#E2E5EB]">
      <div className="w-full px-4 pb-20 pt-6 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

          {/* ── Sidebar ── */}
          <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-64">
            <div className="rounded-2xl border border-[#131D2A] bg-[#0C1520] p-4">

              {/* Avatar + nickname row */}
              <div className="flex items-center gap-3">
                <Avatar nickname={profile?.nickname ?? null} size="lg" />
                <div className="min-w-0 flex-1">
                  {editingNick ? (
                    <div className="space-y-1.5">
                      <input autoFocus value={nickInput}
                        onChange={e => { setNickInput(e.target.value); setNickError(""); }}
                        placeholder="your_nickname" maxLength={20}
                        onKeyDown={e => { if (e.key === "Enter") void saveNickname(); if (e.key === "Escape") setEditingNick(false); }}
                        className="w-full rounded-lg border border-[#283A52] bg-[#0F1927] px-2.5 py-1.5 text-sm text-[#E2E5EB] outline-none focus:border-[#B49A70]" />
                      {nickError && <p className="text-[11px] text-red-400">{nickError}</p>}
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => void saveNickname()} disabled={nickSaving}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#74603D] px-2.5 py-1 text-xs font-semibold text-[#FFF0DC] hover:bg-[#866F49] disabled:opacity-50">
                          {nickSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                        </button>
                        <button type="button" onClick={() => { setEditingNick(false); setNickInput(profile?.nickname ?? ""); setNickError(""); }}
                          className="rounded-lg border border-[#283A52] px-2.5 py-1 text-xs text-[#8994A5] hover:text-[#D8DDE6]">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-[#F4EDE2]">
                          {profile?.nickname ?? <span className="text-[#4E5F74]">No nickname</span>}
                        </span>
                        <button type="button" onClick={() => setEditingNick(true)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#3A4A5C] hover:bg-[#111D2B] hover:text-[#8994A5]">
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      {!profile?.nickname && (
                        <p className="text-[11px] text-[#3A4A5C]">Set a nickname</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {!editingNick && (
                <div className="mt-3">
                  {editingBio ? (
                    <div className="space-y-1.5">
                      <textarea autoFocus value={bioInput} onChange={e => setBioInput(e.target.value)}
                        rows={2} maxLength={160} placeholder="A short bio…"
                        className="w-full resize-none rounded-lg border border-[#283A52] bg-[#0F1927] px-2.5 py-1.5 text-xs text-[#E2E5EB] outline-none focus:border-[#B49A70]" />
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => void saveBio()} disabled={bioSaving}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#74603D] px-2.5 py-1 text-xs font-semibold text-[#FFF0DC] hover:bg-[#866F49] disabled:opacity-50">
                          {bioSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                        </button>
                        <button type="button" onClick={() => { setEditingBio(false); setBioInput(profile?.bio ?? ""); }}
                          className="rounded-lg border border-[#283A52] px-2.5 py-1 text-xs text-[#8994A5] hover:text-[#D8DDE6]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setEditingBio(true)} className="w-full text-left text-xs text-[#4E5F74] hover:text-[#8994A5] transition-colors">
                      {profile?.bio ?? <span className="italic text-[#2A3A4C]">Add a bio…</span>}
                    </button>
                  )}
                </div>
              )}

              {/* Friend code */}
              {profile?.friend_code && !editingNick && (
                <button type="button" onClick={() => void copyFriendCode()}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg border border-[#172030] bg-[#070C13] px-3 py-2 transition-colors hover:border-[#283A52]">
                  <Hash className="h-3.5 w-3.5 shrink-0 text-[#3A4A5C]" />
                  <span className="flex-1 font-mono text-xs tracking-wider text-[#5E7088]">{profile.friend_code}</span>
                  {codeCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-[#3A4A5C]" />}
                </button>
              )}

              {/* Quick stats */}
              <div className="mt-4 flex items-center justify-around border-t border-[#0F1927] pt-3">
                {[
                  { label: "Friends", value: friends.length, onClick: () => setTab("friends") },
                  { label: "Requests", value: pendingCount, onClick: () => setTab("requests"), highlight: pendingCount > 0 },
                  { label: "Sent", value: sent.length },
                ].map(s => (
                  <button key={s.label} type="button" onClick={s.onClick}
                    className={cn("flex flex-col items-center gap-0.5", s.onClick ? "cursor-pointer" : "cursor-default")}>
                    <span className={cn("text-base font-bold", s.highlight ? "text-blue-400" : "text-[#D8DDE6]")}>{s.value}</span>
                    <span className={cn("text-[11px]", s.highlight ? "text-blue-400" : "text-[#4E5F74]")}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Main ── */}
          <div className="min-w-0 flex-1">

            {/* Tab bar */}
            <div className="mb-4 flex gap-0.5 rounded-xl border border-[#131D2A] bg-[#0A1018] p-1">
              {TABS.map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all sm:text-sm",
                    tab === t.key ? "bg-[#111D2B] text-[#D8DDE6] shadow-sm" : "text-[#4E5F74] hover:text-[#8994A5]"
                  )}>
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span className={cn(
                      "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                      t.key === "requests" ? "bg-blue-500/20 text-blue-400" : "bg-[#1A2436] text-[#5E7088]"
                    )}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Friends tab ── */}
            {tab === "friends" && (
              friendsLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-[#B49A70]" /></div>
              ) : friends.length === 0 ? (
                <EmptyState icon={<Users className="h-8 w-8" />} title="No friends yet"
                  action={<button type="button" onClick={() => setTab("find")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#74603D]/20 border border-[#74603D]/40 px-3.5 py-2 text-sm text-[#D4BA8D] hover:bg-[#74603D]/30">
                    <UserPlus className="h-4 w-4" /> Find Friends
                  </button>}
                />
              ) : (
                <div className="space-y-1">
                  {friends.map(row => (
                    <PersonRow key={row.friendship.id} nickname={row.nickname} other_id={row.other_id}
                      right={
                        <button type="button" disabled={actionLoading === row.friendship.id}
                          onClick={() => void removeFriend(row.friendship.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#3A4A5C] transition-colors hover:bg-red-950/30 hover:text-red-400 disabled:opacity-40">
                          {actionLoading === row.friendship.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                        </button>
                      }
                    />
                  ))}
                </div>
              )
            )}

            {/* ── Requests tab ── */}
            {tab === "requests" && (
              <div className="space-y-5">
                {received.length > 0 && (
                  <div>
                    <SectionLabel>Received</SectionLabel>
                    <div className="mt-1 space-y-1">
                      {received.map(row => (
                        <PersonRow key={row.friendship.id} nickname={row.nickname} other_id={row.other_id}
                          right={
                            <div className="flex items-center gap-1">
                              <button type="button" disabled={actionLoading === row.friendship.id}
                                onClick={() => void acceptRequest(row.friendship.id)}
                                className="flex h-7 items-center gap-1 rounded-lg border border-[#74603D]/40 bg-[#74603D]/20 px-2.5 text-xs font-medium text-[#D4BA8D] hover:bg-[#74603D]/30 disabled:opacity-40">
                                {actionLoading === row.friendship.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />} Accept
                              </button>
                              <button type="button" disabled={actionLoading === row.friendship.id}
                                onClick={() => void declineRequest(row.friendship.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#3A4A5C] hover:bg-red-950/30 hover:text-red-400 disabled:opacity-40">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
                {sent.length > 0 && (
                  <div>
                    <SectionLabel>Sent</SectionLabel>
                    <div className="mt-1 space-y-1">
                      {sent.map(row => (
                        <PersonRow key={row.friendship.id} nickname={row.nickname} other_id={row.other_id}
                          right={
                            <button type="button" disabled={actionLoading === row.friendship.id}
                              onClick={() => void cancelRequest(row.friendship.id)}
                              className="flex h-7 items-center gap-1 rounded-lg border border-[#172030] px-2.5 text-xs text-[#4E5F74] hover:border-[#283A52] hover:text-[#C8D0DC] disabled:opacity-40">
                              {actionLoading === row.friendship.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Cancel
                            </button>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
                {received.length === 0 && sent.length === 0 && (
                  <EmptyState icon={<UserPlus className="h-8 w-8" />} title="No pending requests" />
                )}
              </div>
            )}

            {/* ── Activity tab ── */}
            {tab === "activity" && (
              <div>
                {/* Sub-tabs */}
                <div className="mb-4 flex gap-0.5 rounded-xl border border-[#0F1927] bg-[#070C13] p-1">
                  {([
                    { key: "feed" as ActivitySubTab, icon: <Activity className="h-3.5 w-3.5" />, label: "Activity" },
                    { key: "recs" as ActivitySubTab, icon: <Film className="h-3.5 w-3.5" />, label: "Recommendations" },
                  ]).map(st => (
                    <button key={st.key} type="button" onClick={() => setActivitySubTab(st.key)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:text-sm",
                        activitySubTab === st.key ? "bg-[#0C1520] text-[#D8DDE6]" : "text-[#4E5F74] hover:text-[#8994A5]"
                      )}>
                      {st.icon}{st.label}
                    </button>
                  ))}
                </div>

                {activityLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-[#B49A70]" /></div>
                ) : activitySubTab === "feed" ? (
                  activityFeed.length === 0 ? (
                    <EmptyState icon={<Activity className="h-8 w-8" />} title="No activity yet"
                      description={friends.length === 0 ? "Add friends to see their activity." : undefined} />
                  ) : (
                    <ActivityTimeline items={activityFeed} />
                  )
                ) : (
                  recsList.length === 0 ? (
                    <EmptyState icon={<Film className="h-8 w-8" />} title="No recommendations yet" />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {recsList.map(rec => <RecommendationCard key={rec.id} rec={rec} userId={user.id} />)}
                    </div>
                  )
                )}
              </div>
            )}

            {/* ── Find tab ── */}
            {tab === "find" && (
              <div className="space-y-4">
                {/* Friend code */}
                <div className="rounded-xl border border-[#131D2A] bg-[#0C1520] p-4">
                  <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#4E5F74]">
                    <Hash className="h-3.5 w-3.5" /> Friend Code
                  </p>
                  <div className="relative">
                    <input type="text" value={codeInput}
                      onChange={e => setCodeInput(e.target.value.toUpperCase())}
                      placeholder="FR-XXXXXX" maxLength={9}
                      className="h-10 w-full rounded-lg border border-[#172030] bg-[#070C13] px-3 pr-9 font-mono text-sm uppercase text-[#E2E5EB] outline-none placeholder:text-[#2A3A4C] focus:border-[#B49A70]/50 transition-colors" />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {codeLooking ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5E7088]" /> : <Hash className="h-3.5 w-3.5 text-[#2A3A4C]" />}
                    </div>
                  </div>
                  {codeMsg && <p className="mt-2 text-xs text-[#5E7088]">{codeMsg}</p>}
                  {codePreview && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#172030] bg-[#070C13] px-3 py-2.5">
                      <Avatar nickname={codePreview.nickname} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#D8DDE6]">{codePreview.nickname ?? "Unknown"}</p>
                        {codePreview.bio && <p className="truncate text-xs text-[#4E5F74]">{codePreview.bio}</p>}
                        <p className="text-[11px] text-[#3A4A5C]">{codePreview.movie_count} movies</p>
                      </div>
                      {codePreview.friendship_status === "accepted" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400"><UserCheck className="h-3.5 w-3.5" /> Friends</span>
                      ) : codePreview.friendship_status === "pending" ? (
                        <span className="text-xs text-[#4E5F74]">Requested</span>
                      ) : (
                        <button type="button" disabled={actionLoading === "code"} onClick={() => void sendRequestByCode()}
                          className="flex h-7 items-center gap-1 rounded-lg border border-[#74603D]/40 bg-[#74603D]/20 px-2.5 text-xs text-[#D4BA8D] hover:bg-[#74603D]/30 disabled:opacity-40">
                          {actionLoading === "code" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />} Add
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-[#0F1927]" />
                  <span className="text-[11px] text-[#2A3A4C]">or search by nickname</span>
                  <div className="flex-1 border-t border-[#0F1927]" />
                </div>

                {/* Nickname search */}
                <div>
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3A4A5C]" />
                    <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by nickname…"
                      className="h-10 w-full rounded-lg border border-[#131D2A] bg-[#0C1520] pl-9 pr-4 text-sm text-[#E2E5EB] outline-none placeholder:text-[#2A3A4C] focus:border-[#B49A70]/50 transition-colors" />
                    {searching && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#5E7088]" />}
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map(r => (
                        <PersonRow key={r.user_id} nickname={r.nickname} other_id={r.user_id}
                          sub={`${r.movie_count} movies`}
                          right={
                            r.friendship_status === "accepted" ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400"><UserCheck className="h-3 w-3" /> Friends</span>
                            ) : r.friendship_status === "pending" ? (
                              <button type="button" disabled={actionLoading === r.user_id}
                                onClick={() => { const id = r.friendship_id; if (id && id > 0) void cancelRequest(id); }}
                                className="flex h-7 items-center gap-1 rounded-lg border border-[#172030] px-2.5 text-xs text-[#4E5F74] hover:border-[#283A52] hover:text-[#C8D0DC] disabled:opacity-40">
                                {actionLoading === r.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Sent
                              </button>
                            ) : (
                              <button type="button" disabled={actionLoading === r.user_id}
                                onClick={() => void sendRequest(r.user_id)}
                                className="flex h-7 items-center gap-1 rounded-lg border border-[#74603D]/40 bg-[#74603D]/20 px-2.5 text-xs text-[#D4BA8D] hover:bg-[#74603D]/30 disabled:opacity-40">
                                {actionLoading === r.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />} Add
                              </button>
                            )
                          }
                        />
                      ))}
                    </div>
                  ) : searchDone ? (
                    <EmptyState icon={<Search className="h-8 w-8" />} title={`No results for "${searchQuery}"`} />
                  ) : (
                    <EmptyState icon={<Search className="h-8 w-8" />} title="Search for friends" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── shared components ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3A4A5C]">{children}</p>;
}

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <div className="mb-1 text-[#1E2D3D]">{icon}</div>
      <p className="text-sm font-medium text-[#5E7088]">{title}</p>
      {description && <p className="text-xs text-[#3A4A5C]">{description}</p>}
      {action}
    </div>
  );
}

function PersonRow({ nickname, other_id, sub, right }: {
  nickname: string | null; other_id: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#0C1520]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1E2D3D] bg-gradient-to-br from-[#1A2436] to-[#0F1927] text-xs font-bold text-[#B49A70]">
        {nickname ? nickname[0].toUpperCase() : "?"}
      </div>
      <div className="min-w-0 flex-1">
        {nickname ? (
          <Link href={`/profile/${encodeURIComponent(nickname)}`}
            className="block truncate text-sm font-medium text-[#D8DDE6] hover:text-[#B49A70] transition-colors">
            {nickname}
          </Link>
        ) : (
          <span className="text-sm text-[#3A4A5C]">Unknown user</span>
        )}
        {sub && <p className="text-[11px] text-[#3A4A5C]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// ─── activity timeline ────────────────────────────────────────────────────────

function ActivityTimeline({ items }: { items: FriendActivity[] }) {
  const groups = groupByDate(items);
  return (
    <div className="space-y-8">
      {groups.map(({ label, items: groupItems }) => (
        <div key={label}>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#172030]" />
            <span className="rounded-full border border-[#172030] bg-[#070C13] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#3A4A5C]">
              {label}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#172030]" />
          </div>

          <div className="relative ml-2 pl-7">
            <div className="absolute left-0 top-3 bottom-0 w-px bg-gradient-to-b from-[#1E2D3D] to-transparent" />
            <div className="space-y-2">
              {groupItems.map(item => {
                const type = item.activity_type as ActivityType;
                const dot =
                  type === "added_watched"  ? { ring: "border-emerald-500/40 bg-[#071A10]", icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" /> } :
                  type === "added_favorite" ? { ring: "border-pink-500/30 bg-[#1A0810]",    icon: <Heart        className="h-3 w-3 text-pink-400" /> } :
                                              { ring: "border-[#74603D]/40 bg-[#140E04]",   icon: <Bookmark     className="h-3 w-3 text-[#B49A70]" /> };
                const verb = type === "added_watched" ? "watched" : type === "added_favorite" ? "favorited" : "saved";
                const href = item.movie_imdb_id ? `https://www.imdb.com/title/${item.movie_imdb_id}/` : undefined;

                return (
                  <div key={item.id} className="relative flex items-start gap-3">
                    <div className={cn("absolute -left-[26px] top-[13px] flex h-6 w-6 items-center justify-center rounded-full border", dot.ring)}>
                      {dot.icon}
                    </div>
                    <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#0F1927] bg-[#0A1018] px-3 py-2.5 transition-colors hover:border-[#1A2A3A] hover:bg-[#0C1520]">
                      {/* Poster */}
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md border border-[#172030] bg-[#070C13]">
                        {item.movie_poster && item.movie_poster !== "N/A" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.movie_poster} alt={item.movie_title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Film className="h-3.5 w-3.5 text-[#1E2D3D]" />
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#5E7088]">
                          <Link href={`/profile/${encodeURIComponent(item.friend_nickname ?? "")}`}
                            className="font-semibold text-[#C8D0DC] hover:text-[#B49A70] transition-colors">
                            {item.friend_nickname ?? "Someone"}
                          </Link>
                          {" "}{verb}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-medium text-[#E2E5EB]">
                          {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#B49A70] transition-colors">{item.movie_title}</a> : item.movie_title}
                          {item.movie_year && <span className="ml-1 text-xs font-normal text-[#3A4A5C]">{item.movie_year}</span>}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-[#2A3A4C]">{relativeTime(item.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── recommendations ──────────────────────────────────────────────────────────

function RecommendationCard({ rec, userId }: { rec: MovieRecommendation; userId: string }) {
  const mode = rec.to_user_id === userId ? "received" : "sent";
  const otherNick = mode === "received" ? rec.from_nickname : rec.to_nickname;
  const imdbHref = rec.movie_imdb_id ? `https://www.imdb.com/title/${rec.movie_imdb_id}/` : undefined;
  const isUnread = mode === "received" && !rec.is_read;

  return (
    <div className={cn(
      "rounded-xl border bg-[#0A1018] p-3.5 transition-colors",
      isUnread ? "border-[#74603D]/30" : "border-[#0F1927]"
    )}>
      <div className="flex gap-3">
        <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg border border-[#172030] bg-[#070C13]">
          {rec.movie_poster && rec.movie_poster !== "N/A" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rec.movie_poster} alt={rec.movie_title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Film className="h-4 w-4 text-[#1E2D3D]" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {imdbHref ? (
                <a href={imdbHref} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-[#E2E5EB] hover:text-[#B49A70] transition-colors">
                  {rec.movie_title}
                </a>
              ) : <span className="text-sm font-semibold text-[#E2E5EB]">{rec.movie_title}</span>}
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-[#3A4A5C]">
                {rec.movie_year && <span>{rec.movie_year}</span>}
                {rec.movie_genre && <span>{rec.movie_genre.split(",")[0].trim()}</span>}
                {rec.movie_imdb_rating && <span>★ {rec.movie_imdb_rating}</span>}
              </div>
            </div>
            <span className="shrink-0 text-[11px] text-[#2A3A4C]">{relativeTime(rec.created_at)}</span>
          </div>
          <p className="mt-1 text-xs text-[#4E5F74]">
            {mode === "received" ? "From " : "To "}
            <Link href={`/profile/${encodeURIComponent(otherNick ?? "")}`}
              className="font-medium text-[#5E7088] hover:text-[#B49A70] transition-colors">
              {otherNick ?? "Unknown"}
            </Link>
          </p>
          {rec.message && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#070C13] px-2.5 py-2">
              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-[#2A3A4C]" />
              <p className="text-xs text-[#5E7088]">{rec.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
