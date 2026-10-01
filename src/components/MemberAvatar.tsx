import React from 'react';
import { Member } from '../types';

interface MemberAvatarProps {
  member?: Member;
  name?: string;
  avatarColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showYouBadge?: boolean;
  className?: string;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  name,
  avatarColor,
  size = 'md',
  showYouBadge = false,
  className = '',
}) => {
  const displayName = member?.name || name || '?';
  const initial = displayName.trim().charAt(0).toUpperCase();
  const color = member?.avatarColor || avatarColor || '#6366f1';
  const isYou = member?.isCurrentUser || showYouBadge;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg font-bold',
  };

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      <div
        className={`rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-white/10 select-none ${sizeClasses[size]}`}
        style={{ backgroundColor: color }}
        title={displayName}
      >
        {initial}
      </div>
      {isYou && (
        <span
          className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-emerald-500 text-stone-950 font-extrabold text-[9px] rounded-full uppercase tracking-tighter leading-none border border-stone-900 shadow-sm"
        >
          You
        </span>
      )}
    </div>
  );
};
