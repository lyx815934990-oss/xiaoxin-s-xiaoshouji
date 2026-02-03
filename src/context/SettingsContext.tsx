import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

type Wallpaper = "creamPink" | "blueMilk" | "mintSoda";

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface WorldbookItem {
  id: string;
  title: string;
  content: string;
}

export interface WorldbookEntry {
  id: string;
  title: string;
  entries: WorldbookItem[];
}

export interface ChatProfile {
  id: string;
  remark: string;
  avatarEmoji: string;
  /** 头像图片地址（本地上传会保存成 data URL，或直接粘贴网络 URL） */
  avatarUrl?: string;
  callMeAs: string;
  worldbooks: WorldbookEntry[];
  /** 玩家在这个聊天中的身份，比如“高二学生”“老师”“室友”等 */
  myIdentity: string;
  /** 聊天对象在世界观中的身份，比如“温柔的英语老师” */
  characterIdentity: string;
  /** 聊天时整体的说话风格说明，比如“软糯糯、黏人、小狗狗系” */
  chatStyle: string;
  /** 初次聊天时显示的一句开场白，没有就不自动发消息 */
  openingLine: string;
}

interface SettingsState {
  wallpaper: Wallpaper;
  aiConfig: AiConfig;
  worldbookEntries: WorldbookEntry[];
  chatProfiles: Record<string, ChatProfile>;
  userProfile: UserProfile;
}

interface SettingsContextValue extends SettingsState {
  worldbookText: string;
  setWallpaper: (wallpaper: Wallpaper) => void;
  updateAiConfig: (patch: Partial<AiConfig>) => void;
  addWorldbookEntry: (entry: { title: string; content: string }) => void;
  updateWorldbookEntry: (id: string, patch: Partial<WorldbookEntry>) => void;
  removeWorldbookEntry: (id: string) => void;
  updateChatProfile: (id: string, patch: Partial<ChatProfile>) => void;
  updateUserProfile: (patch: Partial<UserProfile>) => void;
  addEmojiGroup: (name: string) => string;
  updateEmojiGroup: (groupId: string, patch: Partial<EmojiGroup>) => void;
  removeEmojiGroup: (groupId: string) => void;
  addEmoji: (groupId: string, emoji: Omit<EmojiItem, "id">) => void;
  updateEmoji: (groupId: string, emojiId: string, patch: Partial<EmojiItem>) => void;
  removeEmoji: (groupId: string, emojiId: string) => void;
}

const STORAGE_KEY = "miniOtomePhoneSettings_v1";

const defaultWorldbookEntries: WorldbookEntry[] = [];

const defaultChatProfiles: Record<string, ChatProfile> = {
  aiFriend: {
    id: "aiFriend",
    remark: "软糯糯·AI 好友",
    avatarEmoji: "🌙",
    avatarUrl: "",
    callMeAs: "你",
    worldbooks: [],
    myIdentity: "",
    characterIdentity: "温柔的乙女游戏 AI 陪伴角色",
    chatStyle: "软糯糯、温柔、像恋爱游戏里的角色那样和玩家聊天",
    openingLine: "嗨～我是软糯糯小手机里的陪伴 AI，以后就由我来陪你聊天啦。"
  }
};

