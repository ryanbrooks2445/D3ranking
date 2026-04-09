export const PRO_TRIAL_DAYS = 3;
export const PRO_TRIAL_LABEL = `${PRO_TRIAL_DAYS}-day free trial`;

export function getStripeTrialEnd(now: Date = new Date()): number {
  return Math.floor((now.getTime() + PRO_TRIAL_DAYS * 24 * 60 * 60 * 1000) / 1000);
}
