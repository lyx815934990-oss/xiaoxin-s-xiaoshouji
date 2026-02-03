const mockNotes = [
  {
    id: 1,
    title: "把房间变成草莓牛奶云",
    desc: "用很便宜的小灯也能拍出软软糯糯的房间氛围。",
    tag: "房间改造"
  },
  {
    id: 2,
    title: "AI 帮我写的今日穿搭小作文",
    desc: "不知道怎么夸自己？交给 AI 来帮你写！",
    tag: "AI 穿搭文案"
  }
];

export function XiaohongshuScreen() {
  return (
    <div className="screen xiaohongshu-screen">
      <header className="screen-header">
        <div className="screen-title-main">小红书 · 软糖笔记</div>
        <div className="screen-title-sub">记录所有软糯糯的灵感，AI 也会来投稿</div>
      </header>
      <main className="screen-body xiaohongshu-body">
        <div className="note-grid">
          {mockNotes.map((note) => (
            <article key={note.id} className="note-card soft-hover-float">
              <div className="note-image-placeholder" />
              <div className="note-content">
                <div className="note-title">{note.title}</div>
                <div className="note-desc">{note.desc}</div>
                <div className="note-tag">#{note.tag}</div>
              </div>
            </article>
          ))}
        </div>
      </main>
      <footer className="screen-footer xiaohongshu-footer">
        <button className="primary-pill-btn">＋ 用 AI 生成一篇心情笔记</button>
      </footer>
    </div>
  );
}


