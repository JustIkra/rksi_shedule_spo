import { FC, useState, useEffect, useRef, useCallback } from 'react';
import '../styles/components/SearchInput.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  showKeyboardHint?: boolean;
}

const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Поиск по названию, организатору...',
  debounceMs = 300,
  showKeyboardHint = true,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isMac, setIsMac] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'));
  }, []);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (localValue) {
          setLocalValue('');
          onChange('');
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localValue, onChange]);

  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasValue = localValue.length > 0;

  return (
    <div className={`search-input${hasValue ? ' search-input--has-value' : ''}`}>
      <div className="search-input__wrapper">
        <span className="search-input__icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path
              d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          className="search-input__field"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {hasValue ? (
          <button
            type="button"
            className="search-input__clear"
            onClick={handleClear}
            aria-label="Очистить поиск"
          >
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          showKeyboardHint && (
            <span className="search-input__hint" aria-hidden="true">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          )
        )}
      </div>
    </div>
  );
};

export default SearchInput;
