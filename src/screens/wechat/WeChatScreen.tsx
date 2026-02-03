import { useEffect, useRef, useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { sendChatRequest, type ChatMessage } from "../../services/aiClient";

type WechatTab = "chats" | "moments";

interface UiMessage {
  id: number;
  from: "me" | "other";
  text: string;
  /** 人类可读时间，比如 13:05，用来展示 */
  timeLabel?: string;
  /** 精确时间戳，用来计算与上一条消息的时间间隔 */
  timestamp?: number;
}

const CHAT_STORAGE_PREFIX = "miniOtomeChat_";
const UNREAD_COUNT_PREFIX = "miniOtomeUnread_";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatChatTimeLabel(timestamp: number, now: Date): string {
  const msgDate = new Date(timestamp);
  const msgYear = msgDate.getFullYear();
  const nowYear = now.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, "0");
  const hm = `${pad(msgDate.getHours())}:${pad(msgDate.getMinutes())}`;

  // 年份不同：始终显示 年月日 + 时分
  if (msgYear < nowYear) {
    return `${msgYear}年${pad(msgDate.getMonth() + 1)}月${pad(
      msgDate.getDate()
    )}日 ${hm}`;
  }

  const msgMidnight = new Date(
    msgDate.getFullYear(),
    msgDate.getMonth(),
    msgDate.getDate()
  ).getTime();
  const nowMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const dayDiff = Math.floor((nowMidnight - msgMidnight) / ONE_DAY_MS);

  // 超过 7 天：显示 月日 + 时分
  if (dayDiff > 7) {
    return `${pad(msgDate.getMonth() + 1)}月${pad(msgDate.getDate())}日 ${hm}`;
  }

  if (dayDiff === 0) {
    // 今天：只显示时分
    return hm;
  }

  if (dayDiff === 1) {
    // 昨天
    return `昨天 ${hm}`;
  }

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = `星期${weekdays[msgDate.getDay()]}`;

  if (dayDiff === 2) {
    // 前天 + 星期几
    return `前天 ${weekday} ${hm}`;
  }

  // 3〜7 天内：显示 星期几 + 时分
  return `${weekday} ${hm}`;
}

