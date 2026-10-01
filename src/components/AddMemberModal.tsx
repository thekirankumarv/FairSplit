import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Trip, Member } from '../types';

interface AddMemberModalProps {
  isOpen: boolean;
  trip: Trip;
  onClose: () => void;
  onAddMember: (member: Member) => void;
}

const AVATAR_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#ef4444',
  '#14b8a6',
];

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  trip,
  onClose,
  onAddMember,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedColor, setSelectedColor] = useState(
    AVATAR_COLORS[trip.members.length % AVATAR_COLORS.length]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newMember: Member = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      avatarColor: selectedColor,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    onAddMember(newMember);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm pad-overlay animate-in fade-in">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-750 rounded-3xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-emerald-400" />
            <h2 className="text-sm font-extrabold text-stone-100">Add Friend to {trip.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Friend Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Vikram, Sneha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-850 border border-stone-750 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Nickname or Role (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Driver, DJ, Chef"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Avatar Color
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-stone-900' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-all disabled:opacity-50"
          >
            Add to Trip
          </button>
        </form>
      </div>
    </div>
  );
};
