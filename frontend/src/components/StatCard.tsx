import React from 'react';

interface Props {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple';
  subtitle?: string;
  wide?: boolean;
  icon?: React.ReactNode;
}

const colorMap = {
  blue:   { border: 'border-brand-500',  text: 'text-brand-600',  iconBg: 'bg-blue-100 text-brand-600' },
  green:  { border: 'border-green-500',  text: 'text-green-700',  iconBg: 'bg-green-100 text-green-700' },
  orange: { border: 'border-orange-400', text: 'text-orange-600', iconBg: 'bg-orange-100 text-orange-600' },
  red:    { border: 'border-red-500',    text: 'text-red-700',    iconBg: 'bg-red-100 text-red-700' },
  gray:   { border: 'border-gray-400',   text: 'text-gray-600',   iconBg: 'bg-gray-100 text-gray-500' },
  purple: { border: 'border-purple-500', text: 'text-purple-700', iconBg: 'bg-purple-100 text-purple-700' },
};

export default function StatCard({ label, value, color, subtitle, icon }: Props) {
  const c = colorMap[color];
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-t-[3px] ${c.border} px-4 py-3 flex flex-col gap-1.5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-default group`}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
        {icon && (
          <div className={`flex-shrink-0 p-1.5 rounded-lg ${c.iconBg} group-hover:scale-110 transition-transform duration-200`}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className={`text-2xl font-bold ${c.text} leading-none tracking-tight`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
