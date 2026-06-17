import test from "node:test";
import assert from "node:assert/strict";
import { grantExperience, initialProgress, salaryForLevel } from "../src/game/progression.ts";

const roles = Array.from({ length: 12 }).map((_, level) => ({
  level,
  title: `Lv${level}`,
  salary: salaryForLevel(level),
  expCurrent: 0,
  expRequired: 100,
  biography: "",
  roleImage: "",
  benefitImage: ""
}));

test("salary follows Lv0 and Lv1-Lv11 rules", () => {
  assert.equal(salaryForLevel(0), 100);
  assert.equal(salaryForLevel(1), 280);
  assert.equal(salaryForLevel(11), 480);
});

test("experience levels up at 100 exp per level", () => {
  const result = grantExperience({ ...initialProgress, level: 1, exp: 90 }, 15, roles, "test");
  assert.equal(result.progress.level, 2);
  assert.equal(result.progress.exp, 5);
});
