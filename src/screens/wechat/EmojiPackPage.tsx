import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

type PageMode = "list" | "group" | "addEmoji";

interface EmojiPackPageProps {
  onBack?: () => void;
}

export function EmojiPackPage({ onBack }: EmojiPackPageProps) {
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
        <div className="emoji-pack-header emoji-pack-header-decorated">
          <div className="emoji-pack-header-spacer">
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
          </div>
          <div className="emoji-pack-title">{selectedGroup.name}</div>
          <div className="emoji-pack-header-right">
            <button
              type="button"
              className="emoji-pack-add-btn emoji-pack-add-btn-styled"
              onClick={() => setAddingEmoji(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="emoji-pack-content">
          {selectedGroup.emojis.length === 0 ? (
            <div className="emoji-pack-empty">
              <div className="emoji-pack-empty-text">还没有表情包</div>
              <button
                type="button"
                className="emoji-pack-empty-btn emoji-pack-empty-btn-styled"
                onClick={() => setAddingEmoji(true)}
              >
                <span className="btn-icon">＋</span>
                <span>添加表情包</span>
              </button>
            </div>
          ) : (
            <div className="emoji-pack-grid">
              {selectedGroup.emojis.map((emoji) => (
                <div key={emoji.id} className="emoji-pack-item">
                  <div className="emoji-pack-item-preview">
                    {emoji.type === "gif" ? (
                      <img
                        src={emoji.url}
                        alt={emoji.name}
                        className="emoji-pack-item-img"
                      />
                    ) : (
                      <img
                        src={emoji.url}
                        alt={emoji.name}
                        className="emoji-pack-item-img"
                      />
                    )}
                    {emoji.type === "gif" && (
                      <div className="emoji-pack-item-badge">GIF</div>
                    )}
                  </div>
                  <div className="emoji-pack-item-name">{emoji.name}</div>
                  <button
                    type="button"
                    className="emoji-pack-item-delete"
                    onClick={() => removeEmoji(selectedGroup.id, emoji.id)}
                  >
                    ×
                  </button>
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
      <div className="emoji-pack-header emoji-pack-header-decorated">
        <div className="emoji-pack-header-spacer">
          {onBack && (
            <button
              type="button"
              className="emoji-pack-back-btn"
              onClick={onBack}
            >
              ←
            </button>
          )}
        </div>
        <div className="emoji-pack-title">表情包</div>
        <div className="emoji-pack-header-right">
          {userProfile.emojiGroups.length > 0 && (
            <button
              type="button"
              className="emoji-pack-add-btn emoji-pack-add-btn-styled"
              onClick={() => setCreatingGroup(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="emoji-pack-content">
        {userProfile.emojiGroups.length === 0 ? (
          <div className="emoji-pack-empty emoji-pack-empty-decorated">
            <div className="emoji-pack-empty-text">还没有表情包组</div>
            <div className="emoji-pack-empty-subtext">创建你的第一个表情包组，开始收集可爱的表情吧～</div>
            <button
              type="button"
              className="emoji-pack-empty-btn emoji-pack-empty-btn-styled"
              onClick={() => setCreatingGroup(true)}
            >
              <span className="btn-icon">＋</span>
              <span>新建表情包组</span>
            </button>
          </div>
        ) : (
          <div className="emoji-pack-list">
            {userProfile.emojiGroups.map((group) => (
              <div
                key={group.id}
                className="emoji-pack-group-card"
              >
                <div
                  className="emoji-pack-group-card-main"
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setMode("group");
                  }}
                >
                  <div className="emoji-pack-group-preview">
                    {group.emojis.length > 0 ? (
                      <div className="emoji-pack-group-preview-grid">
                        {group.emojis.slice(0, 4).map((emoji, idx) => (
                          <div key={emoji.id} className="emoji-pack-group-preview-item">
                            <img
                              src={emoji.url}
                              alt={emoji.name}
                              className="emoji-pack-group-preview-img"
                            />
                            {emoji.type === "gif" && (
                              <div className="emoji-pack-group-preview-badge">GIF</div>
                            )}
                          </div>
                        ))}
                        {group.emojis.length > 4 && (
                          <div className="emoji-pack-group-preview-more">
                            +{group.emojis.length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="emoji-pack-group-preview-empty">
                        <span className="emoji-pack-group-preview-empty-icon">📦</span>
                        <span className="emoji-pack-group-preview-empty-text">暂无表情</span>
                      </div>
                    )}
                  </div>
                  <div className="emoji-pack-group-card-info">
                    <div className="emoji-pack-group-card-header">
                      <div className="emoji-pack-group-card-name">{group.name}</div>
                      {group.emojis.length > 0 && (
                        <div className="emoji-pack-group-card-count">
                          {group.emojis.length}
                        </div>
                      )}
                    </div>
                    <div className="emoji-pack-group-card-subtitle">
                      {group.emojis.length > 0
                        ? `${group.emojis.length} 个表情包`
                        : "点击添加表情包"}
                    </div>
                  </div>
                  <div className="emoji-pack-group-card-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="emoji-pack-group-card-actions">
                  <button
                    type="button"
                    className="emoji-pack-group-action-btn emoji-pack-group-edit-btn"
                    onClick={() => {
                      // TODO: 实现编辑功能
                    }}
                    title="编辑"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="emoji-pack-group-action-btn emoji-pack-group-delete-btn"
                    onClick={() => {
                      if (confirm(`确定要删除表情包组"${group.name}"吗？`)) {
                        removeEmojiGroup(group.id);
                      }
                    }}
                    title="删除"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
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

