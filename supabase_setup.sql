-- ==============================================================================
-- TUSUPERCARTON - ESQUEMA Y COMPATIBILIDAD SUPABASE (100% NO DESTRUCTIVO)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: rounds (crear si no existe y agregar columnas sin alterar datos existentes)
CREATE TABLE IF NOT EXISTS public.rounds (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rounds ALTER COLUMN id TYPE TEXT;

ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "roundNumber" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "round_number" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "card_price" NUMERIC DEFAULT 50.00;
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

-- 5. TABLA: recharges y recargas_pago_movil
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

CREATE TABLE IF NOT EXISTS public.recargas_pago_movil (
    id TEXT PRIMARY KEY,
    usuario_id TEXT,
    nombre_usuario TEXT,
    correo TEXT,
    telefono_pagador TEXT,
    cedula_pagador TEXT,
    monto_ves NUMERIC(12, 2) NOT NULL,
    referencia TEXT,
    banco_origen TEXT,
    comprobante_url TEXT,
    estatus TEXT DEFAULT 'pending',
    motivo_rechazo TEXT,
    fecha_procesado TEXT,
    procesado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: withdrawals y solicitudes_retiro (Rastreo integral de retiros y balances)
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

ALTER TABLE public.withdrawals ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "userName" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "userPhone" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS amount_ves NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "amountVes" NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'pago_movil';
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS bank_dest TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "bankDest" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS phone_or_account TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "phoneOrAccount" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS document_id TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "documentId" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS titular_name TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "titularName" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS account_type TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "accountType" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS processed_at TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "processedAt" TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS processed_by TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS "processedBy" TEXT;

CREATE TABLE IF NOT EXISTS public.solicitudes_retiro (
    id TEXT PRIMARY KEY,
    usuario_id TEXT,
    nombre_usuario TEXT,
    correo TEXT,
    telefono TEXT,
    cedula TEXT,
    monto_ves NUMERIC(12, 2) NOT NULL,
    canal TEXT DEFAULT 'pago_movil',
    banco_destino TEXT,
    telefono_o_cuenta TEXT,
    nombre_titular TEXT,
    tipo_cuenta TEXT,
    estatus TEXT DEFAULT 'pending',
    motivo_rechazo TEXT,
    fecha_procesado TEXT,
    procesado_por TEXT,
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

-- 8. TABLA: ledger y movimientos de saldo (Historial inmutable de auditoría de balance)
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

ALTER TABLE public.ledger ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS "userName" TEXT;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS amount_ves NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS "amountVes" NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS balance_before NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS "balanceBefore" NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS balance_after NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS "balanceAfter" NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS "referenceId" TEXT;

-- 9. TABLA: jugadores_bingo
CREATE TABLE IF NOT EXISTS public.jugadores_bingo (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    correo TEXT UNIQUE,
    telefono TEXT,
    cedula TEXT,
    saldo NUMERIC(14, 2) DEFAULT 0.00,
    saldo_bloqueado NUMERIC(14, 2) DEFAULT 0.00,
    rol TEXT DEFAULT 'Player',
    estatus TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLAS ADICIONALES: audit_logs, support_tickets, reclamos
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

-- 11. HABILITAR REALTIME EN PUBLICACIONES
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recharges; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recargas_pago_movil; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cards; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_retiro; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comercial; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.jugadores_bingo; EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- 12. HABILITAR RLS Y POLÍTICAS PERMISIVAS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recargas_pago_movil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_retiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugadores_bingo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['users', 'admin_users', 'rounds', 'cards', 'recharges', 'recargas_pago_movil', 'withdrawals', 'solicitudes_retiro', 'comercial', 'ledger', 'jugadores_bingo', 'audit_logs', 'support_tickets', 'reclamos'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS allow_all_%I ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY allow_all_%I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- 12. RECARGAR CACHÉ DE ESQUEMA POSTGREST
NOTIFY pgrst, 'reload schema';
