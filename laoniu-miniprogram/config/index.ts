import { defineConfig, type UserConfigExport } from "@tarojs/cli";

export default defineConfig<"webpack5">((merge) => {
  const config: UserConfigExport<"webpack5"> = {
    projectName: "老妞大人宠宠我",
    date: "2026-06-17",
    designWidth: 750,
    sourceRoot: "src",
    outputRoot: "dist",
    framework: "react",
    compiler: "webpack5",
    cache: { enable: false },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: { enable: false }
      }
    }
  };
  return merge({}, config);
});
