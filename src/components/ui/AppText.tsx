import React from 'react';
import { Text, TextProps } from 'react-native';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'label' | 'caption' | 'mono';
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  className?: string;
  color?: string;
}

export const AppText = React.memo(({
  variant = 'body',
  weight,
  className = '',
  color,
  style,
  children,
  ...props
}: AppTextProps) => {
  let sizeClass = 'text-[15px]';
  let defaultWeight: TextWeight = 'regular';
  let defaultColor = 'text-slate-800';

  switch (variant) {
    case 'h1':
      sizeClass = 'text-[26px] leading-[32px]';
      defaultWeight = 'bold';
      defaultColor = 'text-slate-900';
      break;
    case 'h2':
      sizeClass = 'text-[20px] leading-[26px]';
      defaultWeight = 'bold';
      defaultColor = 'text-slate-900';
      break;
    case 'h3':
      sizeClass = 'text-[17px] leading-[22px]';
      defaultWeight = 'semibold';
      defaultColor = 'text-slate-900';
      break;
    case 'body':
      sizeClass = 'text-[15px] leading-[21px]';
      defaultWeight = 'regular';
      defaultColor = 'text-slate-700';
      break;
    case 'label':
      sizeClass = 'text-[13px] uppercase tracking-wider';
      defaultWeight = 'semibold';
      defaultColor = 'text-slate-500';
      break;
    case 'caption':
      sizeClass = 'text-[12px] leading-[16px]';
      defaultWeight = 'regular';
      defaultColor = 'text-slate-500';
      break;
    case 'mono':
      sizeClass = 'text-[13px] font-mono';
      defaultWeight = 'medium';
      defaultColor = 'text-slate-800';
      break;
  }

  const selectedWeight = weight || defaultWeight;
  let weightClass = 'font-normal';
  if (selectedWeight === 'medium') weightClass = 'font-medium';
  if (selectedWeight === 'semibold') weightClass = 'font-semibold';
  if (selectedWeight === 'bold') weightClass = 'font-bold';

  const colorClass = color || defaultColor;

  return (
    <Text
      className={`${sizeClass} ${weightClass} ${colorClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
});

AppText.displayName = 'AppText';
