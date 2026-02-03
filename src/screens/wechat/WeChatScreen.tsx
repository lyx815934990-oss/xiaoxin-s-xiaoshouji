import { useEffect, useRef, useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { sendChatRequest, type ChatMessage } from "../../services/aiClient";
import { WeChatMePage } from "./WeChatMePage";

type WechatTab = "chats" | "moments" | "me";

interface UiMessage {
  id: number;
  from: "me" | "other";
  text: string;
  /** 人类可读时间，比如 13:05，用来展示 */
  timeLabel?: string;
  /** 精确时间戳，用来计算与上一条消息的时间间隔 */
  timestamp?: number;
  /** 是否为语音消息 */
  isVoice?: boolean;
  /** 语音时长（秒） */
  voiceDuration?: number;
  /** 语音文本内容 */
  voiceText?: string;
  /** 是否为表情包消息 */
  isEmoji?: boolean;
  /** 表情包图片URL */
  emojiUrl?: string;
  /** 表情包名称 */
  emojiName?: string;
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

/**
 * 根据文本内容匹配最合适的表情包
 * @param text AI回复的文本内容
 * @param allEmojis 所有可用的表情包列表
 * @returns 匹配到的表情包，如果没有合适的则返回null
 */
function findMatchingEmoji(
  text: string,
  allEmojis: Array<{ url: string; name: string }>
): { url: string; name: string } | null {
  if (allEmojis.length === 0) return null;

  // 提取文本中的关键词（情感词、动作词等）
  const keywords: string[] = [];

  // 情感关键词
  const emotionKeywords = [
    "开心", "高兴", "快乐", "愉快", "兴奋", "喜悦", "欢乐", "笑", "哈哈", "嘻嘻", "嘿嘿",
    "难过", "伤心", "悲伤", "哭", "流泪", "哭泣", "委屈", "失落",
    "生气", "愤怒", "气", "怒", "火",
    "惊讶", "吃惊", "震惊", "哇", "天哪",
    "害羞", "脸红", "不好意思", "尴尬",
    "困", "累", "疲惫", "睡觉", "晚安",
    "饿", "吃", "美食", "好吃",
    "爱", "喜欢", "心动", "心动", "❤", "💕",
    "拜拜", "再见", "bye", "88",
    "好", "棒", "赞", "厉害", "牛",
    "加油", "努力", "奋斗",
    "谢谢", "感谢", "thx",
    "对不起", "抱歉", "sorry"
  ];

  // 检查文本中是否包含关键词
  for (const keyword of emotionKeywords) {
    if (text.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  // 如果没有找到关键词，不发送表情包
  if (keywords.length === 0) {
    return null;
  }

  // 根据关键词匹配表情包名称
  // 优先匹配完全包含关键词的表情包名称
  for (const keyword of keywords) {
    const matched = allEmojis.find(emoji =>
      emoji.name.includes(keyword) || keyword.includes(emoji.name)
    );
    if (matched) {
      return matched;
    }
  }

  // 如果完全匹配失败，尝试部分匹配（表情包名称包含关键词的一部分）
  for (const keyword of keywords) {
    const matched = allEmojis.find(emoji => {
      // 检查表情包名称是否包含关键词的任意部分
      for (let i = 0; i < keyword.length; i++) {
        for (let j = i + 1; j <= keyword.length; j++) {
          const subKeyword = keyword.slice(i, j);
          if (subKeyword.length >= 1 && emoji.name.includes(subKeyword)) {
            return true;
          }
        }
      }
      return false;
    });
    if (matched) {
      return matched;
    }
  }

  // 如果还是没找到，不发送表情包
  return null;
}

export function WeChatScreen() {
  const { aiConfig, chatProfiles, updateChatProfile, userProfile } = useSettings();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [tab, setTab] = useState<WechatTab>("chats");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"main" | "profile">("main");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmojiGroupId, setSelectedEmojiGroupId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  // 回车可以连续发多条消息：这些消息只入队，不触发 AI；点击按钮才触发回复
  const [pendingUserTurns, setPendingUserTurns] = useState<UiMessage[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceText, setVoiceText] = useState("");
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [expandedVoiceId, setExpandedVoiceId] = useState<number | null>(null);
  const [voiceTypedIds, setVoiceTypedIds] = useState<Set<number>>(new Set());
  const [voiceTypingText, setVoiceTypingText] = useState<Record<number, string>>({});

  const createUserMessage = (text: string, emojiUrl?: string, emojiName?: string): UiMessage => {
    const now = new Date();
    const timestamp = now.getTime();
    const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const nextId = messages.length ? messages[messages.length - 1].id + 1 : 1;
    if (emojiUrl) {
      return { id: nextId, from: "me", text: "", timeLabel, timestamp, isEmoji: true, emojiUrl, emojiName };
    }
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
              : "") +
            `\n\n重要提示：当你发送语音消息时，语音内容只能包含实际说出口的话和声音相关的描述（如语气、语调、声音特点等，可以用括号标注如"（轻声说）"、"（语气温柔）"等），不要包含任何心理活动、内心想法、旁白或动作描述。不要使用[语音]这样的标记。心理活动应该用普通文本消息发送，而不是语音消息。`
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
          // 注意：这里不再需要，因为每条消息已经在 showSegment 中保存了
          return;
        }

        const text = segments[index];
        const now = new Date();
        const ts = now.getTime();
        const label = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        // 根据文本内容匹配合适的表情包
        const allEmojis: Array<{ url: string; name: string }> = [];
        userProfile.emojiGroups.forEach((group: { emojis: Array<{ url: string; name: string }> }) => {
          group.emojis.forEach((emoji: { url: string; name: string }) => {
            allEmojis.push({ url: emoji.url, name: emoji.name });
          });
        });
        const selectedEmoji = findMatchingEmoji(text, allEmojis);
        const shouldSendEmoji = selectedEmoji !== null;

        // 随机决定是否发送语音消息（可调整概率，当前为 50%）
        // 如果想总是发送语音消息，改为: Math.random() < 1.0
        // 如果想从不发送语音消息，改为: Math.random() < 0.0
        const VOICE_PROBABILITY = 0.5; // 调整这个值：0.0 = 从不发送，1.0 = 总是发送
        const isVoice = !shouldSendEmoji && Math.random() < VOICE_PROBABILITY && text.length > 10;

        // 如果是语音消息，需要提取或生成只包含声音描述的内容（不含心理活动）
        let voiceText = text;
        if (isVoice) {
          // 移除标记性文字（如 [语音]、[语音消息] 等）
          voiceText = text
            .replace(/\[语音[^\]]*\]/gi, "") // 移除 [语音]、[语音消息] 等标记
            .replace(/\[.*?\]/g, "") // 移除所有方括号内容
            .replace(/\*[^*]*\*/g, "") // 移除 *...* 格式的心理活动
            .replace(/【[^】]*】/g, "") // 移除 【...】 格式的旁白
            .trim();

          // 保留声音相关的括号描述（如（轻声说）、（笑着说）、（语气温柔）等）
          // 这些括号内容通常包含：说、道、语气、语调、声音等关键词
          // 不包含：想、内心、思考、动作等非声音相关的词
          const voiceKeywords = /(说|道|语气|语调|声音|轻声|大声|小声|温柔|冷淡|开心|难过|兴奋|平静|紧张|放松)/;
          voiceText = voiceText.replace(/（([^）]+)）/g, (match, content) => {
            // 如果括号内容包含声音相关关键词，保留；否则移除
            return voiceKeywords.test(content) ? match : "";
          });
          voiceText = voiceText.replace(/\(([^)]+)\)/g, (match, content) => {
            // 如果括号内容包含声音相关关键词，保留；否则移除
            return voiceKeywords.test(content) ? match : "";
          });

          // 清理多余空格
          voiceText = voiceText.replace(/\s+/g, " ").trim();

          // 如果提取后为空，则使用原文本（但会在系统提示中要求 AI 只生成声音描述）
          if (!voiceText) {
            voiceText = text;
          }
        }

        // 计算语音时长：中文语速大约每秒3-4个字，这里使用每秒3.5个字来计算
        // 最少1秒，最多不超过60秒
        const voiceDuration = isVoice
          ? Math.max(1, Math.min(60, Math.ceil(voiceText.length / 3.5)))
          : undefined;

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
                text: isVoice ? "" : shouldSendEmoji ? "" : text,
                timeLabel: label,
                timestamp: ts,
                isVoice,
                voiceDuration,
                voiceText: isVoice ? voiceText : undefined,
                isEmoji: shouldSendEmoji,
                emojiUrl: shouldSendEmoji ? selectedEmoji?.url : undefined,
                emojiName: shouldSendEmoji ? selectedEmoji?.name : undefined
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

          // 使用相同的表情包和语音判断逻辑
          const allEmojis: Array<{ url: string; name: string }> = [];
          userProfile.emojiGroups.forEach((group: { emojis: Array<{ url: string; name: string }> }) => {
            group.emojis.forEach((emoji: { url: string; name: string }) => {
              allEmojis.push({ url: emoji.url, name: emoji.name });
            });
          });
          const selectedEmoji = findMatchingEmoji(text, allEmojis);
          const shouldSendEmoji = selectedEmoji !== null;

          const VOICE_PROBABILITY = 0.5; // 调整这个值：0.0 = 从不发送，1.0 = 总是发送
          const isVoice = !shouldSendEmoji && Math.random() < VOICE_PROBABILITY && text.length > 10;

          // 如果是语音消息，需要提取或生成只包含声音描述的内容（不含心理活动）
          let voiceText = text;
          if (isVoice) {
            // 移除标记性文字（如 [语音]、[语音消息] 等）
            voiceText = text
              .replace(/\[语音[^\]]*\]/gi, "") // 移除 [语音]、[语音消息] 等标记
              .replace(/\[.*?\]/g, "") // 移除所有方括号内容
              .replace(/\*[^*]*\*/g, "") // 移除 *...* 格式的心理活动
              .replace(/【[^】]*】/g, "") // 移除 【...】 格式的旁白
              .trim();

            // 保留声音相关的括号描述（如（轻声说）、（笑着说）、（语气温柔）等）
            // 这些括号内容通常包含：说、道、语气、语调、声音等关键词
            // 不包含：想、内心、思考、动作等非声音相关的词
            const voiceKeywords = /(说|道|语气|语调|声音|轻声|大声|小声|温柔|冷淡|开心|难过|兴奋|平静|紧张|放松)/;
            voiceText = voiceText.replace(/（([^）]+)）/g, (match, content) => {
              // 如果括号内容包含声音相关关键词，保留；否则移除
              return voiceKeywords.test(content) ? match : "";
            });
            voiceText = voiceText.replace(/\(([^)]+)\)/g, (match, content) => {
              // 如果括号内容包含声音相关关键词，保留；否则移除
              return voiceKeywords.test(content) ? match : "";
            });

            // 清理多余空格
            voiceText = voiceText.replace(/\s+/g, " ").trim();

            // 如果提取后为空，则使用原文本
            if (!voiceText) {
              voiceText = text;
            }
          }

          // 计算语音时长：中文语速大约每秒3-4个字，这里使用每秒3.5个字来计算
          // 最少1秒，最多不超过60秒
          const voiceDuration = isVoice
            ? Math.max(1, Math.min(60, Math.ceil(voiceText.length / 3.5)))
            : undefined;

          const newMessage: UiMessage = {
            id: existing.length ? existing[existing.length - 1].id + 1 : 1,
            from: "other",
            text: isVoice ? "" : shouldSendEmoji ? "" : text,
            timeLabel: label,
            timestamp: ts,
            isVoice,
            voiceDuration,
            voiceText: isVoice ? voiceText : undefined,
            isEmoji: shouldSendEmoji,
            emojiUrl: shouldSendEmoji ? selectedEmoji?.url : undefined,
            emojiName: shouldSendEmoji ? selectedEmoji?.name : undefined
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
      const now = new Date();
      const timestamp = now.getTime();
      const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      setMessages((prev) => {
        const nextId = prev.length ? prev[prev.length - 1].id + 1 : 1;
        const voiceMsg: UiMessage = {
          id: nextId,
          from: "me",
          text: "", // 语音消息的 text 为空，使用 voiceText
          timeLabel,
          timestamp,
          isVoice: true,
          voiceDuration: recordingTime,
          voiceText: voiceText.trim()
        };
        return [...prev, voiceMsg];
      });

      // 保存到 localStorage
      if (activeChatId) {
        try {
          const stored = window.localStorage.getItem(
            `${CHAT_STORAGE_PREFIX}${activeChatId}`
          );
          const existing = stored ? (JSON.parse(stored) as UiMessage[]) : [];
          const nextId = existing.length ? existing[existing.length - 1].id + 1 : 1;
          const voiceMsg: UiMessage = {
            id: nextId,
            from: "me",
            text: "",
            timeLabel,
            timestamp,
            isVoice: true,
            voiceDuration: recordingTime,
            voiceText: voiceText.trim()
          };
          window.localStorage.setItem(
            `${CHAT_STORAGE_PREFIX}${activeChatId}`,
            JSON.stringify([...existing, voiceMsg])
          );
        } catch {
          // ignore
        }
      }
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
    if (tab === "me") {
      return <WeChatMePage />;
    }
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
                {m.isEmoji ? (
                  <div className="chat-emoji-wrapper">
                    <img
                      src={m.emojiUrl}
                      alt={m.emojiName || "表情包"}
                      className="chat-emoji-img"
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className={`chat-bubble chat-bubble-${m.from === "me" ? "me" : "other"
                        }`}
                    >
                      {m.isVoice ? (
                        <div
                          className="chat-voice-bubble"
                          onClick={() => {
                            const isExpanding = expandedVoiceId !== m.id;
                            setExpandedVoiceId(
                              expandedVoiceId === m.id ? null : m.id
                            );

                            // 如果是首次展开，启动打字机效果
                            if (isExpanding && m.voiceText && !voiceTypedIds.has(m.id)) {
                              const fullText = m.voiceText;
                              setVoiceTypingText((prev) => ({ ...prev, [m.id]: "" }));
                              let currentIndex = 0;
                              const typeInterval = setInterval(() => {
                                if (currentIndex < fullText.length) {
                                  setVoiceTypingText((prev) => ({
                                    ...prev,
                                    [m.id]: fullText.slice(0, currentIndex + 1)
                                  }));
                                  currentIndex++;
                                } else {
                                  clearInterval(typeInterval);
                                  setVoiceTypedIds((prev) => new Set(prev).add(m.id));
                                  setVoiceTypingText((prev) => {
                                    const next = { ...prev };
                                    delete next[m.id];
                                    return next;
                                  });
                                }
                              }, 30); // 每30ms打一个字
                            }
                          }}
                        >
                          {m.from === "other" ? (
                            <>
                              <div className="chat-voice-duration">
                                {m.voiceDuration
                                  ? `${Math.floor(m.voiceDuration / 60)}:${String(
                                    m.voiceDuration % 60
                                  ).padStart(2, "0")}`
                                  : "0:00"}
                              </div>
                              <div className={`chat-voice-wifi chat-voice-wifi-${m.from}`}>
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className={`chat-voice-wifi chat-voice-wifi-${m.from}`}>
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </div>
                              <div className="chat-voice-duration">
                                {m.voiceDuration
                                  ? `${Math.floor(m.voiceDuration / 60)}:${String(
                                    m.voiceDuration % 60
                                  ).padStart(2, "0")}`
                                  : "0:00"}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="chat-bubble-text">{m.text}</div>
                      )}
                      {m.isVoice && expandedVoiceId === m.id && m.voiceText && (
                        <div className="chat-voice-text-expanded">
                          {voiceTypingText[m.id] !== undefined
                            ? voiceTypingText[m.id]
                            : m.voiceText}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {m.from === "me" && (
                  <div className="chat-avatar chat-avatar-me">
                    {userProfile?.avatarUrl ? (
                      <img
                        src={userProfile.avatarUrl}
                        alt="我的头像"
                        className="chat-avatar-img"
                      />
                    ) : (
                      <span aria-hidden="true">
                        {userProfile?.avatarEmoji || "我"}
                      </span>
                    )}
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
    tab === "me" ? "表情包" :
      (activeProfile && (mode === "profile" || (tab === "chats" && activeChatId))) ?
        (activeProfile.remark || "未命名好友") :
        "微信 · 软糯糯";

  return (
    <div className="screen wechat-screen">
      {tab !== "me" && (
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
            <div className="wechat-header-right">
              <button
                type="button"
                className="wechat-call-btn"
                onClick={() => {
                  // TODO: 实现语音通话功能
                }}
                title="语音通话"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                className="wechat-profile-btn"
                onClick={() => setMode("profile")}
              >
                ⋯
              </button>
            </div>
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
      )}
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
                    setEmojiPickerOpen(true);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
                    <circle cx="15.5" cy="9.5" r="1.5" fill="currentColor" />
                    <path d="M8 14c0 2 1.5 3 4 3s4-1 4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                  </svg>
                  <span>表情包</span>
                </button>
                <button
                  type="button"
                  className="chat-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: 实现发送图片功能
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>照片</span>
                </button>
                <button
                  type="button"
                  className="chat-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: 实现发送红包功能
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* 红包主体 - 竖立的矩形，底部圆角 */}
                    <rect x="7" y="9" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
                    {/* 红包顶部三角形翻盖 - 填充的实心三角形 */}
                    <path d="M6 9L12 4L18 9L17 9L12 5L7 9Z" fill="currentColor" />
                    {/* 翻盖的轮廓线 */}
                    <path d="M6 9L12 4L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <span>红包</span>
                </button>
                <button
                  type="button"
                  className="chat-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: 实现发送位置功能
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
                  </svg>
                  <span>位置</span>
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
      {emojiPickerOpen && (
        <div
          className="settings-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEmojiPickerOpen(false);
              setSelectedEmojiGroupId(null);
            }
          }}
        >
          <div
            className="settings-modal-card emoji-picker-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="emoji-picker-header">
              <div className="emoji-picker-title">选择表情包</div>
              <button
                type="button"
                className="emoji-picker-close"
                onClick={() => {
                  setEmojiPickerOpen(false);
                  setSelectedEmojiGroupId(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="emoji-picker-content">
              {userProfile.emojiGroups.length === 0 ? (
                <div className="emoji-picker-empty">
                  <div className="emoji-picker-empty-text">还没有表情包组</div>
                  <div className="emoji-picker-empty-hint">请先在"我"页面添加表情包</div>
                </div>
              ) : (
                <>
                  {/* 表情包组横向滚动列表 */}
                  <div className="emoji-picker-group-tabs">
                    <div className="emoji-picker-group-tabs-scroll">
                      {userProfile.emojiGroups.map((group: { id: string; name: string; emojis: Array<{ id: string; url: string; name: string }> }) => {
                        const firstEmoji = group.emojis[0];
                        const currentGroupId = selectedEmojiGroupId || (userProfile.emojiGroups[0]?.id ?? null);
                        const isActive = currentGroupId === group.id;

                        return (
                          <button
                            key={group.id}
                            type="button"
                            className={`emoji-picker-group-tab ${isActive ? "emoji-picker-group-tab-active" : ""}`}
                            onClick={() => setSelectedEmojiGroupId(group.id)}
                          >
                            {firstEmoji ? (
                              <img
                                src={firstEmoji.url}
                                alt={group.name}
                                className="emoji-picker-group-tab-icon"
                              />
                            ) : (
                              <div className="emoji-picker-group-tab-icon-empty">{group.name[0] || "?"}</div>
                            )}
                            <span className="emoji-picker-group-tab-name">{group.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 选中组的表情包容器 */}
                  {(() => {
                    const currentGroupId = selectedEmojiGroupId || (userProfile.emojiGroups[0]?.id ?? null);
                    const selectedGroup = currentGroupId
                      ? userProfile.emojiGroups.find((g: { id: string }) => g.id === currentGroupId)
                      : null;

                    if (!selectedGroup) return null;

                    return (
                      <div className="emoji-picker-emojis-container">
                        {selectedGroup.emojis.length === 0 ? (
                          <div className="emoji-picker-group-empty">该组暂无表情包</div>
                        ) : (
                          <div className="emoji-picker-grid">
                            {selectedGroup.emojis.map((emoji: { id: string; url: string; name: string; type?: string }) => (
                              <button
                                key={emoji.id}
                                type="button"
                                className="emoji-picker-item"
                                onClick={() => {
                                  const emojiMsg = createUserMessage("", emoji.url, emoji.name);
                                  pushUserMessage(emojiMsg);

                                  // 保存到 localStorage
                                  if (activeChatId) {
                                    try {
                                      const stored = window.localStorage.getItem(
                                        `${CHAT_STORAGE_PREFIX}${activeChatId}`
                                      );
                                      const existing = stored ? (JSON.parse(stored) as UiMessage[]) : [];
                                      const nextId = existing.length ? existing[existing.length - 1].id + 1 : 1;
                                      const savedMsg: UiMessage = {
                                        ...emojiMsg,
                                        id: nextId
                                      };
                                      window.localStorage.setItem(
                                        `${CHAT_STORAGE_PREFIX}${activeChatId}`,
                                        JSON.stringify([...existing, savedMsg])
                                      );
                                    } catch {
                                      // ignore
                                    }
                                  }

                                  setEmojiPickerOpen(false);
                                  setSelectedEmojiGroupId(null);
                                }}
                              >
                                <img
                                  src={emoji.url}
                                  alt={emoji.name}
                                  className="emoji-picker-img"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
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
            <span className="wechat-bottom-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                  fill="currentColor"
                />
                <path
                  d="M7 9H17V11H7V9ZM7 12H14V14H7V12Z"
                  fill="white"
                />
              </svg>
            </span>
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
            <span className="wechat-bottom-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="wechat-bottom-label">发现</span>
          </button>
          <button
            type="button"
            className={`wechat-bottom-item ${tab === "me" ? "wechat-bottom-item-active" : ""}`}
            onClick={() => {
              setTab("me");
              setActiveChatId(null);
            }}
          >
            <span className="wechat-bottom-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                  fill="currentColor"
                />
              </svg>
            </span>
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


