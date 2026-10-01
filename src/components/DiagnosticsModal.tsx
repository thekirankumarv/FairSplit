import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { runAllEngineTests } from '../engine/engineTests';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [testSuite, setTestSuite] = useState(runAllEngineTests());
  const [isRunning, setIsRunning] = useState(false);
  const allPassed = testSuite.passed === testSuite.total;

  const handleRerun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setTestSuite(runAllEngineTests());
      setIsRunning(false);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm pad-overlay overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-750 rounded-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-stone-100">
                0-Drift Financial Integrity Engine
              </h2>
              <p className="text-[11px] text-stone-400">
                Pure TypeScript • Zero Float Roundoff • Conservation Invariants
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary Banner. The colour follows the actual result rather than
            always reporting success. */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between ${
            allPassed
              ? 'bg-emerald-950/30 border-emerald-500/30'
              : 'bg-red-950/30 border-red-500/40'
          }`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold ${
              allPassed ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {allPassed ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="text-red-400" />
            )}
            <span>
              {testSuite.passed} of {testSuite.total} invariant tests passing
              {allPassed ? '' : ` · ${testSuite.total - testSuite.passed} failing`}
            </span>
          </div>
          <button
            onClick={handleRerun}
            disabled={isRunning}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors"
          >
            <RefreshCw size={12} className={isRunning ? 'animate-spin' : ''} />
            <span>Re-verify</span>
          </button>
        </div>

        {/* Test details list */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {testSuite.results.map((test, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-stone-850 border border-stone-750 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-stone-200">
                  {test.passed ? (
                    <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
                  )}
                  <span>{test.name}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                  {test.category}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono pl-6 leading-relaxed">
                {test.message}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-stone-800 text-center">
          <p className="text-[11px] text-stone-500">
            Mandate: sum(participantShares) === expenseTotal • sum(netBalances) === 0 • exact paise apportionment
          </p>
        </div>
      </div>
    </div>
  );
};
