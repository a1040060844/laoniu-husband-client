import Taro from "@tarojs/taro";
import { Button } from "@tarojs/components";

export function ReturnButton({ label = "返回登录" }: { label?: string }) {
  return <Button className="btn btn-secondary" onClick={() => Taro.reLaunch({ url: "/pages/login/index" })}>{label}</Button>;
}
