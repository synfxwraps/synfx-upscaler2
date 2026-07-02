import { createClient } from "@supabase/supabase-js";

// Publishable keys are designed to be exposed in the browser. Env vars take
// precedence; the literals are safe defaults so the build works out of the box.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://pwzdwiccwcobojexlcnj.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_waHsZ8dDmQPfakSto5KryA_ilvrBom5";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Stripe credit packs (test mode price IDs from the backend spec).
export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter",
    credits: 10,
    price_id: "price_1ToHo9PZppSpJHX6NfLuANwj",
    blurb: "For the occasional upscale",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 50,
    price_id: "price_1ToHnoPZppSpJHX65AeL9E4C",
    blurb: "Best value for regular work",
    popular: true,
  },
  {
    id: "studio",
    name: "Studio",
    credits: 200,
    price_id: "price_1ToHnSPZppSpJHX6yJcC1Gvb",
    blurb: "For studios & high volume",
  },
];
