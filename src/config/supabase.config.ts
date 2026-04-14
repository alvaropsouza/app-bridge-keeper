export interface SupabaseConfig {
	url: string;
	publishableKey: string;
	secretKey?: string;
	frontendUrl?: string;
}

export const SUPABASE_CONFIG = 'SUPABASE_CONFIG';
