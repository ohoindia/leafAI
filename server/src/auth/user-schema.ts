import { z } from "zod";
const text = z.string().trim().max(300);
const phone = z.string().trim().max(30).refine(value => !value || (/^\+?[0-9 ()-]+$/.test(value) && value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15), "Enter a valid phone number with 7 to 15 digits.");
export const userDetailsSchema = z.object({ phone: phone.optional(), alternatePhone: phone.optional(), addressLine1: text.optional(), addressLine2: text.optional(), village: text.optional(), district: text.optional(), state: text.optional(), country: text.optional(), postalCode: z.string().trim().max(20).optional() }).strict();
