const mockShops = [
  {
    id: 1,
    name: "棉花糖便当铺",
    desc: "软软糯糯治愈便当，每一口都是拥抱。",
    tag: "今日 AI 特调菜单",
    time: "30 分钟内送达"
  },
  {
    id: 2,
    name: "梦泡泡奶茶屋",
    desc: "AI 推荐心情奶茶，帮你选今天的颜色。",
    tag: "AI 心情奶茶",
    time: "45 分钟内送达"
  }
];

export function FoodDeliveryScreen() {
  return (
    <div className="screen food-screen">
      <header className="screen-header">
        <div className="screen-title-main">外卖 · 今日小确幸</div>
        <div className="screen-title-sub">让 AI 帮你挑一份适合今天心情的甜甜外卖</div>
      </header>
      <main className="screen-body food-body">
        {mockShops.map((shop) => (
          <div key={shop.id} className="soft-card food-card">
            <div className="soft-card-header">
              <div className="avatar-square" />
              <div className="soft-card-header-text">
                <div className="soft-card-title">{shop.name}</div>
                <div className="soft-card-subtitle">{shop.tag}</div>
              </div>
            </div>
            <p className="soft-card-content">{shop.desc}</p>
            <div className="soft-card-footer">
              <span className="soft-card-meta">{shop.time}</span>
              <button className="primary-pill-btn">用 AI 帮我生成一份点单</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}


