import { Text } from "@tarojs/components";

export function CountUp({
  minimumIntegerDigits,
  value,
}: {
  minimumIntegerDigits?: number;
  value: number;
}) {
  const text = String(Math.trunc(value)).padStart(minimumIntegerDigits || 1, "0");
  return <Text>{text}</Text>;
}
