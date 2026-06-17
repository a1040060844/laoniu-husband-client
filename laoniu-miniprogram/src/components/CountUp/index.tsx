import { Text } from "@tarojs/components";

export function CountUp({ value }: { value: number }) {
  return <Text>{Math.trunc(value)}</Text>;
}
