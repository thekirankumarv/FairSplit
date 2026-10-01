import React from 'react';
import {
  Utensils,
  Bed,
  Car,
  Fuel,
  ShoppingBag,
  Wine,
  Compass,
  Apple,
  Ticket,
  Receipt,
} from 'lucide-react';
import { ExpenseCategory } from '../types';
import { CATEGORIES } from '../utils/categories';

interface CategoryIconProps {
  category: ExpenseCategory;
  showBackground?: boolean;
  sizeVariant?: 'sm' | 'md' | 'lg';
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  showBackground = true,
  sizeVariant = 'md',
  className = '',
  size: customSize,
}) => {
  const meta = CATEGORIES[category] || CATEGORIES.misc;

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
  };

  const containerSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const iconSize = customSize || iconSizes[sizeVariant];

  const renderIcon = () => {
    switch (category) {
      case 'food':
        return <Utensils size={iconSize} />;
      case 'hotel':
        return <Bed size={iconSize} />;
      case 'transport':
        return <Car size={iconSize} />;
      case 'fuel':
        return <Fuel size={iconSize} />;
      case 'shopping':
        return <ShoppingBag size={iconSize} />;
      case 'drinks':
        return <Wine size={iconSize} />;
      case 'activities':
        return <Compass size={iconSize} />;
      case 'groceries':
        return <Apple size={iconSize} />;
      case 'tickets':
        return <Ticket size={iconSize} />;
      case 'misc':
      default:
        return <Receipt size={iconSize} />;
    }
  };

  if (!showBackground) {
    return (
      <span style={{ color: meta.color }} className={className}>
        {renderIcon()}
      </span>
    );
  }

  return (
    <div
      id={`cat-icon-${category}`}
      className={`inline-flex items-center justify-center flex-shrink-0 border transition-transform duration-200 ${containerSizes[sizeVariant]} ${meta.bgDark} ${className}`}
      style={{ borderColor: `${meta.color}40` }}
    >
      <span style={{ color: meta.color }}>{renderIcon()}</span>
    </div>
  );
};
