const mockItems = [
  {
    id: 1,
    name: "云朵抱枕",
    desc: "软软糯糯，像把整片云抱在怀里。",
    price: "¥59",
    tag: "治愈系"
  },
  {
    id: 2,
    name: "星星灯串",
    desc: "挂在床头，晚上会慢慢闪烁像小心愿。",
    price: "¥39",
    tag: "氛围感"
  }
];

export function ShoppingScreen() {
  return (
    <div className="screen shopping-screen">
      <header className="screen-header">
        <div className="screen-title-main">购物 · 软糯糯杂货铺</div>
        <div className="screen-title-sub">让 AI 帮你挑选今天需要的小可爱</div>
      </header>
      <main className="screen-body shopping-body">
        {mockItems.map((item) => (
          <div key={item.id} className="soft-card shopping-card">
            <div className="avatar-square" />
            <div className="shopping-card-main">
              <div className="shopping-name">{item.name}</div>
              <div className="shopping-desc">{item.desc}</div>
              <div className="shopping-meta">
                <span className="shopping-price">{item.price}</span>
                <span className="shopping-tag">#{item.tag}</span>
              </div>
            </div>
            <button className="soft-icon-btn">♡ 收进心愿单</button>
          </div>
        ))}
      </main>
      <footer className="screen-footer shopping-footer">
        <button className="primary-pill-btn">让 AI 给我生成一份心愿清单</button>
      </footer>
    </div>
  );
}


