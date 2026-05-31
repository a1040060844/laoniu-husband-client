import type { Role } from "../types/domain";
import { expRequiredForLevel, salaryForLevel } from "../game/progression";

const roleImage = (level: number) => `/assets/roles/role-${String(level).padStart(2, "0")}.png`;
const benefitImage = (level: number) => `/assets/benefits/benefit-${String(level).padStart(2, "0")}.png`;

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
  createRole(0, "流落街头", "一个惹恼了大人物被逐出家门的小可怜，只能靠微薄救济勉强维持生计，随时面临被遗忘的风险。"),
  createRole(1, "落魄女仆", "一个流落街头、身无分文，被老妞大人好心收留的女仆，连规矩都还没学会。"),
  createRole(2, "心酸保安", "被安排守门的边缘保安，日夜站岗却无人问津，偶尔还要被嫌弃站姿不标准。"),
  createRole(3, "见习女仆", "刚刚开始学习服侍之道的新人，动作笨拙但态度尚可，仍在观察期。"),
  createRole(4, "见习侍从", "已能完成基础差事的小跟班，虽然不出彩，但总算不再频繁犯错。"),
  createRole(5, "贴身侍卫", "被允许靠近核心区域的护卫，职责是随叫随到，但还谈不上完全信任。"),
  createRole(6, "贴身女婢", "开始参与日常贴身事务的侍从，逐渐摸清老妞大人的生活节奏。"),
  createRole(7, "管事助理", "能独立处理小事务的执行者，已经可以分担部分压力，但仍需指示。"),
  createRole(8, "内务主事", "开始掌管部分内务的小负责人，对日常运作已有一定掌控能力。"),
  createRole(9, "贴身秘书", "负责协调事务与安排的核心助手，已经成为不可或缺的存在。"),
  createRole(10, "首席管家", "统筹全局、调度资源的关键人物，几乎可以代替老妞大人处理一切事务。"),
  createRole(11, "大内总管", "一人之下的最高掌权者，深受信任，既能掌控全局，也拥有一定的反向话语权。"),
];
