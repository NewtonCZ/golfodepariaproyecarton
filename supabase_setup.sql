-- ==============================================================================
-- TUSUPERCARTON - ESQUEMA Y COMPATIBILIDAD SUPABASE (100% NO DESTRUCTIVO)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: rounds (crear si no existe y asegurar compatibilidad de ID como TEXT)
CREATE TABLE IF NOT EXISTS public.rounds (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la columna id fue creada originalmente como UUID, convertirla a TEXT de forma segura
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.rounds ALTER COLUMN id TYPE TEXT USING id::text;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "roundNumber" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "round_number" INTEGER DEFAULT 1;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "cardPriceVes" NUMERIC DEFAULT 50.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "card_price_ves" NUMERIC DEFAULT 50.00;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "card_price" NUMERIC DEFAULT 50.00;
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
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "openBetAt" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "open_bet_at" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "closeBetAt" TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS "close_bet_at" TEXT;

-- Semilla de Sorteos Programados (si la tabla está vacía) para visualización instantánea en el panel del jugador
INSERT INTO public.rounds (
    id, title, status, "order", "round_number", "card_price_ves", "jackpot_ves", "prize_percentage",
    starts_at, ends_at, draw_at, open_bet_at, close_bet_at, drawn_fichas
)
VALUES
    ('round-102', 'Sorteo Estelar Tarde #102', 'open', 1, 102, 25.00, 15000.00, 70.00,
     (NOW() - INTERVAL '30 minutes')::text, (NOW() + INTERVAL '45 minutes')::text, (NOW() + INTERVAL '50 minutes')::text,
     (NOW() - INTERVAL '30 minutes')::text, (NOW() + INTERVAL '45 minutes')::text, '[]'::jsonb),
    ('round-103', 'Gran Sorteo Nocturno #103', 'scheduled', 2, 103, 30.00, 25000.00, 75.00,
     (NOW() + INTERVAL '1 hour')::text, (NOW() + INTERVAL '3 hours')::text, (NOW() + INTERVAL '3 hours 10 minutes')::text,
     (NOW() + INTERVAL '1 hour')::text, (NOW() + INTERVAL '3 hours')::text, '[]'::jsonb),
    ('round-104', 'Sorteo Madrugada Millonario #104', 'scheduled', 3, 104, 20.00, 20000.00, 80.00,
     (NOW() + INTERVAL '4 hours')::text, (NOW() + INTERVAL '6 hours')::text, (NOW() + INTERVAL '6 hours 15 minutes')::text,
     (NOW() + INTERVAL '4 hours')::text, (NOW() + INTERVAL '6 hours')::text, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. TABLA: users (sin foreign keys restrictivas + campos de mayoría de edad y KYC)
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
    birth_date TEXT,
    fecha_nacimiento TEXT,
    is_of_age BOOLEAN DEFAULT TRUE,
    age_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    kyc_status TEXT DEFAULT 'Aprobado',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fecha_nacimiento TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_of_age BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'Aprobado';

-- 2.1 TABLA: jugadores_bingo (utilizada para sincronización directa de perfil y saldo)
CREATE TABLE IF NOT EXISTS public.jugadores_bingo (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT,
    cedula TEXT,
    correo TEXT,
    telefono TEXT,
    fecha_nacimiento TEXT,
    fecha_registro TEXT,
    password TEXT,
    saldo NUMERIC(14, 2) DEFAULT 0.00,
    is_of_age BOOLEAN DEFAULT TRUE,
    age_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jugadores_bingo ADD COLUMN IF NOT EXISTS saldo NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.jugadores_bingo ADD COLUMN IF NOT EXISTS is_of_age BOOLEAN DEFAULT TRUE;
ALTER TABLE public.jugadores_bingo ADD COLUMN IF NOT EXISTS fecha_nacimiento TEXT;
ALTER TABLE public.jugadores_bingo ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ DEFAULT NOW();

-- 2.2 TABLA: jugadores (tabla alternativa de respaldo de jugadores)
CREATE TABLE IF NOT EXISTS public.jugadores (
    id TEXT PRIMARY KEY,
    nombre TEXT,
    cedula TEXT,
    correo TEXT,
    telefono TEXT,
    saldo NUMERIC(14, 2) DEFAULT 0.00,
    fecha_nacimiento TEXT,
    is_of_age BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS saldo NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS is_of_age BOOLEAN DEFAULT TRUE;

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

ALTER TABLE public.recharges ADD COLUMN IF NOT EXISTS monto_ves NUMERIC(12, 2);
ALTER TABLE public.recharges ADD COLUMN IF NOT EXISTS monto NUMERIC(12, 2);
ALTER TABLE public.recharges ADD COLUMN IF NOT EXISTS referencia TEXT;
ALTER TABLE public.recharges ADD COLUMN IF NOT EXISTS banco TEXT;

-- 5.1 TABLA: recargas_pago_movil (tabla de auditoría y conciliación de Pago Móvil)
CREATE TABLE IF NOT EXISTS public.recargas_pago_movil (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    usuario_id TEXT,
    usuario_nombre TEXT,
    usuario_email TEXT,
    monto_ves NUMERIC(12, 2) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL,
    referencia TEXT,
    banco TEXT,
    banco_origen TEXT,
    pagador_nombre TEXT,
    pagador_ci TEXT,
    cedula_pagador TEXT,
    telefono_pagador TEXT,
    comprobante_url TEXT,
    voucher_url TEXT,
    estado TEXT DEFAULT 'pendiente',
    estatus TEXT DEFAULT 'pendiente',
    motivo_rechazo TEXT,
    fecha_procesado TEXT,
    procesado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recargas_pago_movil ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.recargas_pago_movil ADD COLUMN IF NOT EXISTS usuario_id TEXT;
ALTER TABLE public.recargas_pago_movil ADD COLUMN IF NOT EXISTS monto_ves NUMERIC(12, 2);
ALTER TABLE public.recargas_pago_movil ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente';
ALTER TABLE public.recargas_pago_movil ADD COLUMN IF NOT EXISTS estatus TEXT DEFAULT 'pendiente';

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
    reference_number TEXT,
    processed_at TEXT,
    processed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS banco_destino TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS telefono_o_cuenta TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS cedula_titular TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS nombre_titular TEXT;

-- 6.1 TABLA: retiros (esquema en español para auditoría contable y compatibilidad)
CREATE TABLE IF NOT EXISTS public.retiros (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    usuario_id TEXT,
    usuario_nombre TEXT,
    monto_ves NUMERIC(12, 2) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL,
    canal TEXT DEFAULT 'pago_movil',
    banco_destino TEXT,
    telefono_o_cuenta TEXT,
    cedula_titular TEXT,
    nombre_titular TEXT,
    tipo_cuenta TEXT,
    estado TEXT DEFAULT 'pendiente',
    estatus TEXT DEFAULT 'pendiente',
    motivo_rechazo TEXT,
    referencia TEXT,
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

-- 8.1 TABLA: otp_codes (códigos de seguridad y verificación)
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
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
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recargas_pago_movil; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cards; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.retiros; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comercial; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.jugadores_bingo; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.users; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger; EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- 11. HABILITAR RLS Y POLÍTICAS PERMISIVAS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugadores_bingo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recargas_pago_movil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'users', 'jugadores_bingo', 'jugadores', 'admin_users', 'rounds', 'cards',
        'recharges', 'recargas_pago_movil', 'withdrawals', 'retiros', 'comercial',
        'ledger', 'otp_codes', 'audit_logs', 'support_tickets', 'reclamos'
    ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS allow_all_%I ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY allow_all_%I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- 12. RECARGAR CACHÉ DE ESQUEMA POSTGREST
NOTIFY pgrst, 'reload schema';
