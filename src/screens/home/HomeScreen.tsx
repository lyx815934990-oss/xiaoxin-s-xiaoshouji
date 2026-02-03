import { useEffect, useState, useRef } from "react";
import type { AppId } from "../../App";

interface HomeScreenProps {
  onOpenApp: (id: AppId) => void;
}

const apps: { id: AppId; label: string; icon: string }[] = [
  { id: "wechat", label: "微信", icon: "💬" },
  { id: "weibo", label: "微博", icon: "✿" },
  { id: "food", label: "外卖", icon: "🍰" },
  { id: "xiaohongshu", label: "小红书", icon: "♡" },
  { id: "shopping", label: "购物", icon: "🛍" },
  { id: "worldbook", label: "世界书", icon: "📖" },
  { id: "settings", label: "设置", icon: "⚙" }
];

const APPS_ORDER_KEY = "miniOtomeHomeAppsOrder_v1";

export function HomeScreen({ onOpenApp }: HomeScreenProps) {
  const [now, setNow] = useState(() => new Date());
  const [playing, setPlaying] = useState(false);
  const [appsOrder, setAppsOrder] = useState<AppId[]>(() => apps.map((a) => a.id));
  const [editingIcons, setEditingIcons] = useState(false);
  const [orderLoaded, setOrderLoaded] = useState(false);
  const dragFromId = useRef<AppId | null>(null);
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(APPS_ORDER_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AppId[];
      const valid = parsed.filter((id) => apps.some((a) => a.id === id));
      const missing = apps.map((a) => a.id).filter((id) => !valid.includes(id));
      setAppsOrder([...valid, ...missing]);
    } catch {
      // ignore
    }
    setOrderLoaded(true);
  }, []);

  useEffect(() => {
    if (!orderLoaded) return;
    try {
      window.localStorage.setItem(APPS_ORDER_KEY, JSON.stringify(appsOrder));
    } catch {
      // ignore
    }
  }, [appsOrder, orderLoaded]);

  const orderedApps = appsOrder
    .map((id) => apps.find((a) => a.id === id))
    .filter((a): a is (typeof apps)[number] => Boolean(a));

  const time = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const date = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });

  const clearLongPressTimer = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const exitEditing = () => {
    setEditingIcons(false);
    dragFromId.current = null;
    clearLongPressTimer();
  };

  const handleIconPressStart = (id: AppId) => {
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      setEditingIcons(true);
    }, 500);
  };

  const handleIconPressEnd = (id: AppId) => {
    if (!editingIcons && longPressTimer.current !== null) {
      // treated as normal tap
      onOpenApp(id);
    }
    clearLongPressTimer();
  };

  const handleDragStart = (id: AppId) => {
    dragFromId.current = id;
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>, id: AppId) => {
    e.preventDefault();
    const from = dragFromId.current;
    if (!from || from === id) return;
    setAppsOrder((prev) => {
      const current = [...prev];
      const fromIndex = current.indexOf(from);
      const toIndex = current.indexOf(id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, from);
      return current;
    });
  };

  const handleDragEnd = () => {
    dragFromId.current = null;
  };

  return (
    <div
      className="screen home-screen"
      onClick={() => {
        if (editingIcons) {
          exitEditing();
        }
      }}
    >
      <main className="screen-body home-body">
        <div className="home-widget-column">
          <section className="home-widget-card home-clock-card">
            <div className="home-clock-time">{time}</div>
            <div className="home-clock-date">{date}</div>
          </section>
          <section className="home-widget-card home-player-card">
            <div className="home-player-disc-wrap">
              <div
                className={`home-player-disc ${
                  playing ? "home-player-disc-playing" : ""
                }`}
              >
                <div className="home-player-disc-inner" />
                <div className="home-player-disc-label">Lo-fi</div>
              </div>
              <div
                className={`home-player-arm ${
                  playing ? "home-player-arm-playing" : ""
                }`}
              />
            </div>
            <div className="home-player-main">
              <div className="home-player-title">柔软心跳 · Lo-fi</div>
              <div className="home-player-sub">小手机虚拟唱片机 · 未来可以接真音乐</div>
            </div>
            <button
              type="button"
              className="home-player-btn"
              onClick={() => setPlaying((v) => !v)}
            >
              {playing ? "暂停" : "播放"}
            </button>
          </section>
        </div>
        <div className="home-app-grid">
          {orderedApps.map((app) => (
            <button
              key={app.id}
              className={`home-app-icon soft-hover-float ${
                editingIcons ? "home-app-icon-editing" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={() => handleIconPressStart(app.id)}
              onMouseUp={() => handleIconPressEnd(app.id)}
              onMouseLeave={clearLongPressTimer}
              onTouchStart={() => handleIconPressStart(app.id)}
              onTouchEnd={() => handleIconPressEnd(app.id)}
              draggable={editingIcons}
              onDragStart={() => handleDragStart(app.id)}
              onDragOver={(e) => handleDragOver(e, app.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="home-app-icon-bg">
                <span className="home-app-emoji" aria-hidden="true">
                  {app.icon}
                </span>
              </div>
              <span className="home-app-label">{app.label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

