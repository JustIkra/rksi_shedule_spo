import { FC } from 'react';
import '../styles/components/MonthTabs.css';

const TABS = [
  { value: 0, label: 'Весь год' },
  { value: 1, label: 'Январь' },
  { value: 2, label: 'Февраль' },
  { value: 3, label: 'Март' },
  { value: 4, label: 'Апрель' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июнь' },
  { value: 7, label: 'Июль' },
  { value: 8, label: 'Август' },
  { value: 9, label: 'Сентябрь' },
  { value: 10, label: 'Октябрь' },
  { value: 11, label: 'Ноябрь' },
  { value: 12, label: 'Декабрь' },
];

interface MonthTabsProps {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
}

const MonthTabs: FC<MonthTabsProps> = ({ selectedMonth, onMonthChange }) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(Number(e.target.value));
  };

  return (
    <>
      {/* Desktop: Horizontal scrollable tabs */}
      <div className="month-tabs-wrapper">
        <div
          className="month-tabs"
          role="tablist"
          aria-label="Выбор месяца"
        >
          {TABS.map(({ value, label }) => {
            const isActive = selectedMonth === value;
            const isAllYear = value === 0;

            return (
              <button
                key={value}
                role="tab"
                aria-selected={isActive}
                aria-controls={`month-panel-${value}`}
                tabIndex={isActive ? 0 : -1}
                className={`month-tabs__tab ${isActive ? 'month-tabs__tab--active' : ''} ${isAllYear ? 'month-tabs__tab--all-year' : ''}`}
                onClick={() => onMonthChange(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Native select dropdown */}
      <div className="month-select">
        <label htmlFor="month-select-input" className="month-select__label">
          Выберите месяц
        </label>
        <select
          id="month-select-input"
          className="month-select__input"
          value={selectedMonth}
          onChange={handleSelectChange}
          aria-label="Выбор месяца"
        >
          {TABS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="month-select__icon" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </>
  );
};

export default MonthTabs;
