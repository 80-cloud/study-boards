import { useEffect, useState } from "react";

// PCナビの様式（#381）。desktop で「上部ツールバー」と「サイドバー」を比較するための切替。
// モバイルは様式に関わらず上部セグメントを使う（サイドバーは desktop 限定）。
const NAV_LAYOUT_KEY = "term-board:navLayout:v1";
export type NavLayout = "toolbar" | "sidebar";

function initialLayout(): NavLayout {
  try {
    const saved = localStorage.getItem(NAV_LAYOUT_KEY);
    if (saved === "toolbar" || saved === "sidebar") return saved;
  } catch {
    // localStorage 不可でも続行
  }
  return "toolbar";
}

export function useNavLayout() {
  const [layout, setLayout] = useState<NavLayout>(initialLayout);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_LAYOUT_KEY, layout);
    } catch {
      // 保存失敗でも表示は継続
    }
  }, [layout]);

  const toggle = () => setLayout((l) => (l === "sidebar" ? "toolbar" : "sidebar"));

  return { layout, toggle };
}
