export default defineAppConfig({
  pages: [
    "pages/login/index",
    "pages/loading/index"
  ],
  subpackages: [
    {
      root: "subpackages/husband",
      pages: [
        "pages/role/index",
        "pages/benefit/index",
        "pages/task/index",
        "pages/slave/index",
        "pages/wallet/index"
      ]
    },
    {
      root: "subpackages/wife",
      pages: [
        "pages/dashboard/index",
        "pages/task-create/index",
        "pages/review/index",
        "pages/decrees/index",
        "pages/logs/index"
      ]
    }
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#fff4e5",
    navigationBarTitleText: "老妞大人宠宠我",
    navigationBarTextStyle: "black"
  }
});
