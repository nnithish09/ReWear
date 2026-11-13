import { RotateCcw } from 'lucide-react';
import { CATEGORIES, OCCASIONS, STATUSES } from '../utils/constants';

function Select({ label, value, onChange, options, allLabel }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {allLabel && <option value="All">{allLabel}</option>}
        {options.map(({ value: optionValue, label: optionLabel }) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

const toOptions = (list) => list.map((entry) => ({ value: entry, label: entry }));

export default function FilterPanel({ filters, onChange, colorOptions, onReset, hasActiveFilters }) {
  const update = (key) => (value) => onChange({ ...filters, [key]: value });

  return (
    <div className="card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Category"
          value={filters.category}
          onChange={update('category')}
          options={toOptions(CATEGORIES)}
          allLabel="All categories"
        />
        <Select
          label="Color"
          value={filters.color}
          onChange={update('color')}
          options={toOptions(colorOptions)}
          allLabel="All colors"
        />
        <Select
          label="Occasion"
          value={filters.occasion}
          onChange={update('occasion')}
          options={toOptions(OCCASIONS)}
          allLabel="All occasions"
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={update('status')}
          options={toOptions(STATUSES)}
          allLabel="All statuses"
        />
        <Select
          label="Sort by"
          value={filters.sort}
          onChange={update('sort')}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
          ]}
        />
      </div>
      {hasActiveFilters && (
        <button onClick={onReset} className="btn-ghost mt-3 !px-2 !py-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Reset filters
        </button>
      )}
    </div>
  );
}
