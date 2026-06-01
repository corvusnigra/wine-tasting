import { useRef } from "react";
import { createSupabaseBrowserClient } from "./client";

/**
 * Stable per-component browser Supabase client. Created once, reused
 * across renders. Replaces the repeated
 * `useRef(createSupabaseBrowserClient()).current` idiom.
 */
export function useSupabaseBrowser() {
  return useRef(createSupabaseBrowserClient()).current;
}
