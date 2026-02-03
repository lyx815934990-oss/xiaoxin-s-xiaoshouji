import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

type PageMode = "list" | "group" | "addEmoji";

export function EmojiPackPage() {
  const {
    userProfile,
    addEmojiGroup,
    updateEmojiGroup,
    removeEmojiGroup,
    addEmoji,
    updateEmoji,
    removeEmoji
  } = useSettings();
  const [mode, setMode] = useState<PageMode>("list");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [addingEmoji, setAddingEmoji] = useState(false);
  const [emojiName, setEmojiName] = useState("");
  const [emojiUrl, setEmojiUrl] = useState("");
  const [emojiType, setEmojiType] = useState<"static" | "gif">("static");

  const selectedGroup = selectedGroupId
    ? userProfile.emojiGroups.find((g) => g.id === selectedGroupId)
    : null;

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      addEmojiGroup(groupName.trim());
      setGroupName("");
      setCreatingGroup(false);
    }
  };

  const handleAddEmoji = () => {
    if (selectedGroupId && emojiName.trim() && emojiUrl.trim()) {
      addEmoji(selectedGroupId, {
        name: emojiName.trim(),
        url: emojiUrl.trim(),
        type: emojiType
      });
      setEmojiName("");
      setEmojiUrl("");
      setEmojiType("static");
      setAddingEmoji(false);
    }
  };

  const handlePasteImage = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setEmojiUrl(event.target.result as string);
              // 判断是否为gif
              if (file.type === "image/gif") {
                setEmojiType("gif");
              } else {
                setEmojiType("static");
              }
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEmojiUrl(event.target.result as string);
          // 判断是否为gif
          if (file.type === "image/gif") {
            setEmojiType("gif");
          } else {
            setEmojiType("static");
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (mode === "group" && selectedGroup) {
    return (
      <div className="emoji-pack-page">
        <div className="emoji-pack-header">
          <button
            type="button"
            className="emoji-pack-back-btn"
            onClick={() => {
              setMode("list");
              setSelectedGroupId(null);
            }}
          >
            ←
          </button>
          <div className="emoji-pack-title">{selectedGroup.name}</div>
          <button
            type="button"
            className="emoji-pack-add-btn"
            onClick={() => setAddingEmoji(true)}
          >
            ＋
          </button>
        </div>

        <div className="emoji-pack-content">
          {selectedGroup.emojis.length === 0 ? (
            <div className="emoji-pack-empty">
              <div className="emoji-pack-empty-decoration">
                <div className="emoji-pack-empty-star">✨</div>
                <div className="emoji-pack-empty-icon">😊</div>
                <div className="emoji-pack-empty-heart">💕</div>
              </div>
              <div className="emoji-pack-empty-title">还没有表情包</div>
              <div className="emoji-pack-empty-text">
                在这个组里添加你的第一个表情包吧～
              </div>
              <button
                type="button"
                className="emoji-pack-empty-btn"
                onClick={() => setAddingEmoji(true)}
              >
                <span className="emoji-pack-empty-btn-icon">＋</span>
                <span>添加表情包</span>
              </button>
            </div>
          ) : (
            <div className="emoji-pack-grid">
              {selectedGroup.emojis.map((emoji) => (
                <div key={emoji.id} className="emoji-pack-item">
                  <div className="emoji-pack-item-preview">
                    <img
                      src={emoji.url}
                      alt={emoji.name}
                      className="emoji-pack-item-img"
                    />
                    {emoji.type === "gif" && (
                      <div className="emoji-pack-item-badge">GIF</div>
                    )}
                    <button
                      type="button"
                      className="emoji-pack-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEmoji(selectedGroup.id, emoji.id);
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M18 6L6 18M6 6L18 18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="emoji-pack-item-name">{emoji.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {addingEmoji && (
          <div
            className="settings-modal-backdrop"
            onClick={() => {
              setAddingEmoji(false);
              setEmojiName("");
              setEmojiUrl("");
            }}
          >
            <div
              className="settings-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-modal-title">添加表情包</div>
              <div className="settings-modal-message">
                输入表情包名称和 URL，或上传本地图片
              </div>
              <input
                type="text"
                className="settings-input"
                placeholder="表情包名称"
                value={emojiName}
                onChange={(e) => setEmojiName(e.target.value)}
              />
              <input
                type="text"
                className="settings-input"
                placeholder="图片 URL 或粘贴图片"
                value={emojiUrl}
                onChange={(e) => setEmojiUrl(e.target.value)}
                onPaste={handlePasteImage}
              />
              <input
                type="file"
                accept="image/*"
                className="settings-file-input"
                onChange={handleFileUpload}
              />
              <div className="settings-input-group">
                <label className="settings-label">类型：</label>
                <select
                  className="settings-select"
                  value={emojiType}
                  onChange={(e) =>
                    setEmojiType(e.target.value as "static" | "gif")
                  }
                >
                  <option value="static">静态图片</option>
                  <option value="gif">动态 GIF</option>
                </select>
              </div>
              {emojiUrl && (
                <div className="emoji-preview">
                  <img
                    src={emojiUrl}
                    alt="预览"
                    className="emoji-preview-img"
                  />
                </div>
              )}
              <div className="settings-modal-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={() => {
                    setAddingEmoji(false);
                    setEmojiName("");
                    setEmojiUrl("");
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  onClick={handleAddEmoji}
                  disabled={!emojiName.trim() || !emojiUrl.trim()}
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="emoji-pack-page">
      <div className="emoji-pack-header">
        <div className="emoji-pack-title">表情包</div>
        {userProfile.emojiGroups.length > 0 && (
          <button
            type="button"
            className="emoji-pack-add-btn"
            onClick={() => setCreatingGroup(true)}
          >
            ＋
          </button>
        )}
      </div>

      <div className="emoji-pack-content">
        {userProfile.emojiGroups.length === 0 ? (
          <div className="emoji-pack-empty">
            <div className="emoji-pack-empty-decoration">
              <div className="emoji-pack-empty-star">✨</div>
              <div className="emoji-pack-empty-icon">😊</div>
              <div className="emoji-pack-empty-heart">💕</div>
            </div>
            <div className="emoji-pack-empty-title">还没有表情包组</div>
            <div className="emoji-pack-empty-text">
              创建你的第一个表情包组<br />
              开始收集可爱的表情吧～
            </div>
            <button
              type="button"
              className="emoji-pack-empty-btn"
              onClick={() => setCreatingGroup(true)}
            >
              <span className="emoji-pack-empty-btn-icon">＋</span>
              <span>新建表情包组</span>
            </button>
          </div>
        ) : (
          <div className="emoji-pack-list">
            {userProfile.emojiGroups.map((group) => (
              <div
                key={group.id}
                className="emoji-pack-group-item"
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setMode("group");
                }}
              >
                <div className="emoji-pack-group-icon-wrapper">
                  <div className="emoji-pack-group-icon">
                    {group.emojis.length > 0 ? (
                      <img
                        src={group.emojis[0].url}
                        alt={group.name}
                        className="emoji-pack-group-icon-img"
                      />
                    ) : (
                      <div className="emoji-pack-group-icon-placeholder">
                        <span>📦</span>
                      </div>
                    )}
                  </div>
                  {group.emojis.length > 0 && (
                    <div className="emoji-pack-group-badge">
                      {group.emojis.length}
                    </div>
                  )}
                </div>
                <div className="emoji-pack-group-info">
                  <div className="emoji-pack-group-name">{group.name}</div>
                  <div className="emoji-pack-group-count">
                    {group.emojis.length === 0
                      ? "还没有表情包"
                      : `${group.emojis.length} 个表情包`}
                  </div>
                </div>
                <div className="emoji-pack-group-arrow">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {creatingGroup && (
        <div
          className="settings-modal-backdrop"
          onClick={() => {
            setCreatingGroup(false);
            setGroupName("");
          }}
        >
          <div
            className="settings-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-title">新建表情包组</div>
            <div className="settings-modal-message">输入表情包组的名称</div>
            <input
              type="text"
              className="settings-input"
              placeholder="表情包组名称"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateGroup();
                }
              }}
            />
            <div className="settings-modal-actions">
              <button
                type="button"
                className="settings-btn settings-btn-secondary"
                onClick={() => {
                  setCreatingGroup(false);
                  setGroupName("");
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

