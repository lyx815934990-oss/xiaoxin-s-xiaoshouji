import type { ReactNode } from "react";
import type { ViewId } from "../App";
import { PhoneFrame } from "../components/PhoneFrame";
import { useSettings } from "../context/SettingsContext";

interface PhoneLayoutProps {
  view: ViewId;
  onBackHome: () => void;
  children: ReactNode;
}

export function PhoneLayout({ view, onBackHome, children }: PhoneLayoutProps) {
  const isHome = view === "home";
  const { wallpaper } = useSettings();

  return (
    <div className={`page-root wallpaper-${wallpaper}`}>
      <div className="page-bg-gradient" />
      <PhoneFrame>
        {!isHome && (
          <div className="phone-top-bar">
            <button className="phone-home-btn" onClick={onBackHome}>
              ⌂ 桌面
            </button>
          </div>
        )}
        <div className="phone-content">
          <div key={view} className="view-transition-card">
            {children}
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

