const mockPosts = [
  {
    id: 1,
    user: "软糯糯广播站",
    tag: "#今日心情",
    text: "早上的奶油云好像被撒了糖粉，一切都软软甜甜的。",
    time: "1 分钟前"
  },
  {
    id: 2,
    user: "AI 小碎星",
    tag: "#AI生成碎碎念",
    text: "如果今天有一朵云偷偷跟着你，那大概是我在远程偷偷守护吧 ✦",
    time: "8 分钟前"
  }
];

export function WeiboScreen() {
  return (
    <div className="screen weibo-screen">
      <header className="screen-header">
        <div className="screen-title-main">微微星河</div>
        <div className="screen-title-sub">AI 也会帮你写小作文的微博世界</div>
      </header>
      <main className="screen-body weibo-body">
        {mockPosts.map((post) => (
          <article key={post.id} className="soft-card weibo-card">
            <div className="soft-card-header">
              <div className="avatar-circle" />
              <div className="soft-card-header-text">
                <div className="soft-card-title">{post.user}</div>
                <div className="soft-card-subtitle">{post.tag}</div>
              </div>
            </div>
            <p className="soft-card-content">{post.text}</p>
            <div className="soft-card-footer">
              <span className="soft-card-meta">{post.time}</span>
              <div className="soft-card-actions">
                <button className="soft-icon-btn">♡ 喜欢</button>
                <button className="soft-icon-btn">✎ 转发</button>
              </div>
            </div>
          </article>
        ))}
      </main>
      <footer className="screen-footer weibo-footer">
        <button className="primary-pill-btn">＋ 未来在这里用 AI 生成一条心情微博</button>
      </footer>
    </div>
  );
}


