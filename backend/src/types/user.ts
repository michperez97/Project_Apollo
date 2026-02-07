export type UserRole = 'admin' | 'instructor' | 'student';
export type SubscriptionStatus =
  | 'inactive'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'trialing'
  | 'unpaid';

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  current_period_end: Date | null;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SafeUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  current_period_end: Date | null;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}
