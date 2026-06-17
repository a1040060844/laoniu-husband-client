import type { Role } from "../types/domain";
import { expRequiredForLevel, salaryForLevel } from "../game/progression";
import { publicAsset } from "../lib/assets";

const roleImage = (level: number) =>
  publicAsset(`/assets/roles/role-${String(level).padStart(2, "0")}.png`);
const benefitImage = (level: number) =>
  publicAsset(`/assets/benefits/benefit-${String(level).padStart(2, "0")}.png`);

function createRole(level: number, title: string, biography: string): Role {
  return {
    level,
    title,
    salary: salaryForLevel(level),
    expCurrent: 0,
    expRequired: expRequiredForLevel(level),
    biography,
    roleImage: roleImage(level),
    benefitImage: benefitImage(level),
  };
}

export const roles: Role[] = [
  createRole(
    0,
    "流落街头",
    "一个惹恼了大人物、被逐出家门的小可怜，只能靠微薄救济勉强维持生活，随时面临被遗忘的风险。",
  ),
  createRole(
    1,
    "落魄女仆",
    "被老妞大人好心收留的新手仆从，规矩还没学全，日常表现全靠态度补救。",
  ),
  createRole(
    2,
    "心酸保安",
    "负责守门和跑腿的边缘岗位，站岗认真但地位有限，需要继续证明可靠程度。",
  ),
  createRole(
    3,
    "见习女仆",
    "刚开始学习服侍之道的新人，动作略显笨拙，但态度尚可，仍在观察期。",
  ),
  createRole(
    4,
    "见习侍从",
    "已经能完成基础差事的小跟班，虽然不算出彩，但总算不再频繁犯错。",
  ),
  createRole(
    5,
    "贴身侍卫",
    "被允许靠近核心区域的护卫，职责是随叫随到，但还谈不上完全信任。",
  ),
  createRole(
    6,
    "贴身女婿",
    "开始参与日常贴身事务的侍从，逐渐摸清老妞大人的生活节奏。",
  ),
  createRole(
    7,
    "管事助理",
    "能够独立处理小事务的执行者，已经可以分担部分压力，但仍需请示。",
  ),
  createRole(
    8,
    "内务主事",
    "开始掌管部分内务的小负责人，对日常运作已有一定掌控能力。",
  ),
  createRole(
    9,
    "贴身秘书",
    "负责协调事务与安排的核心助手，已经成为不可或缺的存在。",
  ),
  createRole(
    10,
    "首席管家",
    "统筹全局、调度资源的关键人物，几乎可以代替老妞大人处理大多数事务。",
  ),
  createRole(
    11,
    "大内总管",
    "一人之下的最高掌权者，深受信任，既能掌控全局，也拥有一定的反向话语权。",
  ),
];
