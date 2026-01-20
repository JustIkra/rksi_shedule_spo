import { FC } from 'react';

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
  return (
    <div className="month-tabs">
      {MONTHS.map((name, index) => (
        <button
          key={index}
          className={`month-tab ${selectedMonth === index + 1 ? 'active' : ''}`}
          onClick={() => onMonthChange(index + 1)}
        >
          {name}
        </button>
      ))}
    </div>
  );
};

export default MonthTabs;
