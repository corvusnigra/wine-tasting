import { useState } from "react";
import { createSupabaseBrowserClient } from "./client";

/**
 * Stable per-component browser Supabase client. The lazy useState initializer
 * runs the factory exactly once (not on every render) and returns a value
 * that's safe to read during render.
 */
export function useSupabaseBrowser() {
  const [client] = useState(createSupabaseBrowserClient);
  return client;
}
