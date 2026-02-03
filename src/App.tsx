import { useState } from "react";
import { PhoneLayout } from "./layouts/PhoneLayout";
import { HomeScreen } from "./screens/home/HomeScreen";
import { WeChatScreen } from "./screens/wechat/WeChatScreen";
import { WeiboScreen } from "./screens/weibo/WeiboScreen";
import { FoodDeliveryScreen } from "./screens/food/FoodDeliveryScreen";
import { XiaohongshuScreen } from "./screens/xiaohongshu/XiaohongshuScreen";
import { ShoppingScreen } from "./screens/shopping/ShoppingScreen";
import { SettingsScreen } from "./screens/settings/SettingsScreen";
import { WorldbookScreen } from "./screens/worldbook/WorldbookScreen";

export type AppId =
  | "wechat"
  | "weibo"
  | "food"
  | "xiaohongshu"
  | "shopping"
  | "worldbook"
  | "settings";
export type ViewId = "home" | AppId;

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>("home");

  const renderScreen = () => {
    if (activeView === "home") {
      return <HomeScreen onOpenApp={(id) => setActiveView(id)} />;
    }

    switch (activeView) {
      case "wechat":
        return <WeChatScreen />;
      case "weibo":
        return <WeiboScreen />;
      case "food":
        return <FoodDeliveryScreen />;
      case "xiaohongshu":
        return <XiaohongshuScreen />;
      case "shopping":
        return <ShoppingScreen />;
      case "worldbook":
        return <WorldbookScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return null;
    }
  };

  return (
    <PhoneLayout view={activeView} onBackHome={() => setActiveView("home")}>
      {renderScreen()}
    </PhoneLayout>
  );
}


