-- 034: Reservas VIP — mínimo de consumo y depósito/anticipo por reserva.
-- El local fija, al confirmar una reserva de mesa/reservado, un mínimo de consumo
-- (lo que el grupo se compromete a gastar) y un depósito por adelantado, y marca
-- si ya lo cobró. Idempotente.

ALTER TABLE reservas ADD COLUMN IF NOT EXISTS minimo_consumo NUMERIC(10,2) CHECK (minimo_consumo IS NULL OR minimo_consumo >= 0);
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS deposito NUMERIC(10,2) CHECK (deposito IS NULL OR deposito >= 0);
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS deposito_pagado BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN reservas.minimo_consumo IS 'Mínimo de consumo pactado para la mesa (€). Null = sin mínimo.';
COMMENT ON COLUMN reservas.deposito IS 'Depósito/anticipo por adelantado (€). Null = sin depósito.';
COMMENT ON COLUMN reservas.deposito_pagado IS 'Si el local ya cobró el depósito.';