export function WeChatScreen() {
  const { aiConfig, chatProfiles, updateChatProfile } = useSettings();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [tab, setTab] = useState<WechatTab>("chats");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"main" | "profile">("main");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  // 回车可以连续发多条消息：这些消息只入队，不触发 AI；点击按钮才触发回复
  const [pendingUserTurns, setPendingUserTurns] = useState<UiMessage[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceText, setVoiceText] = useState("");
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const createUserMessage = (text: string): UiMessage => {
    const now = new Date();
    const timestamp = now.getTime();
    const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const nextId = messages.length ? messages[messages.length - 1].id + 1 : 1;
    return { id: nextId, from: "me", text, timeLabel, timestamp };
  };

  const pushUserMessage = (msg: UiMessage) => {
    setMessages((prev) => [...prev, msg]);
    setPendingUserTurns((p) => [...p, msg]);
  };

  const enqueueUserMessage = (content: string) => {
    const text = content.trim();
    if (!text) return;

    pushUserMessage(createUserMessage(text));
  };

  const triggerReply = async (extraUserInput?: string) => {
    if (loading) return;

    const content = (extraUserInput ?? input).trim();
    let extraMsg: UiMessage | null = null;
    if (content) {
      extraMsg = createUserMessage(content);
      pushUserMessage(extraMsg);
      setInput("");
    }

    const willSendCount = pendingUserTurns.length + (extraMsg ? 1 : 0);
    if (willSendCount === 0) return;

    setError(null);
    setLoading(true);

    // 保存当前聊天 ID，即使后续 activeChatId 变化，也要继续生成到正确的聊天
    const chatId = activeChatId ?? "aiFriend";
    const targetChatId = chatId;
    const profile = chatProfiles[chatId] ?? {
      id: chatId,
      remark: "软糯糯·AI 好友",
      avatarEmoji: "🌙",
      callMeAs: "你",
      worldbooks: [],
      myIdentity: "",
      characterIdentity: "温柔的乙女游戏 AI 陪伴角色",
      chatStyle: "软糯糯、温柔、像恋爱游戏里的角色那样和玩家聊天"
    };

    const baseHistory: Array<ChatMessage | null> = [
      {
        role: "system",
        content:
          "你是一位性格温柔、说话软糯糯的乙女游戏 AI 角色，用轻松治愈的语气和玩家聊天。"
      },
      profile.worldbooks.length
        ? {
          role: "system",
          content:
            "你必须严格遵守下面给出的世界书设定，这些信息高于普通对话内容，不能与之矛盾。\n" +
            profile.worldbooks
              .map((w) => {
                const items = (w.entries ?? []).map(
                  (en) => `- ${en.title || "条目"}：${en.content}`
                );
                return `【${w.title || "未命名世界书"}】\n${items.join("\n")}`;
              })
              .join("\n\n")
        }
        : null,
      profile.myIdentity
        ? {
          role: "system",
          content: `玩家在这个世界中的身份：${profile.myIdentity}`
        }
        : null,
      profile.callMeAs
        ? {
          role: "system",
          content: `你在对话中称呼玩家为「${profile.callMeAs}」`
        }
        : null,
      profile.characterIdentity || profile.chatStyle
        ? {
          role: "system",
          content:
            `你的角色身份：${profile.characterIdentity || "未设置"}` +
            (profile.chatStyle
              ? `。你的说话风格：${profile.chatStyle}`
              : "")
        }
        : null,
    ];
    // 从 localStorage 读取完整的聊天历史，而不是只使用当前 messages 状态
    // 这样即使离开了聊天页，也能获取到完整的对话上下文
    const storedMessages = (() => {
      try {
        const stored = window.localStorage.getItem(
          `${CHAT_STORAGE_PREFIX}${targetChatId}`
        );
        if (stored) {
          const parsed = JSON.parse(stored) as UiMessage[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
      return messages;
    })();

    const messagesForApi = extraMsg ? [...storedMessages, extraMsg] : storedMessages;
    const chatHistory: ChatMessage[] = [
      ...baseHistory.filter((m): m is ChatMessage => m !== null),
      ...messagesForApi.map<ChatMessage>((m) => ({
        role: m.from === "me" ? "user" : "assistant",
        content: m.text
      }))
    ];

    try {
      const reply = await sendChatRequest(aiConfig, chatHistory);
      const segments = reply
        .split(/\n{2,}/)
        .flatMap((block) => block.split(/\n/))
        .map((s) => s.trim())
        .filter(Boolean);

      const showSegment = (index: number) => {
        if (index >= segments.length) {
          setLoading(false);
          setPendingUserTurns([]);
          // 生成完成后，确保消息保存到正确的聊天记录
          try {
            const currentMessages = messages;
            const allMessages = [
              ...currentMessages,
              ...segments.map((text, idx) => {
                const now = new Date();
                const ts = now.getTime();
                const label = `${now.getHours().toString().padStart(2, "0")}:${now
                  .getMinutes()
                  .toString()
                  .padStart(2, "0")}`;
                return {
                  id: (currentMessages.length || 0) + idx + 1,
                  from: "other" as const,
                  text,
                  timeLabel: label,
                  timestamp: ts
                };
              })
            ];
            window.localStorage.setItem(
              `${CHAT_STORAGE_PREFIX}${targetChatId}`,
              JSON.stringify(allMessages)
            );
          } catch {
            // ignore
          }
          return;
        }

        const text = segments[index];
        const now = new Date();
        const ts = now.getTime();
        const label = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        // 更新消息列表（只在当前聊天页时更新 UI）
        const currentChatId = activeChatId ?? "aiFriend";
        if (currentChatId === targetChatId) {
          setMessages((prev) => {
            const nextId = prev.length ? prev[prev.length - 1].id + 1 : 1;
            return [
              ...prev,
              {
                id: nextId,
                from: "other",
                text,
                timeLabel: label,
                timestamp: ts
              }
            ];
          });
        }

        // 无论是否在当前聊天页，都要保存到 localStorage 并更新未读数
        try {
          const stored = window.localStorage.getItem(
            `${CHAT_STORAGE_PREFIX}${targetChatId}`
          );
          const existing = stored ? (JSON.parse(stored) as UiMessage[]) : [];
          const newMessage: UiMessage = {
            id: existing.length ? existing[existing.length - 1].id + 1 : 1,
            from: "other",
            text,
            timeLabel: label,
            timestamp: ts
          };
          window.localStorage.setItem(
            `${CHAT_STORAGE_PREFIX}${targetChatId}`,
            JSON.stringify([...existing, newMessage])
          );
        } catch {
          // ignore
        }

        // 如果当前不在该聊天页，增加未读数
        if (currentChatId !== targetChatId) {
          setUnreadCounts((prev) => {
            const newCount = (prev[targetChatId] || 0) + 1;
            try {
              window.localStorage.setItem(
                `${UNREAD_COUNT_PREFIX}${targetChatId}`,
                newCount.toString()
              );
            } catch {
              // ignore
            }
            return { ...prev, [targetChatId]: newCount };
          });
        }

        const len = text.length;
        const delay = Math.min(6000, Math.max(400, 400 + len * 35));

        window.setTimeout(() => showSegment(index + 1), delay);
      };

      if (segments.length === 0) {
        setLoading(false);
        setPendingUserTurns([]);
        return;
      }

      showSegment(0);
    } catch (e: any) {
      setError(e.message ?? "发送失败，请检查网络或 API 配置。");
      setLoading(false);
    }
  };

  // 加载未读消息数
  useEffect(() => {
    try {
      const counts: Record<string, number> = {};
      Object.keys(chatProfiles).forEach((chatId) => {
        const stored = window.localStorage.getItem(`${UNREAD_COUNT_PREFIX}${chatId}`);
        if (stored) {
          const count = parseInt(stored, 10);
          if (!isNaN(count) && count > 0) {
            counts[chatId] = count;
          }
        }
      });
      // 也加载默认的 aiFriend
      const aiFriendUnread = window.localStorage.getItem(`${UNREAD_COUNT_PREFIX}aiFriend`);
      if (aiFriendUnread) {
        const count = parseInt(aiFriendUnread, 10);
        if (!isNaN(count) && count > 0) {
          counts["aiFriend"] = count;
        }
      }
      setUnreadCounts(counts);
    } catch {
      // ignore
    }
  }, [chatProfiles]);

  // 清除当前聊天页的未读数
  useEffect(() => {
    if (!activeChatId) return;
    try {
      window.localStorage.setItem(`${UNREAD_COUNT_PREFIX}${activeChatId}`, "0");
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[activeChatId];
        return next;
      });
    } catch {
      // ignore
    }
  }, [activeChatId]);

  // 加载当前会话的历史消息，并在 activeChatId 变化时重新加载
  useEffect(() => {
    if (!activeChatId) return;

    const loadMessages = () => {
      try {
        const raw = window.localStorage.getItem(
          `${CHAT_STORAGE_PREFIX}${activeChatId}`
        );
        if (raw) {
          const parsed = JSON.parse(raw) as UiMessage[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // 兼容旧数据：如果没有 timestamp，就补上一个大致的递增时间戳
            let base = Date.now() - parsed.length * 60000;
            const withTime = parsed.map((m) => {
              if (m.timestamp) return m;
              base += 60000;
              return {
                ...m,
                timestamp: base,
                timeLabel:
                  m.timeLabel ||
                  new Date(base)
                    .toTimeString()
                    .slice(0, 5)
              };
            });
            setMessages(withTime);
            return;
          }
        }
        // 没有历史记录，根据开场白生成或保持为空
        const profile = chatProfiles[activeChatId];
        const line = profile?.openingLine?.trim();
        if (line) {
          const now = Date.now();
          setMessages([
            {
              id: 1,
              from: "other",
              text: line,
              timestamp: now,
              timeLabel: new Date(now).toTimeString().slice(0, 5)
            }
          ]);
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    };

    loadMessages();

    // 监听 localStorage 变化，如果当前聊天页的消息更新了，则重新加载
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${CHAT_STORAGE_PREFIX}${activeChatId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as UiMessage[];
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // 定期检查 localStorage 是否有更新（因为同标签页的 storage 事件不会触发）
    const intervalId = setInterval(() => {
      loadMessages();
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [activeChatId, chatProfiles]);

  // 持久化当前会话的消息
  useEffect(() => {
    if (!activeChatId) return;
    try {
      window.localStorage.setItem(
        `${CHAT_STORAGE_PREFIX}${activeChatId}`,
        JSON.stringify(messages)
      );
    } catch {
      // ignore
    }
  }, [messages, activeChatId]);

  // 消息更新后自动滚动到底部，保证最新消息完全可见
  useEffect(() => {
    if (!chatEndRef.current) return;
    chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  // 点击外部关闭功能菜单
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".chat-menu-btn") && !target.closest(".chat-menu-popup")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  // 打开语音消息弹窗
  const openVoiceModal = () => {
    setVoiceModalOpen(true);
    setRecordingTime(0);
    setVoiceText("");
  };

  // 取消语音消息
  const cancelVoiceMessage = () => {
    setVoiceModalOpen(false);
    setRecordingTime(0);
    setVoiceText("");
  };

  // 发送语音消息
  const sendVoiceMessage = () => {
    if (voiceText.trim()) {
      const timeStr = recordingTime > 0
        ? `${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, "0")}`
        : "0:00";
      const message = `[语音消息 ${timeStr}] ${voiceText}`;
      enqueueUserMessage(message);
    }
    setVoiceModalOpen(false);
    setRecordingTime(0);
    setVoiceText("");
  };

  // 进入某个聊天页时，初次默认滚动到底部（不使用动画，避免看到先到顶部再滑动的过程）
  useEffect(() => {
    if (!activeChatId) return;
    // 等一帧确保消息列表渲染完成
    const id = window.setTimeout(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeChatId, mode]);

  const renderBody = () => {
    if (tab === "moments") {
      return (
        <div className="wechat-list">
          <div className="soft-card">
            <div className="soft-card-header">
              <div className="avatar-circle" />
              <div className="soft-card-header-text">
                <div className="soft-card-title">软糯糯·AI 好友</div>
                <div className="soft-card-subtitle">今天也在远程为你加油</div>
              </div>
            </div>
            <p className="wechat-moment-text">
              「如果不开心的话，就把手机屏幕亮一点点，我会假装那是你专门点亮给我的小星星。」
            </p>
          </div>
          <div className="soft-card">
            <div className="soft-card-header-text">
              <div className="soft-card-title">你的朋友圈</div>
              <div className="soft-card-subtitle">以后这里会显示你和 AI 共同写的心情瞬间</div>
            </div>
          </div>
        </div>
      );
    }

    if (!activeChatId) {
      const friendId = "aiFriend";
      const baseFriendProfile = {
        id: friendId,
        remark: "软糯糯·AI 好友",
        avatarEmoji: "🌙",
        avatarUrl: "",
        callMeAs: "你",
        worldbooks: [],
        myIdentity: "",
        characterIdentity: "温柔的乙女游戏 AI 陪伴角色",
        chatStyle: "软糯糯、温柔、像恋爱游戏里的角色那样和玩家聊天"
      };
      const friendProfile = chatProfiles[friendId] ?? baseFriendProfile;

      const getPreview = (
        chatId: string,
        fallback: string
      ): { text: string; time: string } => {
        let text = fallback;
        let time = "";
        try {
          const raw = window.localStorage.getItem(
            `${CHAT_STORAGE_PREFIX}${chatId}`
          );
          if (raw) {
            const parsed = JSON.parse(raw) as UiMessage[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              const last = parsed[parsed.length - 1];
              text = last.text || text;
              if (last.timestamp) {
                time = formatChatTimeLabel(last.timestamp, new Date());
              } else if (last.timeLabel) {
                time = last.timeLabel;
              }
            }
          }
        } catch {
          // ignore
        }
        return { text, time };
      };

      const allProfiles = Object.entries(chatProfiles)
        .filter(([id]) => id !== friendId)
        .map(([, p]) => p);

      return (
        <div className="wechat-list">
          <div className="wechat-list-item">
            <div className="wechat-list-main">
              <div className="wechat-list-title">联系人</div>
              <div className="wechat-list-sub">
                为这个小手机创建新的软糯糯联系人
              </div>
            </div>
            <button
              type="button"
              className="wechat-add-btn"
              onClick={() => setCreatingOpen(true)}
            >
              ＋ 新建联系人
            </button>
          </div>

          {/* 固定的软糯糯 AI 好友 */}
          {(() => {
            const { text, time } = getPreview(
              friendId,
              "点进来和 Ta 单独聊天"
            );
            return (
              <div
                className="wechat-list-item"
                onClick={() => setActiveChatId(friendId)}
              >
                <div className="avatar-circle-wrapper">
                  <div className="avatar-circle">
                    {friendProfile.avatarUrl ? (
                      <img
                        src={friendProfile.avatarUrl}
                        alt="头像"
                        className="avatar-image"
                      />
                    ) : (
                      <span aria-hidden="true">
                        {friendProfile.avatarEmoji ?? "🌙"}
                      </span>
                    )}
                  </div>
                  {(unreadCounts[friendId] ?? 0) > 0 && (
                    <div className="wechat-unread-badge wechat-unread-badge-avatar">
                      {(unreadCounts[friendId] ?? 0) > 99 ? "99+" : unreadCounts[friendId]}
                    </div>
                  )}
                </div>
                <div className="wechat-list-main">
                  <div className="wechat-list-title">
                    {friendProfile.remark || "软糯糯·AI 好友"}
                  </div>
                  <div className="wechat-list-sub">{text}</div>
                </div>
                <div className="wechat-list-time">{time || "现在"}</div>
              </div>
            );
          })()}

          {/* 玩家新建的联系人列表 */}
          {allProfiles.map((p) => {
            const { text, time } = getPreview(
              p.id,
              "点进来和 Ta 单独聊天"
            );
            return (
              <div
                key={p.id}
                className="wechat-list-item"
                onClick={() => setActiveChatId(p.id)}
              >
                <div className="avatar-circle-wrapper">
                  <div className="avatar-circle">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt="头像"
                        className="avatar-image"
                      />
                    ) : (
                      <span aria-hidden="true">
                        {p.avatarEmoji ?? "🌙"}
                      </span>
                    )}
                  </div>
                  {(unreadCounts[p.id] ?? 0) > 0 && (
                    <div className="wechat-unread-badge wechat-unread-badge-avatar">
                      {(unreadCounts[p.id] ?? 0) > 99 ? "99+" : unreadCounts[p.id]}
                    </div>
                  )}
                </div>
                <div className="wechat-list-main">
                  <div className="wechat-list-title">
                    {p.remark || "未命名好友"}
                  </div>
                  <div className="wechat-list-sub">{text}</div>
                </div>
                <div className="wechat-list-time">{time || ""}</div>
              </div>
            );
          })}

          <div className="wechat-list-item">
            <div className="avatar-circle" />
            <div className="wechat-list-main">
              <div className="wechat-list-title">软糯糯小群（开发中）</div>
              <div className="wechat-list-sub">
                以后这里可以多人一起和 AI 搞事情
              </div>
            </div>
            <div className="wechat-list-time">敬请期待</div>
          </div>
        </div>
      );
    }

    const now = new Date();

    return (
      <div className="chat-bubbles">
        {messages.map((m, index) => {
          const prev = index > 0 ? messages[index - 1] : undefined;
          const nowTs = m.timestamp ?? 0;
          const prevTs = prev?.timestamp ?? 0;
          const needTime =
            index === 0 || nowTs - prevTs > 5 * 60 * 1000;

          const displayTime =
            m.timestamp != null
              ? formatChatTimeLabel(m.timestamp, now)
              : m.timeLabel ?? "";

          return (
            <div key={m.id ?? index}>
              {needTime && displayTime && (
                <div className="chat-time-separator">{displayTime}</div>
              )}
              <div
                className={`chat-row chat-row-${m.from === "me" ? "me" : "other"
                  }`}
              >
                {m.from !== "me" && (
                  <div className="chat-avatar">
                    {activeProfile?.avatarUrl ? (
                      <img
                        src={activeProfile.avatarUrl}
                        alt="头像"
                        className="chat-avatar-img"
                      />
                    ) : (
                      <span aria-hidden="true">
                        {activeProfile?.avatarEmoji ?? "🌙"}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`chat-bubble chat-bubble-${m.from === "me" ? "me" : "other"
                    }`}
                >
                  <div className="chat-bubble-text">{m.text}</div>
                </div>
                {m.from === "me" && (
                  <div className="chat-avatar chat-avatar-me">
                    <span aria-hidden="true">我</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
        {loading && (
          <div className="chat-row chat-row-other">
            <div className="chat-avatar">
              {activeProfile?.avatarUrl ? (
                <img
                  src={activeProfile.avatarUrl}
                  alt="头像"
                  className="chat-avatar-img"
                />
              ) : (
                <span aria-hidden="true">
                  {activeProfile?.avatarEmoji ?? "🌙"}
                </span>
              )}
            </div>
            <div className="chat-bubble chat-bubble-other">
              <div className="chat-bubble-text">
                <span className="typing-indicator">
                  <span className="typing-indicator-label">对方正在输入中</span>
                  <span className="typing-dots">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="chat-row chat-row-other">
            <div className="chat-avatar">
              {activeProfile?.avatarUrl ? (
                <img
                  src={activeProfile.avatarUrl}
                  alt="头像"
                  className="chat-avatar-img"
                />
              ) : (
                <span aria-hidden="true">
                  {activeProfile?.avatarEmoji ?? "🌙"}
                </span>
              )}
            </div>
            <div className="chat-bubble chat-bubble-other">
              <div className="chat-bubble-text">{error}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const showInput = tab === "chats" && !!activeChatId;

  const activeProfile =
    activeChatId != null
      ? chatProfiles[activeChatId] ?? {
        id: activeChatId,
        remark: "软糯糯·AI 好友",
        avatarEmoji: "🌙",
        avatarUrl: "",
        callMeAs: "你",
        worldbooks: [],
        myIdentity: "",
        characterIdentity: "温柔的乙女游戏 AI 陪伴角色",
        chatStyle: "软糯糯、温柔、像恋爱游戏里的角色那样和玩家聊天"
      }
      : null;

  const headerTitle =
    (activeProfile && (mode === "profile" || (tab === "chats" && activeChatId))) ?
      (activeProfile.remark || "未命名好友") :
      "微信 · 软糯糯";

  return (
    <div className="screen wechat-screen">
      <header className="screen-header wechat-header">
        <div className="wechat-header-left">
          {tab === "chats" && activeChatId && mode === "main" ? (
            <button
              type="button"
              className="wechat-back-btn"
              onClick={() => {
                setActiveChatId(null);
                setMode("main");
              }}
            >
              ←
            </button>
          ) : (
            <div className="wechat-header-spacer" />
          )}
        </div>
        <div className="wechat-header-title">
          <div className="screen-title-main">{headerTitle}</div>
        </div>
        {mode === "main" && activeChatId && (
          <button
            type="button"
            className="wechat-profile-btn"
            onClick={() => setMode("profile")}
          >
            ⋯
          </button>
        )}
        {mode === "profile" && (
          <button
            type="button"
            className="wechat-profile-btn"
            onClick={() => setMode("main")}
          >
            ←
          </button>
        )}
      </header>
      <main className="screen-body wechat-body">
        {mode === "profile" && activeChatId ? (
          <ChatProfilePage
            chatId={activeChatId}
            onClearChat={() => {
              if (!activeChatId) return;
              try {
                window.localStorage.removeItem(
                  `${CHAT_STORAGE_PREFIX}${activeChatId}`
                );
              } catch {
                // ignore
              }
              const profile = chatProfiles[activeChatId];
              const line = profile?.openingLine?.trim();
              if (line) {
                setMessages([{ id: 1, from: "other", text: line }]);
              } else {
                setMessages([]);
              }
            }}
          />
        ) : (
          renderBody()
        )}
      </main>
      {creatingOpen && (
        <div
          className="settings-modal-backdrop"
          onClick={() => setCreatingOpen(false)}
        >
          <div
            className="settings-modal-card wechat-avatar-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-title">新建联系人</div>
            <div className="settings-modal-message">
              先填写基础人设，详细风格可以进聊天后再在「⋯」里慢慢调整。
            </div>
            <CreateContactForm
              onCancel={() => setCreatingOpen(false)}
              onCreated={(id) => {
                setCreatingOpen(false);
                setActiveChatId(id);
                setMode("main");
                setTab("chats");
              }}
            />
          </div>
        </div>
      )}
      {showInput && mode === "main" && (
        <footer className="screen-footer chat-input-bar">
          <button
            type="button"
            className="chat-voice-btn"
            onClick={openVoiceModal}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 19V23"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 23H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <input
            className="chat-input"
            placeholder="和 Ta 说点什么吧…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                enqueueUserMessage(input);
                setInput("");
              }
            }}
          />
          <div className="chat-input-actions">
            <button
              type="button"
              className="chat-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ＋
            </button>
            {menuOpen && (
              <div className="chat-menu-popup">
                <button
                  type="button"
                  className="chat-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: 实现发送图片功能
                  }}
                >
                  📷 照片
                </button>
                <button
                  type="button"
                  className="chat-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: 实现发送文件功能
                  }}
                >
                  📎 文件
                </button>
                <button
                  type="button"
                  className="chat-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: 实现发送位置功能
                  }}
                >
                  📍 位置
                </button>
              </div>
            )}
            <button
              className="chat-send-btn"
              onClick={() => {
                setMenuOpen(false);
                triggerReply();
              }}
              disabled={loading || (pendingUserTurns.length === 0 && input.trim() === "")}
              title="发送"
            >
              {loading ? (
                "..."
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22 2L11 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M22 2L15 22L11 13L2 9L22 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </footer>
      )}
      {voiceModalOpen && (
        <div
          className="settings-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelVoiceMessage();
            }
          }}
        >
          <div
            className="settings-modal-card voice-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="voice-modal-header">
              <div className="voice-modal-title">语音消息</div>
            </div>
            <div className="voice-modal-time-input">
              <label className="voice-modal-label">语音时长（秒）</label>
              <input
                type="number"
                className="settings-input"
                min="0"
                value={recordingTime}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setRecordingTime(Math.max(0, val));
                }}
                placeholder="0"
              />
              <div className="voice-modal-time-display">
                {Math.floor(recordingTime / 60)}:
                {String(recordingTime % 60).padStart(2, "0")}
              </div>
            </div>
            <div className="voice-modal-text-input">
              <label className="voice-modal-label">语音文本内容</label>
              <textarea
                className="settings-textarea"
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="输入语音消息的文本内容..."
                rows={4}
              />
            </div>
            <div className="voice-modal-actions">
              <button
                type="button"
                className="soft-icon-btn"
                onClick={cancelVoiceMessage}
              >
                取消
              </button>
              <button
                type="button"
                className="primary-pill-btn"
                onClick={sendVoiceMessage}
                disabled={!voiceText.trim()}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}
      {mode === "main" && !(tab === "chats" && activeChatId) && (
        <nav className="wechat-bottom-nav">
          <button
            type="button"
            className={`wechat-bottom-item ${tab === "chats" ? "wechat-bottom-item-active" : ""}`}
            onClick={() => {
              setTab("chats");
              setActiveChatId(null);
            }}
          >
            <span className="wechat-bottom-icon">💬</span>
            <span className="wechat-bottom-label">微信</span>
          </button>
          <button
            type="button"
            className={`wechat-bottom-item ${tab === "moments" ? "wechat-bottom-item-active" : ""}`}
            onClick={() => {
              setTab("moments");
              setActiveChatId(null);
            }}
          >
            <span className="wechat-bottom-icon">✦</span>
            <span className="wechat-bottom-label">发现</span>
          </button>
          <button type="button" className="wechat-bottom-item wechat-bottom-item-disabled">
            <span className="wechat-bottom-icon">♡</span>
            <span className="wechat-bottom-label">我</span>
          </button>
        </nav>
      )}
    </div>
  );
}

interface ChatProfilePanelProps {
  chatId: string;
  onClearChat?: () => void;
}

interface CreateContactFormProps {
  onCancel: () => void;
  onCreated: (chatId: string) => void;
}

function CreateContactForm({ onCancel, onCreated }: CreateContactFormProps) {
  const { updateChatProfile } = useSettings();
  const [remark, setRemark] = useState("");
  const [callMeAs, setCallMeAs] = useState("");
  const [myIdentity, setMyIdentity] = useState("");
  const [characterIdentity, setCharacterIdentity] = useState("");
  const [chatStyle, setChatStyle] = useState("");
  const [openingLine, setOpeningLine] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!remark.trim() || !myIdentity.trim() || !characterIdentity.trim()) {
      setError("备注名、我的身份、聊天对象的身份为必填项哦～");
      return;
    }
    const id = `friend_${Date.now()}`;
    updateChatProfile(id, {
      id,
      remark: remark.trim(),
      callMeAs: callMeAs.trim() || "你",
      myIdentity: myIdentity.trim(),
      characterIdentity: characterIdentity.trim(),
      chatStyle: chatStyle.trim(),
      openingLine: openingLine.trim() || undefined,
      worldbooks: []
    });
    onCreated(id);
  };

  return (
    <div className="wechat-profile-card">
      <div className="settings-field">
        <label className="settings-label">备注名（必填）</label>
        <input
          className="settings-input"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">Ta 称呼我为</label>
        <input
          className="settings-input"
          placeholder="例如：小猫咪 / 小朋友 / 队长"
          value={callMeAs}
          onChange={(e) => setCallMeAs(e.target.value)}
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">我的身份（必填）</label>
        <input
          className="settings-input"
          placeholder="例如：乙女游戏玩家 / 魔法学徒 / 宿舍室友"
          value={myIdentity}
          onChange={(e) => setMyIdentity(e.target.value)}
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">聊天对象的身份设定（必填）</label>
        <input
          className="settings-input"
          placeholder="例如：高二英语老师 / 大学同学 / 游戏 NPC"
          value={characterIdentity}
          onChange={(e) => setCharacterIdentity(e.target.value)}
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">聊天风格（可选）</label>
        <input
          className="settings-input"
          placeholder="例如：软糯黏人、小狗狗系、傲娇毒舌但很在意我…"
          value={chatStyle}
          onChange={(e) => setChatStyle(e.target.value)}
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">开场白（可选）</label>
        <textarea
          className="settings-textarea"
          placeholder="第一次进入聊天时，对方会自动发送的一段话。留空则不开场白。"
          value={openingLine}
          onChange={(e) => setOpeningLine(e.target.value)}
        />
      </div>
      {error && <div className="settings-error-text">{error}</div>}
      <div className="settings-field settings-model-row">
        <button
          type="button"
          className="secondary-pill-btn"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="primary-pill-btn"
          onClick={handleCreate}
        >
          创建
        </button>
      </div>
    </div>
  );
}

function ChatProfilePage({ chatId, onClearChat }: ChatProfilePanelProps) {
  const { chatProfiles, updateChatProfile } = useSettings();
  const profile = chatProfiles[chatId] ?? {
    id: chatId,
    remark: "软糯糯·AI 好友",
    avatarEmoji: "🌙",
    avatarUrl: "",
    callMeAs: "你",
    worldbooks: [],
    myIdentity: "",
    characterIdentity: "温柔的乙女游戏 AI 陪伴角色",
    chatStyle: "软糯糯、温柔、像恋爱游戏里的角色那样和玩家聊天"
  };
  const [avatarOpen, setAvatarOpen] = useState(false);

  return (
    <div className="soft-card wechat-profile-card">
      <div className="soft-card-header">
        <button
          type="button"
          className="avatar-circle avatar-circle-button"
          onClick={() => setAvatarOpen(true)}
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="头像"
              className="avatar-image"
            />
          ) : (
            <span aria-hidden="true">{profile.avatarEmoji}</span>
          )}
        </button>
        <div className="soft-card-header-text">
          <div className="soft-card-title">
            {profile.remark || "未命名好友"}
          </div>
          <div className="soft-card-subtitle">
            为这个聊天对象单独设置人设（点击头像可修改头像）
          </div>
        </div>
      </div>
      <div className="settings-field">
        <label className="settings-label">备注名</label>
        <input
          className="settings-input"
          value={profile.remark}
          onChange={(e) =>
            updateChatProfile(chatId, { remark: e.target.value })
          }
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">Ta 称呼我为</label>
        <input
          className="settings-input"
          placeholder="例如：小猫咪 / 小朋友 / 队长"
          value={profile.callMeAs}
          onChange={(e) =>
            updateChatProfile(chatId, { callMeAs: e.target.value })
          }
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">我的身份</label>
        <input
          className="settings-input"
          placeholder="例如：乙女游戏玩家 / 魔法学徒 / 宿舍室友"
          value={profile.myIdentity}
          onChange={(e) =>
            updateChatProfile(chatId, { myIdentity: e.target.value })
          }
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">聊天对象的身份设定</label>
        <input
          className="settings-input"
          placeholder="例如：高二英语老师 / 大学同学 / 游戏 NPC"
          value={profile.characterIdentity}
          onChange={(e) =>
            updateChatProfile(chatId, { characterIdentity: e.target.value })
          }
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">聊天风格</label>
        <input
          className="settings-input"
          placeholder="例如：软糯黏人、小狗狗系、傲娇毒舌但很在意我…"
          value={profile.chatStyle}
          onChange={(e) =>
            updateChatProfile(chatId, { chatStyle: e.target.value })
          }
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">开场白</label>
        <textarea
          className="settings-textarea"
          placeholder="第一次进入聊天时，对方会自动发送的一段话。留空则不开场白。"
          value={profile.openingLine || ""}
          onChange={(e) =>
            updateChatProfile(chatId, { openingLine: e.target.value })
          }
        />
      </div>
      <div className="settings-field">
        <label className="settings-label">这个聊天的世界书</label>
      </div>
      {profile.worldbooks.map((wb) => (
        <details key={wb.id} className="soft-card settings-section worldbook-collapsible">
          <summary className="worldbook-summary">
            {wb.title || "未命名世界书"}
          </summary>
          <div className="worldbook-content">
            <div className="soft-card-header-text">
              <div className="soft-card-title">{wb.title || "未命名世界书"}</div>
              <div className="soft-card-subtitle">为这本世界书添加多条可折叠的设定条目</div>
            </div>
            <div className="settings-field">
              <label className="settings-label">世界书名称</label>
              <input
                className="settings-input"
                value={wb.title}
                onChange={(e) =>
                  updateChatProfile(chatId, {
                    worldbooks: profile.worldbooks.map((w) =>
                      w.id === wb.id ? { ...w, title: e.target.value } : w
                    )
                  })
                }
              />
            </div>
            {wb.entries?.map((entry) => (
              <details key={entry.id} className="worldbook-entry">
                <summary className="worldbook-entry-summary">
                  {entry.title || "未命名条目"}
                </summary>
                <div className="settings-field">
                  <label className="settings-label">条目名称</label>
                  <input
                    className="settings-input"
                    value={entry.title}
                    onChange={(e) =>
                      updateChatProfile(chatId, {
                        worldbooks: profile.worldbooks.map((w) =>
                          w.id === wb.id
                            ? {
                              ...w,
                              entries: w.entries.map((en) =>
                                en.id === entry.id
                                  ? { ...en, title: e.target.value }
                                  : en
                              )
                            }
                            : w
                        )
                      })
                    }
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-label">条目内容</label>
                  <textarea
                    className="settings-textarea"
                    placeholder="这里写具体的设定内容，比如性格、外貌、关系、小习惯等…"
                    value={entry.content}
                    onChange={(e) =>
                      updateChatProfile(chatId, {
                        worldbooks: profile.worldbooks.map((w) =>
                          w.id === wb.id
                            ? {
                              ...w,
                              entries: w.entries.map((en) =>
                                en.id === entry.id
                                  ? { ...en, content: e.target.value }
                                  : en
                              )
                            }
                            : w
                        )
                      })
                    }
                  />
                </div>
                <div className="settings-field settings-model-row">
                  <button
                    type="button"
                    className="soft-icon-btn"
                    onClick={() =>
                      updateChatProfile(chatId, {
                        worldbooks: profile.worldbooks.map((w) =>
                          w.id === wb.id
                            ? {
                              ...w,
                              entries: w.entries.filter(
                                (en) => en.id !== entry.id
                              )
                            }
                            : w
                        )
                      })
                    }
                  >
                    删除这个条目
                  </button>
                </div>
              </details>
            ))}
            <div className="settings-field settings-model-row">
              <button
                type="button"
                className="soft-icon-btn"
                onClick={() =>
                  updateChatProfile(chatId, {
                    worldbooks: profile.worldbooks.map((w) =>
                      w.id === wb.id
                        ? {
                          ...w,
                          entries: [
                            ...(w.entries ?? []),
                            {
                              id: Date.now().toString(36),
                              title: "",
                              content: ""
                            }
                          ]
                        }
                        : w
                    )
                  })
                }
              >
                ＋ 新增条目
              </button>
              <button
                type="button"
                className="soft-icon-btn"
                onClick={() =>
                  updateChatProfile(chatId, {
                    worldbooks: profile.worldbooks.filter((w) => w.id !== wb.id)
                  })
                }
              >
                删除这本世界书
              </button>
            </div>
          </div>
        </details>
      ))}
      <div className="settings-field settings-model-row">
        <button
          type="button"
          className="primary-pill-btn"
          onClick={() =>
            updateChatProfile(chatId, {
              worldbooks: [
                ...profile.worldbooks,
                {
                  id: Date.now().toString(36),
                  title: "",
                  entries: []
                }
              ]
            })
          }
        >
          ＋ 新建世界书
        </button>
        {onClearChat && (
          <button
            type="button"
            className="soft-icon-btn"
            onClick={onClearChat}
          >
            清除这个聊天的全部记录
          </button>
        )}
      </div>

      {avatarOpen && (
        <div
          className="settings-modal-backdrop"
          onClick={() => setAvatarOpen(false)}
        >
          <div
            className="settings-modal-card wechat-avatar-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-title">设置头像</div>
            <div className="settings-modal-message">
              支持输入表情、粘贴图片 URL 或从本地上传图片
            </div>
            <div className="settings-field">
              <label className="settings-label">头像图片 URL</label>
              <input
                className="settings-input"
                placeholder="粘贴一张图片的网络地址，或留空使用表情"
                value={profile.avatarUrl || ""}
                onChange={(e) =>
                  updateChatProfile(chatId, { avatarUrl: e.target.value })
                }
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">或使用表情</label>
              <input
                className="settings-input"
                value={profile.avatarEmoji}
                onChange={(e) =>
                  updateChatProfile(chatId, {
                    avatarEmoji: e.target.value || "🌙"
                  })
                }
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">从本地上传头像图片</label>
              <input
                className="settings-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result =
                      typeof reader.result === "string" ? reader.result : "";
                    if (result) {
                      updateChatProfile(chatId, { avatarUrl: result });
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            <button
              type="button"
              className="primary-pill-btn settings-modal-btn"
              onClick={() => setAvatarOpen(false)}
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


