import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../../i18n';
import './SearchableSelect.css';

/**
 * Accessible, mobile-friendly Searchable Select Dropdown
 * Handles 44,929 village and taluka lists smoothly with incremental rendering,
 * Marathi/English/LGD search, and guaranteed selected item visibility.
 */
export function SearchableSelect({
  id,
  label,
  options = [],
  value,
  onChange,
  placeholder = null,
  searchPlaceholder = null,
  disabled = false,
  loading = false,
  error = null,
  badge = null,
  onRetry = null
}) {
  const { t, isMarathi } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50);
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const defaultPlaceholder = placeholder || t('select.placeholder');
  const defaultSearchPlaceholder = searchPlaceholder || t('select.searchPlaceholder');

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setDisplayLimit(50);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setDisplayLimit(50);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

  const safeOptions = Array.isArray(options) ? options : [];

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return safeOptions.find((opt) => String(opt.value) === String(value)) || null;
  }, [safeOptions, value]);

  // Robust search filtering across English, Marathi, Code, and Keywords
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return safeOptions;

    const query = searchTerm.trim().toLowerCase();
    return safeOptions.filter((opt) => {
      // 1. Check English label
      if (opt.label && opt.label.toLowerCase().includes(query)) return true;

      // 2. Check Marathi label
      if (opt.marathiLabel && opt.marathiLabel.toLowerCase().includes(query)) return true;

      // 3. Check LGD code / value
      if (opt.value && String(opt.value).toLowerCase().includes(query)) return true;
      if (opt.code && String(opt.code).toLowerCase().includes(query)) return true;

      // 4. Check extra keywords
      if (opt.keywords && opt.keywords.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [safeOptions, searchTerm]);

  // Guaranteed Selected Item Visibility:
  const displayedOptions = useMemo(() => {
    const sliced = filteredOptions.slice(0, displayLimit);

    if (selectedOption && !sliced.some((opt) => String(opt.value) === String(selectedOption.value))) {
      return [selectedOption, ...sliced];
    }

    return sliced;
  }, [filteredOptions, displayLimit, selectedOption]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setDisplayLimit(50);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const handleShowMore = (e) => {
    e.stopPropagation();
    setDisplayLimit((prev) => prev + 50);
  };

  const handleShowAll = (e) => {
    e.stopPropagation();
    setDisplayLimit(filteredOptions.length);
  };

  return (
    <div
      className={`searchable-select ${disabled ? 'searchable-select--disabled' : ''} ${
        isOpen ? 'searchable-select--open' : ''
      }`}
      ref={wrapperRef}
    >
      {label && (
        <label htmlFor={id} className="searchable-select__label">
          <span>{label}</span>
          {badge && <span className="select-count-badge">{badge}</span>}
        </label>
      )}

      {/* Main Trigger Box */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={`searchable-select__trigger ${error ? 'trigger--error' : ''}`}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <div className="trigger__content">
          {selectedOption ? (
            <span className="trigger__selected-text">
              <strong>{selectedOption.label}</strong>
              {selectedOption.marathiLabel && selectedOption.marathiLabel !== selectedOption.label && (
                <span className="trigger__marathi-sub"> ({selectedOption.marathiLabel})</span>
              )}
            </span>
          ) : (
            <span className="trigger__placeholder">{defaultPlaceholder}</span>
          )}
        </div>

        <div className="trigger__actions">
          {selectedOption && !disabled && (
            <button
              type="button"
              className="trigger__clear-btn"
              onClick={handleClear}
              title={t('select.clearSelection')}
              aria-label={t('select.clearSelection')}
            >
              ✕
            </button>
          )}

          <span className="trigger__arrow" aria-hidden="true">
            {isOpen ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Error / Retry Bar */}
      {error && (
        <div className="select-error-bar">
          <span className="error-text">{error}</span>
          {onRetry && (
            <button type="button" className="retry-btn-mini" onClick={onRetry}>
              {t('select.retry')}
            </button>
          )}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="searchable-select__dropdown" role="listbox">
          <div className="dropdown__search-wrap">
            <input
              ref={searchInputRef}
              type="text"
              className="dropdown__search-input"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDisplayLimit(50);
              }}
              placeholder={defaultSearchPlaceholder}
              aria-label={t('common.search')}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-mini"
                onClick={() => setSearchTerm('')}
                aria-label={t('common.clear')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="dropdown__options-list">
            {loading ? (
              <div className="dropdown__state-msg">
                <span className="loading-spinner-mini" />
                <span>{t('select.loading')}</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="dropdown__state-msg">
                {t('select.noResults')} {searchTerm ? `("${searchTerm}")` : ''}
              </div>
            ) : (
              <>
                <div className="dropdown__count-hint">
                  {t('select.showingCount', { count: displayedOptions.length, total: filteredOptions.length })}
                  {filteredOptions.length > displayedOptions.length && ` • ${t('common.search')}`}
                </div>

                {displayedOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <div
                      key={String(opt.value)}
                      role="option"
                      aria-selected={isSelected}
                      className={`dropdown__option ${isSelected ? 'dropdown__option--selected' : ''}`}
                      onClick={() => handleSelect(opt.value)}
                    >
                      <div className="option__main">
                        <span className="option__label">{opt.label}</span>
                        {opt.marathiLabel && opt.marathiLabel !== opt.label && (
                          <span className="option__marathi">{opt.marathiLabel}</span>
                        )}
                      </div>
                      {opt.code && (
                        <span className="option__code">
                          {typeof opt.code === 'string' && opt.code.includes('LGD') ? opt.code : `LGD: ${opt.code}`}
                        </span>
                      )}
                    </div>
                  );
                })}

                {filteredOptions.length > displayedOptions.length && (
                  <div className="dropdown__pagination-row">
                    <button
                      type="button"
                      className="dropdown__load-more-btn"
                      onClick={handleShowMore}
                    >
                      {t('select.showMore')}
                    </button>
                    <button
                      type="button"
                      className="dropdown__load-all-btn"
                      onClick={handleShowAll}
                    >
                      {t('select.showAll')} ({filteredOptions.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
