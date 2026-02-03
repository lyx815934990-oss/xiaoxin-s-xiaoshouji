import type { AppId } from "../App";

interface BottomNavProps {
  activeApp: AppId;
  onChangeApp: (id: AppId) => void;
}

const items: { id: AppId; label: string; icon: string }[] = [
  { id: "wechat", label: "微信", icon: "💬" },
  { id: "weibo", label: "微博", icon: "✿" },
  { id: "food", label: "外卖", icon: "🍰" },
  { id: "xiaohongshu", label: "小红书", icon: "♡" },
  { id: "shopping", label: "购物", icon: "🛍" }
];

export function BottomNav({ activeApp, onChangeApp }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active = item.id === activeApp;
        return (
          <button
            key={item.id}
            className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}
            onClick={() => onChangeApp(item.id)}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
            {active && <span className="bottom-nav-active-glow" />}
          </button>
        );
      })}
    </nav>
  );
}


