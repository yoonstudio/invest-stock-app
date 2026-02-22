'use client';

import { useState, useEffect } from 'react';
import { X, RotateCcw, SlidersHorizontal, CheckCircle2, Circle } from 'lucide-react';
import {
  ScreeningCriteria,
  DEFAULT_SCREENING_CRITERIA,
  AVAILABLE_COUNTRIES,
  SECTOR_GROUPS,
} from '@/types';
import { classNames } from '@/lib/utils';

interface ScreeningModalProps {
  isOpen: boolean;
  current: ScreeningCriteria;
  onApply: (criteria: ScreeningCriteria) => void;
  onClose: () => void;
}

interface NumberInputProps {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix: string;
  prefix?: string;
}

function NumberInput({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 0.5,
  suffix,
  prefix,
}: NumberInputProps) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = (str: string) => {
    const n = parseFloat(str);
    if (!isNaN(n)) {
      const clamped = Math.min(Math.max(n, min), max);
      onChange(clamped);
      setRaw(String(clamped));
    } else {
      setRaw(String(value));
    }
  };

  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {prefix && (
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
            {prefix}
          </span>
        )}
        <div className="relative flex items-center">
          <input
            type="number"
            value={raw}
            min={min}
            max={max}
            step={step}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit(raw)}
            className={classNames(
              'w-24 px-3 py-2 pr-8 text-sm rounded-lg border',
              'bg-white dark:bg-gray-700',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            )}
          />
          <span className="absolute right-2.5 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
            {suffix}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { const nv = Math.max(value - step, min); onChange(nv); setRaw(String(nv)); }}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm transition-colors"
          >−</button>
          <button
            onClick={() => { const nv = Math.min(value + step, max); onChange(nv); setRaw(String(nv)); }}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm transition-colors"
          >+</button>
        </div>
      </div>
    </div>
  );
}

function MoatToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">경제적 해자</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          업계 선도 기업으로 지속 가능한 경쟁우위 보유 여부
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(true)}
          className={classNames(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
            value
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400',
          )}
        >
          {value ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          해자 있음
        </button>
        <button
          onClick={() => onChange(false)}
          className={classNames(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
            !value
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-400'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400',
          )}
        >
          {!value ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          전체 포함
        </button>
      </div>
    </div>
  );
}

/** Country multiselect: pill-style toggles. Empty = all countries. */
function CountrySelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const isAll = selected.length === 0;

  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">국가</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          포함할 국가를 선택하세요 (미선택 시 전체)
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {/* "전체" pill */}
        <button
          onClick={() => onChange([])}
          className={classNames(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
            isAll
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400',
          )}
        >
          전체
        </button>
        {AVAILABLE_COUNTRIES.map((c) => {
          const active = selected.includes(c.code);
          return (
            <button
              key={c.code}
              onClick={() => toggle(c.code)}
              className={classNames(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400',
              )}
            >
              <span>{c.flag}</span>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Sector multiselect: grouped chips. Empty = all sectors. */
function SectorSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (sector: string) => {
    if (selected.includes(sector)) {
      onChange(selected.filter((s) => s !== sector));
    } else {
      onChange([...selected, sector]);
    }
  };

  const isAll = selected.length === 0;

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">업종</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          포함할 업종을 선택하세요 (미선택 시 전체)
        </p>
      </div>
      {/* "전체" button */}
      <button
        onClick={() => onChange([])}
        className={classNames(
          'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
          isAll
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400',
        )}
      >
        전체
      </button>
      {/* Grouped sectors */}
      <div className="space-y-3">
        {SECTOR_GROUPS.map((group) => (
          <div key={group.group}>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wide">
              {group.group}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.sectors.map((sector) => {
                const active = selected.includes(sector);
                return (
                  <button
                    key={sector}
                    onClick={() => toggle(sector)}
                    className={classNames(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      active
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400',
                    )}
                  >
                    {sector}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScreeningModal({ isOpen, current, onApply, onClose }: ScreeningModalProps) {
  const [draft, setDraft] = useState<ScreeningCriteria>(current);

  // Sync draft when modal opens
  useEffect(() => {
    if (isOpen) setDraft(current);
  }, [isOpen, current]);

  const update = <K extends keyof ScreeningCriteria>(key: K, value: ScreeningCriteria[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const resetToDefault = () => setDraft({ ...DEFAULT_SCREENING_CRITERIA });

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const isDefault =
    draft.roeMin === DEFAULT_SCREENING_CRITERIA.roeMin &&
    draft.perRatioMax === DEFAULT_SCREENING_CRITERIA.perRatioMax &&
    draft.pbrRatioMax === DEFAULT_SCREENING_CRITERIA.pbrRatioMax &&
    draft.epsMin === DEFAULT_SCREENING_CRITERIA.epsMin &&
    draft.requireMoat === DEFAULT_SCREENING_CRITERIA.requireMoat &&
    draft.countries.length === 0 &&
    draft.sectors.length === 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="screening-modal-title"
        className={classNames(
          'fixed z-50 inset-x-4 top-1/2 -translate-y-1/2 mx-auto',
          'max-w-lg w-full',
          'bg-white dark:bg-gray-900',
          'rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700',
          'animate-fadeIn',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 id="screening-modal-title" className="text-base font-bold text-gray-900 dark:text-white">
                조건 검색
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">퀀트 스크리닝 기준 설정</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Country */}
          <CountrySelect
            selected={draft.countries}
            onChange={(v) => update('countries', v)}
          />

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Sector */}
          <SectorSelect
            selected={draft.sectors}
            onChange={(v) => update('sectors', v)}
          />

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* ROE */}
          <NumberInput
            label="ROE (자기자본이익률)"
            description="이 값 이상인 종목만 포함됩니다"
            value={draft.roeMin}
            onChange={(v) => update('roeMin', v)}
            min={0}
            max={500}
            step={1}
            suffix="%"
            prefix="최소"
          />

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* PER */}
          <NumberInput
            label="PER (주가수익비율)"
            description="업종 평균 PER 대비 이 비율 이하인 종목만 포함"
            value={draft.perRatioMax}
            onChange={(v) => update('perRatioMax', v)}
            min={1}
            max={200}
            step={5}
            suffix="%"
            prefix="업종평균의"
          />

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* PBR */}
          <NumberInput
            label="PBR (주가순자산비율)"
            description="업종 평균 PBR 대비 이 비율 이하인 종목만 포함"
            value={draft.pbrRatioMax}
            onChange={(v) => update('pbrRatioMax', v)}
            min={1}
            max={200}
            step={5}
            suffix="%"
            prefix="업종평균의"
          />

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* EPS */}
          <NumberInput
            label="EPS 연평균 성장률 (CAGR)"
            description="이 값 이상인 종목만 포함됩니다"
            value={draft.epsMin}
            onChange={(v) => update('epsMin', v)}
            min={-100}
            max={500}
            step={1}
            suffix="%"
            prefix="최소"
          />

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Moat */}
          <MoatToggle value={draft.requireMoat} onChange={(v) => update('requireMoat', v)} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-5 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={resetToDefault}
            disabled={isDefault}
            className={classNames(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              isDefault
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            기본값
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
