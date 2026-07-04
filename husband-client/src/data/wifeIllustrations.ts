export interface WifeIllustrationSet {
  growthPath: string;
  growthOffsetY?: number;
  homePath?: string;
  subpageOffsetY?: number;
  todayPath: string;
  todayOffsetY?: number;
}

export interface WifeHomeIllustrationTransition {
  fromHomePath: string;
  toHomePath: string;
}

interface WifeLevelIllustration extends WifeIllustrationSet {
  maxLevel: number;
  minLevel: number;
}

export const wifeTaskCompleteIllustration: Required<WifeIllustrationSet> = {
  growthPath: "/assets/wife/wife-task-complete-growth.png",
  growthOffsetY: 0,
  homePath: "/assets/wife/wife-task-complete-home.png",
  subpageOffsetY: 0,
  todayPath: "/assets/wife/wife-task-complete-today.png",
  todayOffsetY: 0,
};

export const wifeLevelIllustrations: WifeLevelIllustration[] = [
  {
    growthPath: "/assets/wife/wife-growth-level-03-04.png",
    growthOffsetY: 30,
    homePath: "/assets/wife/wife-home-level-03-04.png",
    maxLevel: 4,
    minLevel: 3,
    todayPath: "/assets/wife/wife-today-level-03-04.png",
  },
  {
    growthPath: "/assets/wife/wife-growth-level-05-06.png",
    growthOffsetY: 30,
    homePath: "/assets/wife/wife-home-level-05-06.png",
    maxLevel: 6,
    minLevel: 5,
    todayPath: "/assets/wife/wife-today-level-05-06.png",
  },
  {
    growthPath: "/assets/wife/wife-growth-level-07-08.png",
    growthOffsetY: 30,
    homePath: "/assets/wife/wife-home-level-07-08.png",
    maxLevel: 8,
    minLevel: 7,
    todayPath: "/assets/wife/wife-today-level-07-08.png",
  },
  {
    growthPath: "/assets/wife/wife-growth-level-09-10.png",
    homePath: "/assets/wife/wife-home-level-09-10.png",
    maxLevel: 10,
    minLevel: 9,
    todayPath: "/assets/wife/wife-today-level-09-10.png",
  },
  {
    growthPath: "/assets/wife/wife-growth-level-11.png",
    growthOffsetY: 28,
    homePath: "/assets/wife/wife-home-level-11.png",
    maxLevel: 11,
    minLevel: 11,
    subpageOffsetY: -150,
    todayPath: "/assets/wife/wife-today-level-11.png",
    todayOffsetY: -150,
  },
];

export function wifeIllustrationForLevel(level: number) {
  return wifeLevelIllustrations.find(
    (illustration) =>
      level >= illustration.minLevel && level <= illustration.maxLevel,
  );
}

export function wifeHomeIllustrationTransitionForLevelChange(
  fromLevel: number,
  toLevel: number,
): WifeHomeIllustrationTransition | null {
  if (toLevel <= fromLevel) return null;

  const fromHomePath = wifeIllustrationForLevel(fromLevel)?.homePath;
  const toHomePath = wifeIllustrationForLevel(toLevel)?.homePath;
  if (!fromHomePath || !toHomePath || fromHomePath === toHomePath) return null;

  return { fromHomePath, toHomePath };
}
