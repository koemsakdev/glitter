/**
 * The password the API gives staff created (or reset) without one — keep in
 * sync with DEFAULT_STAFF_PASSWORD in glitter-api/.env. Shown to the admin so
 * they can pass it on; staff must change it on first sign-in.
 */
export const DEFAULT_STAFF_PASSWORD =
    process.env.NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD || 'Glitter@123';
