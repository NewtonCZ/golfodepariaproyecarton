import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve Supabase environment variables safely
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};

const SUPABASE_URL =
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  metaEnv.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.SUPABASE_URL : '') ||
  '';

const SUPABASE_ANON_KEY =
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.SUPABASE_SERVICE_ROLE_KEY ||
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY || process.env?.SUPABASE_SERVICE_ROLE_KEY : '') ||
  '';

let realSupabaseClient: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('http')) {
  try {
    realSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.warn('[supabaseClient] Failed to initialize real Supabase client:', err);
  }
}

export interface SupabaseQueryResult<T = any> {
  data: T | null;
  error: any;
}

/**
 * Universal Supabase query handler with local fallback for resilience
 */
export const supabase = {
  get isConfigured(): boolean {
    return Boolean(realSupabaseClient);
  },

  from(tableName: string): any {
    if (realSupabaseClient) {
      return realSupabaseClient.from(tableName);
    }

    // Fallback Query Builder for local dev / offline mode
    const filters: Record<string, any> = {};

    const queryBuilder: any = {
      select: (_columns: string = '*') => queryBuilder,
      eq: (column: string, value: any) => {
        filters[column] = value;
        return queryBuilder;
      },
      limit: (_n: number) => queryBuilder,
      maybeSingle: async (): Promise<SupabaseQueryResult> => {
        return queryBuilder.single();
      },
      single: async (): Promise<SupabaseQueryResult> => {
        if (tableName === 'configuracion' || tableName === 'config') {
          const savedConfig = typeof localStorage !== 'undefined' ? localStorage.getItem('millionaire_lottery_v1_config') : null;
          let adminUser = 'admin';
          let adminPass = 'admin123';

          if (savedConfig) {
            try {
              const parsed = JSON.parse(savedConfig);
              if (parsed.admin_user) adminUser = parsed.admin_user;
              if (parsed.admin_pass) adminPass = parsed.admin_pass;
            } catch (e) {}
          }

          // If filtering by admin_user / admin_pass
          if (filters.admin_user && filters.admin_user !== adminUser) {
            return { data: null, error: null };
          }
          if (filters.admin_pass && filters.admin_pass !== adminPass) {
            return { data: null, error: null };
          }

          return {
            data: {
              id: filters.id || 1,
              admin_user: adminUser,
              admin_pass: adminPass,
              created_at: new Date().toISOString(),
            },
            error: null,
          };
        }

        return {
          data: null,
          error: { message: `No data found in fallback for table ${tableName}` },
        };
      },
      then: async (resolve: any) => {
        const res = await queryBuilder.single();
        return resolve(res);
      },
      insert: async (values: any) => ({ data: values, error: null }),
      update: async (values: any) => ({
        eq: (_col: string, _val: any) => ({
          data: values,
          error: null,
        }),
      }),
    };

    return queryBuilder;
  },

  channel(channelName: string): any {
    if (realSupabaseClient) {
      return realSupabaseClient.channel(channelName);
    }

    const mockChannel: any = {
      on: (_event: any, _filter: any, _callback?: any) => mockChannel,
      subscribe: (cb?: (status: string) => void) => {
        if (cb) cb('SUBSCRIBED');
        return mockChannel;
      },
      unsubscribe: () => {},
    };

    return mockChannel;
  },

  removeChannel(channel: any) {
    if (realSupabaseClient && channel) {
      try {
        realSupabaseClient.removeChannel(channel);
      } catch (e) {}
    } else if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
    }
  },
};

export default supabase;
