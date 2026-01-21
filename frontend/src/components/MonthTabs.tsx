import { FC } from 'react';
import '../styles/components/MonthTabs.css';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель',
  'Май', 'Июнь', 'Июль', 'Август',
  'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
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
      <div
        className="month-tabs"
        role="tablist"
        aria-label="Выбор месяца"
      >
        {MONTHS.map((name, index) => {
          const monthNumber = index + 1;
          const isActive = selectedMonth === monthNumber;

          return (
            <button
              key={monthNumber}
              role="tab"
              aria-selected={isActive}
              aria-controls={`month-panel-${monthNumber}`}
              tabIndex={isActive ? 0 : -1}
              className={`month-tabs__tab ${isActive ? 'month-tabs__tab--active' : ''}`}
              onClick={() => onMonthChange(monthNumber)}
            >
              {name}
            </button>
          );
        })}
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
          {MONTHS.map((name, index) => {
            const monthNumber = index + 1;
            return (
              <option key={monthNumber} value={monthNumber}>
                {name}
              </option>
            );
          })}
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
