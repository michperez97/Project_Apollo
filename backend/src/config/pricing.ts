const DEFAULT_SUBSCRIPTION_PRICE_ID = 'price_sub_placeholder';

export const SUBSCRIPTION_PRICE_ID =
  process.env.SUBSCRIPTION_PRICE_ID?.trim() || DEFAULT_SUBSCRIPTION_PRICE_ID;

