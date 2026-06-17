import Taro from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";
import { DesignStage } from "../../components/DesignStage";
import { SpriteActor } from "../../components/SpriteActor";
import { loginAsset } from "../../services/assets";
import "./index.scss";

function enter(role: "husband" | "wife") {
  Taro.navigateTo({ url: `/pages/loading/index?target=${role}` });
}

export default function LoginPage() {
  return (
    <DesignStage className="login-page">
      <Image className="login-page__bg" src={loginAsset("bg-room.png")} mode="aspectFill" />
      <View className="login-page__shade" />
      <View className="login-page__content">
        <Image className="login-page__title-image pixelated" src={loginAsset("title.png")} mode="aspectFit" />
        <Image className="login-page__subtitle-image pixelated" src={loginAsset("subtitle.png")} mode="aspectFit" />
        <Text className="login-page__days">纪念日 · 本地迁移版</Text>
        <View className="login-page__cards">
          <View className="login-card panel">
            <SpriteActor src={loginAsset("husband.png")} />
            <Button className="btn" onClick={() => enter("husband")}>我是老公</Button>
          </View>
          <View className="login-card panel">
            <SpriteActor src={loginAsset("wife.png")} />
            <Button className="btn" onClick={() => enter("wife")}>我是老婆</Button>
          </View>
        </View>
        <Image className="login-page__cat pixelated" src={loginAsset("cat-blue.png")} mode="aspectFit" />
        <Button className="login-page__reset btn btn-secondary" onClick={() => Taro.showToast({ title: "本地数据可在老婆端重置", icon: "none" })}>重置</Button>
      </View>
    </DesignStage>
  );
}
