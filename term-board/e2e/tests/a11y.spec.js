import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// @a11y：WCAG 監査。手動 Lighthouse A11y=100 を自動化し、主要ビューの
// critical 違反ゼロを保証する（serious 以下は可視化のためログのみ）。
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  const serious = results.violations.filter((v) => v.impact === 'serious');
  if (serious.length) {
    console.log('a11y serious violations:', serious.map((v) => `${v.id} (${v.nodes.length})`).join(', '));
  }
  return { critical };
}

// グループnav経由で各モードへ遷移する小ヘルパー。
async function openMode(page, group, mode) {
  await page.getByRole('button', { name: group, exact: true }).click();
  if (mode) await page.getByRole('button', { name: mode, exact: true }).click();
}

test.describe('accessibility @a11y', () => {
  test('ホームに critical な a11y 違反が無い', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /面接で言える/ })).toBeVisible();
    const { critical } = await scan(page);
    expect(critical, critical.map((v) => v.id).join(', ')).toEqual([]);
  });

  test('4択クイズに critical な a11y 違反が無い', async ({ page }) => {
    await page.goto('/');
    await openMode(page, '覚える', '4択クイズ');
    await expect(page.getByRole('heading', { name: /の意味は/ })).toBeVisible();
    const { critical } = await scan(page);
    expect(critical, critical.map((v) => v.id).join(', ')).toEqual([]);
  });

  test('用語辞典に critical な a11y 違反が無い', async ({ page }) => {
    await page.goto('/');
    await openMode(page, '覚える', '用語辞典');
    const { critical } = await scan(page);
    expect(critical, critical.map((v) => v.id).join(', ')).toEqual([]);
  });

  test('面接練習に critical な a11y 違反が無い', async ({ page }) => {
    await page.goto('/');
    await openMode(page, '面接対策', '面接練習');
    await expect(page.getByRole('button', { name: /模範回答を見る/ })).toBeVisible();
    const { critical } = await scan(page);
    expect(critical, critical.map((v) => v.id).join(', ')).toEqual([]);
  });

  test('学ぶに critical な a11y 違反が無い', async ({ page }) => {
    await page.goto('/');
    await openMode(page, '学ぶ・記録', '学ぶ');
    const { critical } = await scan(page);
    expect(critical, critical.map((v) => v.id).join(', ')).toEqual([]);
  });
});
