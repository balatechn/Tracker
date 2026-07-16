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
  blue:   { top: '#2b579a', text: '#2b579a', iconBg: '#dce6f1', iconColor: '#2b579a' },
  green:  { top: '#375623', text: '#375623', iconBg: '#e2efda', iconColor: '#375623' },
  orange: { top: '#833c00', text: '#833c00', iconBg: '#fce4d6', iconColor: '#833c00' },
  red:    { top: '#c00000', text: '#c00000', iconBg: '#ffd7d7', iconColor: '#c00000' },
  gray:   { top: '#595959', text: '#595959', iconBg: '#f2f2f2', iconColor: '#595959' },
  purple: { top: '#7030a0', text: '#7030a0', iconBg: '#ead1ff', iconColor: '#7030a0' },
};

export default function StatCard({ label, value, color, subtitle, icon }: Props) {
  const c = colorMap[color];
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #d0d0d0',
        borderTop: `3px solid ${c.top}`,
        borderRadius: 0,
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontFamily: "'Calibri','Aptos',Arial,sans-serif",
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        <p style={{ fontSize: '9pt', fontWeight: 700, color: '#595959', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, lineHeight: 1.2 }}>
          {label}
        </p>
        {icon && (
          <div style={{ background: c.iconBg, color: c.iconColor, padding: '4px', flexShrink: 0, display: 'flex' }}>
            {icon}
          </div>
        )}
      </div>
      <p style={{ fontSize: '18pt', fontWeight: 700, color: c.text, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {subtitle && <p style={{ fontSize: '8pt', color: '#a0a0a0', margin: 0 }}>{subtitle}</p>}
    </div>
  );
}
