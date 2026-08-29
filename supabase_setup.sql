-- ==============================================================================
-- TUSUPERCARTON - ESQUEMA Y COMPATIBILIDAD SUPABASE (100% NO DESTRUCTIVO)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: rounds (crear si no existe y agregar columnas sin alterar datos existentes)
CREATE TABLE IF NOT EXISTS public.rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "roundNumber" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "round_number" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "cardPriceVes" NUMERIC DEFAULT 50.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "card_price_ves" NUMERIC DEFAULT 50.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "cardPriceUsd" NUMERIC DEFAULT 1.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "card_price_usd" NUMERIC DEFAULT 1.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "prizePercentage" NUMERIC DEFAULT 80.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "prize_percentage" NUMERIC DEFAULT 80.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "totalCardsSold" INTEGER DEFAULT 0;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "total_cards_sold" INTEGER DEFAULT 0;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "jackpotVes" NUMERIC DEFAULT 5000.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "jackpot_ves" NUMERIC DEFAULT 5000.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "drawnFichas" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "drawn_fichas" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "winningCardsCount" INTEGER DEFAULT 0;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "winning_cards_count" INTEGER DEFAULT 0;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "totalPrizesPaidVes" NUMERIC DEFAULT 0.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "total_prizes_paid_ves" NUMERIC DEFAULT 0.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "resultLocked" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "result_locked" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "resultSubmittedBy" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "result_submitted_by" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "resultSubmittedAt" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "result_submitted_at" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "startsAt" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "starts_at" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "endsAt" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "ends_at" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "drawAt" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "draw_at" TEXT;

-- 2. TABLA: users (sin foreign keys restrictivas)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    document_id TEXT,
    role TEXT DEFAULT 'Player',
    available_balance NUMERIC(14, 2) DEFAULT 0.00,
    pending_balance NUMERIC(14, 2) DEFAULT 0.00,
    total_spent_ves NUMERIC(14, 2) DEFAULT 0.00,
    total_won_ves NUMERIC(14, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    password_hash TEXT,
    status TEXT DEFAULT 'active',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: cards (round_id y user_id como TEXT plano, SIN REFERENCES)
CREATE TABLE IF NOT EXISTS public.cards (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    round_id TEXT,
    round_number INTEGER,
    user_id TEXT,
    user_name TEXT,
    matrix JSONB NOT NULL,
    purchase_time TEXT,
    price_ves NUMERIC(10, 2) DEFAULT 25.00,
    status TEXT DEFAULT 'active',
    matched_count INTEGER DEFAULT 0,
    winning_patterns JSONB DEFAULT '[]'::jsonb,
    total_prize_ves NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: recharges (user_id como TEXT plano, SIN REFERENCES)
CREATE TABLE IF NOT EXISTS public.recharges (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_phone TEXT,
    amount_ves NUMERIC(12, 2) NOT NULL,
    payer_phone TEXT,
    payer_name TEXT,
    payer_document_id TEXT,
    bank_origin TEXT,
    reference_number TEXT,
    voucher_image_url TEXT,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    processed_at TEXT,
    processed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: withdrawals (user_id como TEXT plano, SIN REFERENCES)
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_phone TEXT,
    amount_ves NUMERIC(12, 2) NOT NULL,
    channel TEXT DEFAULT 'pago_movil',
    bank_dest TEXT,
    phone_or_account TEXT,
    document_id TEXT,
    titular_name TEXT,
    account_type TEXT,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    processed_at TEXT,
    processed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: comercial
CREATE TABLE IF NOT EXISTS public.comercial (
    id INTEGER PRIMARY KEY DEFAULT 1,
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.comercial (id, config)
VALUES (
    1,
    '{"exchangeRateVesUsd":60,"accumulatedJackpotVes":5000,"cardPrices":{"pack2":50,"pack4":100,"pack6":150},"prizeMultipliers":{"line":0.15,"corners":0.10,"fullCard":0.75},"adminBank":{"bankName":"Banco de Venezuela (0102)","phone":"04141234567","documentId":"J-12345678-0","accountHolder":"Tu Súper Cartón C.A."}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 8. TABLA: ledger (user_id como TEXT plano, SIN REFERENCES)
CREATE TABLE IF NOT EXISTS public.ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    type TEXT NOT NULL,
    amount_ves NUMERIC(12, 2) NOT NULL,
    balance_before NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLAS ADICIONALES: audit_logs, support_tickets, reclamos
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operator_role TEXT,
    operator_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    user_phone TEXT,
    subject TEXT,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reclamos (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    user_phone TEXT,
    subject TEXT,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. HABILITAR REALTIME EN PUBLICACIONES
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recharges; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cards; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comercial; EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- 11. HABILITAR RLS Y POLÍTICAS PERMISIVAS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['users', 'admin_users', 'rounds', 'cards', 'recharges', 'withdrawals', 'comercial', 'ledger', 'audit_logs', 'support_tickets', 'reclamos'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS allow_all_%I ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY allow_all_%I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- 12. RECARGAR CACHÉ DE ESQUEMA POSTGREST
NOTIFY pgrst, 'reload schema';
