const parseMonthlyPrice = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 29;
};

export const SUBSCRIPTION_MONTHLY_PRICE = parseMonthlyPrice(
  import.meta.env.VITE_SUBSCRIPTION_MONTHLY_PRICE
);

