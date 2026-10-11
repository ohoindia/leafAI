export type UserDetailKey =
  | "phone"
  | "alternatePhone"
  | "addressLine1"
  | "addressLine2"
  | "village"
  | "district"
  | "state"
  | "country"
  | "postalCode";
export type UserDetails = Partial<Record<UserDetailKey, string>>;
export const userDetailSections: {
  title: string;
  fields: { key: UserDetailKey; label: string; placeholder: string }[];
}[];
