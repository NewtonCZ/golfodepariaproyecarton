-- ============================================================================
-- MIGRACIÓN POSTGRESQL: ACTUALIZACIÓN DE TIPOS MONETARIOS A NUMERIC(20,2)
-- Proyecto: Tú Super Cartón (Lotería)
-- Objetivo: Evitar desbordamiento (overflow) en montos grandes en moneda VES
-- y garantizar transaccionalidad ACID con débito inmediato en retiros.
-- ============================================================================

-- 1. Tabla de Usuarios (Saldos y Balances)
ALTER TABLE IF EXISTS users 
  ALTER COLUMN available_balance TYPE NUMERIC(20,2) USING available_balance::NUMERIC(20,2),
  ALTER COLUMN available_balance SET DEFAULT 0.00,
  ALTER COLUMN locked_balance TYPE NUMERIC(20,2) USING locked_balance::NUMERIC(20,2),
  ALTER COLUMN locked_balance SET DEFAULT 0.00,
  ALTER COLUMN pending_balance TYPE NUMERIC(20,2) USING pending_balance::NUMERIC(20,2),
  ALTER COLUMN pending_balance SET DEFAULT 0.00,
  ALTER COLUMN total_won_ves TYPE NUMERIC(20,2) USING total_won_ves::NUMERIC(20,2),
  ALTER COLUMN total_won_ves SET DEFAULT 0.00,
  ALTER COLUMN total_spent_ves TYPE NUMERIC(20,2) USING total_spent_ves::NUMERIC(20,2),
  ALTER COLUMN total_spent_ves SET DEFAULT 0.00,
  ALTER COLUMN balance_ves TYPE NUMERIC(20,2) USING balance_ves::NUMERIC(20,2),
  ALTER COLUMN balance_ves SET DEFAULT 0.00;

-- 2. Tabla de Retiros (Withdrawals)
ALTER TABLE IF EXISTS withdrawals 
  ALTER COLUMN amount_ves TYPE NUMERIC(20,2) USING amount_ves::NUMERIC(20,2);

-- 3. Tabla de Recargas (Recharges)
ALTER TABLE IF EXISTS recharges 
  ALTER COLUMN amount_ves TYPE NUMERIC(20,2) USING amount_ves::NUMERIC(20,2);

-- 4. Tabla de Sorteos / Rondas (Rounds)
ALTER TABLE IF EXISTS rounds 
  ALTER COLUMN jackpot_ves TYPE NUMERIC(20,2) USING jackpot_ves::NUMERIC(20,2),
  ALTER COLUMN jackpot_ves SET DEFAULT 0.00,
  ALTER COLUMN card_price_ves TYPE NUMERIC(20,2) USING card_price_ves::NUMERIC(20,2),
  ALTER COLUMN card_price_ves SET DEFAULT 25.00,
  ALTER COLUMN total_prizes_paid_ves TYPE NUMERIC(20,2) USING total_prizes_paid_ves::NUMERIC(20,2),
  ALTER COLUMN total_prizes_paid_ves SET DEFAULT 0.00,
  ALTER COLUMN net_profit_ves TYPE NUMERIC(20,2) USING net_profit_ves::NUMERIC(20,2),
  ALTER COLUMN net_profit_ves SET DEFAULT 0.00;

-- 5. Tabla de Cartones (Cards)
ALTER TABLE IF EXISTS cards 
  ALTER COLUMN price_ves TYPE NUMERIC(20,2) USING price_ves::NUMERIC(20,2),
  ALTER COLUMN total_prize_ves TYPE NUMERIC(20,2) USING total_prize_ves::NUMERIC(20,2);

-- 6. Tabla del Libro Mayor / Movimientos (Ledger)
ALTER TABLE IF EXISTS wallet_ledger 
  ALTER COLUMN amount_ves TYPE NUMERIC(20,2) USING amount_ves::NUMERIC(20,2),
  ALTER COLUMN balance_before TYPE NUMERIC(20,2) USING balance_before::NUMERIC(20,2),
  ALTER COLUMN balance_after TYPE NUMERIC(20,2) USING balance_after::NUMERIC(20,2);

