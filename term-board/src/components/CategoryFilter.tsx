type Props = {
  categories: string[];
  value: string; // "" = 全分野
  onChange: (category: string) => void;
};

// F-QUIZ-04: 分野を絞る／全分野ランダムを選べる。
export function CategoryFilter({ categories, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="category-select" className="text-sm font-medium text-label-2">
        分野
      </label>
      <select
        id="category-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-control border border-separator bg-surface px-3 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <option value="">全分野（ランダム）</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
