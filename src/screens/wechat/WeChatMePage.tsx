import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { EmojiPackPage } from "./EmojiPackPage";

type MePageMode = "main" | "emojiPack" | "favorites" | "wallet" | "familyCard";

export function WeChatMePage() {
  const { userProfile, updateUserProfile } = useSettings();
  const [mode, setMode] = useState<MePageMode>("main");
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarInput, setAvatarInput] = useState("");

  const handleAvatarClick = () => {
    setEditingAvatar(true);
    setAvatarInput(userProfile.avatarUrl || "");
  };

  const handleAvatarSave = () => {
    updateUserProfile({ avatarUrl: avatarInput.trim() || undefined });
    setEditingAvatar(false);
    setAvatarInput("");
  };


  if (mode === "emojiPack") {
    return (
      <div className="wechat-me-page">
        <div className="wechat-me-sub-header">
          <button
            type="button"
            className="wechat-me-back-btn"
            onClick={() => setMode("main")}
          >
            ←
          </button>
          <div className="wechat-me-sub-title">表情包</div>
        </div>
        <EmojiPackPage />
      </div>
    );
  }

  return (
    <div className="wechat-me-page">
      {/* 个人信息头部 */}
      <div className="wechat-me-header">
        <div
          className="wechat-me-avatar"
          onClick={handleAvatarClick}
          style={{ cursor: "pointer" }}
        >
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt="头像"
              className="wechat-me-avatar-img"
            />
          ) : (
            <span className="wechat-me-avatar-emoji">
              {userProfile.avatarEmoji || "👤"}
            </span>
          )}
        </div>
        <div className="wechat-me-info">
          <div className="wechat-me-name">我</div>
          <div className="wechat-me-id">微信号：softphone</div>
        </div>
      </div>

      {/* 功能列表 */}
      <div className="wechat-me-list">
        {/* 表情包 */}
        <div className="wechat-me-item" onClick={() => setMode("emojiPack")}>
          <div className="wechat-me-item-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8.5 8C9.33 8 10 8.67 10 9.5C10 10.33 9.33 11 8.5 11C7.67 11 7 10.33 7 9.5C7 8.67 7.67 8 8.5 8ZM15.5 8C16.33 8 17 8.67 17 9.5C17 10.33 16.33 11 15.5 11C14.67 11 14 10.33 14 9.5C14 8.67 14.67 8 15.5 8ZM12 17.5C9.24 17.5 6.83 15.89 5.75 13.5C5.83 13.5 5.92 13.5 6 13.5C8.21 13.5 10.1 14.81 11.25 16.75C11.5 17.17 11.75 17.5 12 17.5ZM12 17.5C12.25 17.5 12.5 17.17 12.75 16.75C13.9 14.81 15.79 13.5 18 13.5C18.08 13.5 18.17 13.5 18.25 13.5C17.17 15.89 14.76 17.5 12 17.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="wechat-me-item-content">
            <div className="wechat-me-item-title">表情包</div>
            <div className="wechat-me-item-sub">
              {userProfile.emojiGroups.length} 个表情包组
            </div>
          </div>
          <div className="wechat-me-item-arrow">›</div>
        </div>

        {/* 收藏 */}
        <div className="wechat-me-item" onClick={() => setMode("favorites")}>
          <div className="wechat-me-item-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="wechat-me-item-content">
            <div className="wechat-me-item-title">收藏</div>
            <div className="wechat-me-item-sub">我的收藏内容</div>
          </div>
          <div className="wechat-me-item-arrow">›</div>
        </div>

        {/* 钱包 */}
        <div className="wechat-me-item" onClick={() => setMode("wallet")}>
          <div className="wechat-me-item-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="wechat-me-item-content">
            <div className="wechat-me-item-title">钱包</div>
            <div className="wechat-me-item-sub">余额、支付、转账</div>
          </div>
          <div className="wechat-me-item-arrow">›</div>
        </div>

        {/* 亲属卡 */}
        <div className="wechat-me-item" onClick={() => setMode("familyCard")}>
          <div className="wechat-me-item-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V8H20V18ZM20 6H4V6H20V6ZM12 10H18V12H12V10ZM12 13H18V15H12V13Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="wechat-me-item-content">
            <div className="wechat-me-item-title">亲属卡</div>
            <div className="wechat-me-item-sub">管理亲属卡</div>
          </div>
          <div className="wechat-me-item-arrow">›</div>
        </div>
      </div>

      {/* 头像编辑弹窗 */}
      {editingAvatar && (
        <div
          className="settings-modal-backdrop"
          onClick={() => {
            setEditingAvatar(false);
            setAvatarInput("");
          }}
        >
          <div
            className="settings-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-title">设置头像</div>
            <div className="settings-modal-message">
              输入图片 URL 或上传本地图片
            </div>
            <input
              type="text"
              className="settings-input"
              placeholder="图片 URL 或粘贴图片"
              value={avatarInput}
              onChange={(e) => setAvatarInput(e.target.value)}
              onPaste={(e) => {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf("image") !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setAvatarInput(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                    break;
                  }
                }
              }}
            />
            <input
              type="file"
              accept="image/*"
              className="settings-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (event.target?.result) {
                      setAvatarInput(event.target.result as string);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <div className="settings-modal-actions">
              <button
                type="button"
                className="settings-btn settings-btn-secondary"
                onClick={() => {
                  setEditingAvatar(false);
                  setAvatarInput("");
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={handleAvatarSave}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

