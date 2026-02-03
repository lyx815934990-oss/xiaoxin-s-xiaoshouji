import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

export function WorldbookScreen() {
  const { worldbookEntries, addWorldbookEntry, removeWorldbookEntry } = useSettings();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleStartCreate = () => {
    setEditing(true);
    setTitle("");
    setContent("");
  };

  const handleSave = () => {
    const t = title.trim() || "未命名世界";
    const c = content.trim();
    if (!c) return;
    addWorldbookEntry({ title: t, content: c });
    setEditing(false);
    setTitle("");
    setContent("");
  };

  const hasEntries = worldbookEntries.length > 0;

  return (
    <div className="screen settings-screen">
      <header className="screen-header">
        <div className="screen-title-main">世界书 · 乙女设定集</div>
        <div className="screen-title-sub">这里是专属的世界书 App，小手机会悄悄记住一切</div>
      </header>
      <main className="screen-body settings-body">
        {!hasEntries && !editing && (
          <section className="soft-card settings-section">
            <p className="soft-card-content">
              还没有任何世界书记录，点击下面的按钮，新建你的第一本乙女世界书吧。
            </p>
            <button className="primary-pill-btn" type="button" onClick={handleStartCreate}>
              ＋ 新建世界书
            </button>
          </section>
        )}

        {hasEntries && (
          <section className="soft-card settings-section">
            <div className="soft-card-header-text">
              <div className="soft-card-title">已有世界书</div>
              <div className="soft-card-subtitle">点击下方按钮可以继续追加新的世界书</div>
            </div>
            {worldbookEntries.map((entry) => (
              <div key={entry.id} className="settings-field">
                <div className="settings-label">{entry.title}</div>
                <div className="settings-textarea" style={{ whiteSpace: "pre-wrap" }}>
                  {entry.content}
                </div>
                <button
                  type="button"
                  className="soft-icon-btn"
                  onClick={() => removeWorldbookEntry(entry.id)}
                >
                  删除这本世界书
                </button>
              </div>
            ))}
            <div className="settings-field">
              <button className="primary-pill-btn" type="button" onClick={handleStartCreate}>
                ＋ 追加一篇新的世界书
              </button>
            </div>
          </section>
        )}

        {editing && (
          <section className="soft-card settings-section">
            <div className="soft-card-header-text">
              <div className="soft-card-title">新建世界书</div>
              <div className="soft-card-subtitle">给这本世界书起个名字，再写下详细设定</div>
            </div>
            <div className="settings-field">
              <label className="settings-label">世界书名称</label>
              <input
                className="settings-input"
                placeholder="例如：樱花小镇 / 冬日咖啡馆 / 魔法学院"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">世界书内容</label>
              <textarea
                className="settings-textarea"
                placeholder="这里可以写世界观、人物设定、关系网、关键事件等等…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="settings-field settings-model-row">
              <button className="primary-pill-btn" type="button" onClick={handleSave}>
                保存这本世界书
              </button>
              <button
                className="soft-icon-btn"
                type="button"
                onClick={() => setEditing(false)}
              >
                先不写了
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

