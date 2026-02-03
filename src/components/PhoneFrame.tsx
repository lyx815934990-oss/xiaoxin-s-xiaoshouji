import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="phone-shell-wrap">
      <div className="phone-shell-glow" />
      <div className="phone-shell">
        <div className="phone-inner">{children}</div>
      </div>
    </div>
  );
}
