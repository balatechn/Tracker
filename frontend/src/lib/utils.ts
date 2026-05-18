import dayjs from 'dayjs';
import { Entry, DashboardStats } from '@/types';

export function getDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  return dayjs(expiryDate).diff(dayjs(), 'day');
}

export function getStatusInfo(days: number | null): {
  label: string;
  color: string;
  bg: string;
  dot: string;
} {
  if (days === null) {
    return { label: 'No Expiry', color: 'text-status-neutral', bg: 'bg-status-neutral-bg', dot: 'bg-gray-400' };
  }
  if (days < 0) {
    return { label: 'Expired', color: 'text-status-danger', bg: 'bg-status-danger-bg', dot: 'bg-red-500' };
  }
  if (days <= 60) {
    return { label: `${days}d`, color: 'text-status-warning', bg: 'bg-status-warning-bg', dot: 'bg-orange-500' };
  }
  return { label: `${days}d`, color: 'text-status-active', bg: 'bg-status-active-bg', dot: 'bg-green-500' };
}

export function computeStats(entries: Entry[]): DashboardStats {
  let active = 0, expiringSoon = 0, expired = 0, noExpiry = 0, totalAnnualCost = 0;

  for (const e of entries) {
    const days = getDaysRemaining(e.expiryDate);
    if (days === null) noExpiry++;
    else if (days < 0) expired++;
    else if (days <= 60) expiringSoon++;
    else active++;

    if (e.annualCost) totalAnnualCost += e.annualCost;
  }

  return { total: entries.length, active, expiringSoon, expired, noExpiry, totalAnnualCost };
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return dayjs(date).format('DD-MMM-YYYY');
}

export function formatCurrency(amount: number | null): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
