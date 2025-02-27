import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

if (!config.supabase.url || !config.supabase.anonKey) {
  throw new Error(
    "Supabase configuration is missing. Please check your .env file."
  );
}

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export const fetchFeatureFlagByName = async (featureFlagName: string) => {
  const { data, error } = await supabase
    .from("feature-flags")
    .select("*")
    .eq("feature_name", featureFlagName)
    .single();

  if (error) {
    console.error("Error fetching feature flag:", error);
    throw error;
  }

  return data;
};