-- ============================================================================
-- PROCEDIMIENTO ALMACENADO / FUNCIÓN TRANSACCIONAL ACID: SOLICITUD DE RETIRO
-- ============================================================================
CREATE OR REPLACE FUNCTION request_withdrawal_transaction(
    p_user_id TEXT,
    p_amount_ves NUMERIC(20,2),
    p_channel TEXT,
    p_bank_dest TEXT,
    p_phone_or_account TEXT,
    p_document_id TEXT,
    p_titular_name TEXT,
    p_account_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_balance NUMERIC(20,2);
    v_withdrawal_id TEXT;
    v_result JSONB;
BEGIN
    -- Validar monto
    IF p_amount_ves <= 0 THEN
        RAISE EXCEPTION 'El monto a retirar debe ser mayor a 0 Bs.';
    END IF;

    -- PASO A: Bloqueo de fila y verificación de saldo con SELECT FOR UPDATE
    SELECT available_balance INTO v_current_balance
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado (ID: %)', p_user_id;
    END IF;

    IF v_current_balance < p_amount_ves THEN
        RAISE EXCEPTION 'Saldo insuficiente. Saldo disponible actual: % Bs., requerido: % Bs.', 
            TO_CHAR(v_current_balance, 'FM999,999,999,990.00'), 
            TO_CHAR(p_amount_ves, 'FM999,999,999,990.00');
    END IF;

    -- PASO B: Débito inmediato del saldo disponible y transferencia a fondos bloqueados
    UPDATE users
    SET 
        available_balance = available_balance - p_amount_ves,
        locked_balance = locked_balance + p_amount_ves,
        balance_ves = available_balance - p_amount_ves,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- PASO C: INSERT de la solicitud de retiro en estado PENDIENTE
    v_withdrawal_id := 'wth-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);

    INSERT INTO withdrawals (
        id,
        user_id,
        amount_ves,
        channel,
        bank_dest,
        phone_or_account,
        document_id,
        titular_name,
        account_type,
        status,
        created_at
    ) VALUES (
        v_withdrawal_id,
        p_user_id,
        p_amount_ves,
        p_channel,
        p_bank_dest,
        p_phone_or_account,
        p_document_id,
        p_titular_name,
        p_account_type,
        'pending',
        NOW()
    );

    v_result := jsonb_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id,
        'debited_amount', p_amount_ves,
        'remaining_available', v_current_balance - p_amount_ves
    );

    RETURN v_result;
END;
$$;

-- ============================================================================
-- PROCEDIMIENTO ALMACENADO / FUNCIÓN TRANSACCIONAL ACID: RECHAZO / REEMBOLSO
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_withdrawal_transaction(
    p_withdrawal_id TEXT,
    p_reason TEXT,
    p_operator_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_wth RECORD;
    v_user_id TEXT;
    v_amount NUMERIC(20,2);
BEGIN
    SELECT * INTO v_wth
    FROM withdrawals
    WHERE id = p_withdrawal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud de retiro no encontrada (ID: %)', p_withdrawal_id;
    END IF;

    IF v_wth.status != 'pending' THEN
        RAISE EXCEPTION 'La solicitud no está en estado pendiente (Estado actual: %)', v_wth.status;
    END IF;

    v_user_id := v_wth.user_id;
    v_amount := v_wth.amount_ves;

    -- Reembolso atómico al saldo disponible
    UPDATE users
    SET 
        available_balance = available_balance + v_amount,
        locked_balance = GREATEST(0::NUMERIC(20,2), locked_balance - v_amount),
        balance_ves = available_balance + v_amount,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Actualización de la solicitud a RECHAZADA
    UPDATE withdrawals
    SET 
        status = 'rejected',
        rejection_reason = p_reason,
        processed_at = NOW(),
        processed_by = p_operator_role
    WHERE id = p_withdrawal_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Retiro rechazado y saldo reembolsado exitosamente',
        'refunded_amount', v_amount
    );
END;
$$;
