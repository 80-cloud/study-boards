type Props = {
  categories: string[];
  value: string; // "" = 全分野
  onChange: (category: string) => void;
};

// F-QUIZ-04: 分野を絞る／全分野ランダムを選べる。
export function CategoryFilter({ categories, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="category-select" className="text-sm font-medium text-slate-600 dark:text-slate-300">
        分野
      </label>
      <select
        id="category-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
