import React, { useState } from 'react';
import { X, Trash2, Users } from 'lucide-react';
import { Trip, Member, CurrencyCode, SUPPORTED_CURRENCIES } from '../types';
import { MemberAvatar } from './MemberAvatar';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (newTrip: Trip) => void;
}

const DEFAULT_AVATAR_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#ef4444', // red
  '#14b8a6', // teal
];

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onCreateTrip,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [tripName, setTripName] = useState('');
  const [description] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(threeDaysLater);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');

  // Members
  const [members, setMembers] = useState<Member[]>([
    {
      id: `m-you-${Date.now()}`,
      name: 'You',
      nickname: 'Owner',
      avatarColor: DEFAULT_AVATAR_COLORS[0],
      isCurrentUser: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: `m-friend-1`,
      name: 'Rahul',
      avatarColor: DEFAULT_AVATAR_COLORS[1],
      isCurrentUser: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: `m-friend-2`,
      name: 'Ananya',
      avatarColor: DEFAULT_AVATAR_COLORS[4],
      isCurrentUser: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [newMemberName, setNewMemberName] = useState('');

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const colorIndex = members.length % DEFAULT_AVATAR_COLORS.length;
    const newMember: Member = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newMemberName.trim(),
      avatarColor: DEFAULT_AVATAR_COLORS[colorIndex],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim() || members.length === 0) return;

    const newTrip: Trip = {
      id: `trip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: tripName.trim(),
      description: description.trim() || undefined,
      startDate,
      endDate,
      currency,
      members,
      expenses: [],
      settlements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateTrip(newTrip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm pad-overlay overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-md bg-stone-900 border border-stone-750 rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-stone-100">Create New Short Trip</h2>
            <p className="text-xs text-stone-400">1–7 day group expense split</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Trip Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Trip Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Coorg Weekend, Pondicherry Getaway"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-850 border border-stone-750 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Dates & Currency */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="w-full px-3 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-100 focus:outline-none font-bold"
            >
              {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((c) => (
                <option key={c} value={c}>
                  {SUPPORTED_CURRENCIES[c].symbol} {SUPPORTED_CURRENCIES[c].name} ({c})
                </option>
              ))}
            </select>
          </div>

          {/* Members Builder */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                <Users size={14} className="text-emerald-400" />
                <span>Trip Friends ({members.length})</span>
              </label>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {members.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-850 border border-stone-750 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MemberAvatar member={m} size="xs" />
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => {
                        const updated = [...members];
                        updated[idx].name = e.target.value;
                        setMembers(updated);
                      }}
                      className="bg-transparent font-semibold text-stone-200 focus:outline-none truncate w-32"
                    />
                  </div>

                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-stone-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Member input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add friend's name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-bold text-emerald-400 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!tripName.trim() || members.length === 0}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Trip & Start Splitting
          </button>
        </form>
      </div>
    </div>
  );
};