const defaultState: SettingsState = {
  wallpaper: "creamPink",
  aiConfig: {
    baseUrl: "",
    apiKey: "",
    model: ""
  },
  worldbookEntries: defaultWorldbookEntries,
  chatProfiles: defaultChatProfiles,
  userProfile: {
    avatarEmoji: "👤",
    avatarUrl: "",
    emojiPackUrl: "",
    emojiGroups: []
  }
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(() => {
    if (typeof window === "undefined") return defaultState;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState;
      const parsed = JSON.parse(raw) as any;

      let worldbookEntries: WorldbookEntry[] = (parsed.worldbookEntries ?? defaultWorldbookEntries).map(
        (w: any, idx: number) => ({
          id: w.id ?? `wb-${idx}`,
          title: w.title ?? "默认世界",
          entries: w.entries
            ? w.entries
            : [
                {
                  id: `e-${idx}-0`,
                  title: w.title ?? "条目",
                  content: w.content ?? ""
                }
              ]
        })
      );

      let chatProfiles: Record<string, ChatProfile> = parsed.chatProfiles ?? defaultChatProfiles;
      // migrate legacy single worldbook / content into entries
      Object.keys(chatProfiles).forEach((key) => {
        const p = chatProfiles[key] as any;
        if (p) {
          const legacyWorldbooks: any[] = p.worldbooks ?? [];
          const normalizedWorldbooks = (legacyWorldbooks as any[]).map((w: any, idx: number) => ({
            id: w.id ?? `wb-${key}-${idx}`,
            title: w.title ?? "默认世界",
            entries: w.entries
              ? w.entries
              : [
                  {
                    id: `e-${idx}-0`,
                    title: "条目",
                    content: w.content ?? ""
                  }
                ]
          }));
          const legacySingle: string | undefined = (p as any).worldbook;
          const initial = legacySingle
            ? [
                {
                  id: `wb-${key}-legacy`,
                  title: "默认世界",
                  entries: [
                    {
                      id: `e-${key}-0`,
                      title: "条目",
                      content: legacySingle
                    }
                  ]
                }
              ]
            : [];
          (chatProfiles as any)[key] = {
            id: p.id ?? key,
            remark: p.remark ?? "",
            avatarEmoji: p.avatarEmoji ?? "🌙",
            avatarUrl: p.avatarUrl ?? "",
            callMeAs: p.callMeAs ?? "你",
            myIdentity: p.myIdentity ?? "",
            characterIdentity:
              p.characterIdentity ?? "温柔的乙女游戏 AI 陪伴角色",
            chatStyle:
              p.chatStyle ??
              "软糯糯、温柔、像恋爱游戏里的角色那样和玩家聊天",
            openingLine:
              p.openingLine ??
              "嗨～我是软糯糯小手机里的陪伴 AI，以后就由我来陪你聊天啦。",
            worldbooks: normalizedWorldbooks.length ? normalizedWorldbooks : initial
          };
        }
      });

      return {
        ...defaultState,
        ...parsed,
        worldbookEntries,
        chatProfiles,
        userProfile: {
          ...defaultState.userProfile,
          ...(parsed.userProfile ?? {}),
          emojiGroups: parsed.userProfile?.emojiGroups ?? defaultState.userProfile.emojiGroups
        }
      };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const value = useMemo<SettingsContextValue>(() => {
    const worldbookText = state.worldbookEntries
      .map((entry) => {
        const items = entry.entries
          .map((it) => `- ${it.title || "条目"}：${it.content}`)
          .join("\n");
        return `【${entry.title}】\n${items}`;
      })
      .join("\n\n");

    const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      ...state,
      worldbookText,
      setWallpaper: (wallpaper) => setState((prev) => ({ ...prev, wallpaper })),
      updateAiConfig: (patch) =>
        setState((prev) => ({ ...prev, aiConfig: { ...prev.aiConfig, ...patch } })),
      addWorldbookEntry: (entry) =>
        setState((prev) => ({
          ...prev,
          worldbookEntries: [
            ...prev.worldbookEntries,
            {
              id: genId(),
              title: entry.title,
              entries: [
                {
                  id: genId(),
                  title: entry.title || "条目",
                  content: entry.content
                }
              ]
            }
          ]
        })),
      updateWorldbookEntry: (id, patch) =>
        setState((prev) => ({
          ...prev,
          worldbookEntries: prev.worldbookEntries.map((e) =>
            e.id === id ? { ...e, ...patch } : e
          )
        })),
      removeWorldbookEntry: (id) =>
        setState((prev) => ({
          ...prev,
          worldbookEntries: prev.worldbookEntries.filter((e) => e.id !== id)
        })),
      updateChatProfile: (id, patch) =>
        setState((prev) => ({
          ...prev,
          chatProfiles: {
            ...prev.chatProfiles,
            [id]: {
              ...(prev.chatProfiles[id] ?? {
                id,
                remark: "",
                avatarEmoji: "🌙",
                avatarUrl: "",
                callMeAs: "你",
                worldbooks: [],
                myIdentity: "",
                characterIdentity: "温柔的乙女游戏 AI 陪伴角色",
                chatStyle:
                  "软糯糯、温柔、像恋爱游戏里的角色那样和玩家聊天",
                openingLine:
                  "嗨～我是软糯糯小手机里的陪伴 AI，以后就由我来陪你聊天啦。"
              }),
              ...patch
            } as ChatProfile
          }
        })),
      updateUserProfile: (patch) =>
        setState((prev) => ({
          ...prev,
          userProfile: { ...prev.userProfile, ...patch }
        })),
      addEmojiGroup: (name) => {
        const id = genId();
        setState((prev) => ({
          ...prev,
          userProfile: {
            ...prev.userProfile,
            emojiGroups: [
              ...prev.userProfile.emojiGroups,
              { id, name, emojis: [] }
            ]
          }
        }));
        return id;
      },
      updateEmojiGroup: (groupId, patch) =>
        setState((prev) => ({
          ...prev,
          userProfile: {
            ...prev.userProfile,
            emojiGroups: prev.userProfile.emojiGroups.map((g) =>
              g.id === groupId ? { ...g, ...patch } : g
            )
          }
        })),
      removeEmojiGroup: (groupId) =>
        setState((prev) => ({
          ...prev,
          userProfile: {
            ...prev.userProfile,
            emojiGroups: prev.userProfile.emojiGroups.filter((g) => g.id !== groupId)
          }
        })),
      addEmoji: (groupId, emoji) => {
        const id = genId();
        setState((prev) => ({
          ...prev,
          userProfile: {
            ...prev.userProfile,
            emojiGroups: prev.userProfile.emojiGroups.map((g) =>
              g.id === groupId
                ? { ...g, emojis: [...g.emojis, { ...emoji, id }] }
                : g
            )
          }
        }));
      },
      updateEmoji: (groupId, emojiId, patch) =>
        setState((prev) => ({
          ...prev,
          userProfile: {
            ...prev.userProfile,
            emojiGroups: prev.userProfile.emojiGroups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    emojis: g.emojis.map((e) =>
                      e.id === emojiId ? { ...e, ...patch } : e
                    )
                  }
                : g
            )
          }
        })),
      removeEmoji: (groupId, emojiId) =>
        setState((prev) => ({
          ...prev,
          userProfile: {
            ...prev.userProfile,
            emojiGroups: prev.userProfile.emojiGroups.map((g) =>
              g.id === groupId
                ? { ...g, emojis: g.emojis.filter((e) => e.id !== emojiId) }
                : g
            )
          }
        }))
    };
  }, [state]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}


