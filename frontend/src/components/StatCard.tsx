interface Props {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  subtitle?: string;
  wide?: boolean;
}

const colorMap = {
  blue: { border: 'border-brand-500', text: 'text-brand-600', bg: 'bg-brand-50' },
  green: { border: 'border-green-500', text: 'text-green-700', bg: 'bg-green-50' },
  orange: { border: 'border-orange-400', text: 'text-orange-600', bg: 'bg-orange-50' },
  red: { border: 'border-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  gray: { border: 'border-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' },
};

export default function StatCard({ label, value, color, subtitle, wide }: Props) {
  const c = colorMap[color];
  return (
    <div className={`bg-white rounded-lg shadow-card border-t-2 ${c.border} ${c.bg} px-4 py-3 ${wide ? 'col-span-1' : ''}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${c.text} leading-none`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
