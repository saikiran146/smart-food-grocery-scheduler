import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';

export const formatDate = (date: string | Date) => format(new Date(date), 'dd MMM yyyy');
export const formatDateTime = (date: string | Date) => format(new Date(date), 'dd MMM yyyy, h:mm a');
export const formatRelative = (date: string | Date) => formatDistanceToNow(new Date(date), { addSuffix: true });
export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
export const formatWeight = (quantity: number, unit: string) => `${quantity} ${unit.toLowerCase()}`;

export const isExpiringSoon = (expiryDate: string | Date, days = 3) =>
  isBefore(new Date(expiryDate), addDays(new Date(), days)) && isAfter(new Date(expiryDate), new Date());

export const isExpired = (expiryDate: string | Date) => isBefore(new Date(expiryDate), new Date());

export const getDaysUntilExpiry = (expiryDate: string | Date) => {
  const diff = new Date(expiryDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
