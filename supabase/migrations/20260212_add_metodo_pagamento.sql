-- Add metodo_pagamento column to agendamentos table
-- This field is required for tracking payment methods in completed services

ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro' CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'cartao'));

-- Add comment to explain the column
COMMENT ON COLUMN agendamentos.metodo_pagamento IS 'Payment method used for the appointment: dinheiro (cash), pix, or cartao (card)';
