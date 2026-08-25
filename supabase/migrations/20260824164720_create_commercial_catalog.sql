-- Migration: create_commercial_catalog
-- Created: 2026-08-24
-- Description: Catálogo comercial — service_pricings, commercial_offers, orders,
--              payments, documents, commissions e promotions.

-- ============================================================
-- 1. Extensões
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. Tabelas
-- ============================================================

-- --------------------------------------------------------
-- service_pricings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_pricings (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type        text      NOT NULL UNIQUE,
    service_name        text      NOT NULL,
    description         text,
    standard_price      integer   NOT NULL CHECK (standard_price > 0),
    promotional_price   integer   NOT NULL CHECK (promotional_price > 0 AND promotional_price <= standard_price),
    is_active           boolean   NOT NULL DEFAULT TRUE,
    valid_from          timestamptz DEFAULT now(),
    valid_until         timestamptz,
    history             jsonb     NOT NULL DEFAULT '[]'::jsonb,
    updated_at          timestamptz DEFAULT now(),
    updated_by          uuid
);

-- --------------------------------------------------------
-- promotions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
    id                  text      PRIMARY KEY,
    name                text      NOT NULL,
    discount_type       text      NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value      integer   NOT NULL CHECK (discount_value > 0),
    applicable_services jsonb     NOT NULL DEFAULT '["all"]'::jsonb,
    status              text      NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    starts_at           timestamptz NOT NULL,
    ends_at             timestamptz NOT NULL,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------
-- commercial_offers
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS commercial_offers (
    id                      uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type            text      NOT NULL,
    stage_id                uuid,
    name                    text      NOT NULL,
    description             text,
    base_amount             integer   NOT NULL CHECK (base_amount > 0),
    promotion_id            text      REFERENCES promotions(id),
    promotion_discount      integer   NOT NULL DEFAULT 0 CHECK (promotion_discount >= 0),
    first_documents_discount integer  NOT NULL DEFAULT 0 CHECK (first_documents_discount >= 0),
    coupon_id               text,
    coupon_discount         integer   NOT NULL DEFAULT 0 CHECK (coupon_discount >= 0),
    final_amount            integer   NOT NULL CHECK (final_amount > 0),
    currency                text      NOT NULL DEFAULT 'BRL',
    document_number         text,
    eligible                boolean   NOT NULL DEFAULT TRUE,
    available               boolean   NOT NULL DEFAULT TRUE,
    requirements            jsonb     NOT NULL DEFAULT '[]'::jsonb,
    created_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------
-- orders
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                      uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 uuid      NOT NULL,
    user_id                 uuid      NOT NULL,
    commercial_offer_id     uuid      REFERENCES commercial_offers(id),
    service_type            text      NOT NULL,
    base_amount             integer   NOT NULL CHECK (base_amount > 0),
    promotion_discount      integer   NOT NULL DEFAULT 0 CHECK (promotion_discount >= 0),
    first_documents_discount integer  NOT NULL DEFAULT 0 CHECK (first_documents_discount >= 0),
    coupon_discount         integer   NOT NULL DEFAULT 0 CHECK (coupon_discount >= 0),
    final_amount            integer   NOT NULL CHECK (final_amount > 0),
    currency                text      NOT NULL DEFAULT 'BRL',
    affiliate_id            uuid,
    commission_amount       integer   NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
    status                  text      NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    created_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------
-- payments
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id                      uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                uuid      NOT NULL,
    case_id                 uuid      NOT NULL,
    gateway                 text      NOT NULL,
    gateway_transaction_id  text,
    amount                  integer   NOT NULL CHECK (amount > 0),
    status                  text      NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
    paid_at                 timestamptz,
    commercial_offer_id     uuid,
    service_type            text,
    created_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------
-- documents
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     uuid      NOT NULL,
    order_id    uuid,
    service_type text     NOT NULL,
    status      text      NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected')),
    created_at  timestamptz DEFAULT now()
);

-- --------------------------------------------------------
-- commissions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS commissions (
    id              uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id  uuid      NOT NULL,
    buyer_user_id   uuid,
    payment_id      uuid,
    case_id         uuid      NOT NULL,
    level           integer   NOT NULL DEFAULT 1 CHECK (level > 0),
    base_amount     integer   NOT NULL CHECK (base_amount > 0),
    commission_amount integer NOT NULL CHECK (commission_amount >= 0),
    status          text      NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'paid', 'reversed')),
    created_at      timestamptz DEFAULT now(),
    available_at    timestamptz,
    paid_at         timestamptz,
    reversed_at     timestamptz,
    reversal_reason text
);

-- ============================================================
-- 3. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_service_pricings_service_type ON service_pricings(service_type);
CREATE INDEX IF NOT EXISTS idx_orders_case_id ON orders(case_id);

-- ============================================================
-- 4. Seed — service_pricings (valores em centavos)
-- ============================================================
INSERT INTO service_pricings
    (service_type, service_name, description, standard_price, promotional_price, is_active, valid_from, history)
VALUES
    ('defesa_previa',         'Defesa Prévia',         'Defesa administrativa em primeira instância.',                                                                       8990,  4495, TRUE, now(), '[]'::jsonb),
    ('recurso_jari',          'Recurso JARI',          'Recurso à Junta de Recurso Administrativo.',                                                                         11990, 5995, TRUE, now(), '[]'::jsonb),
    ('recurso_cetran',        'Recurso CETRAN',        'Recurso ao CETRAN.',                                                                                                 14990, 7495, TRUE, now(), '[]'::jsonb),
    ('suspensao',             'Suspensão',             'Defesa contra suspensão do direito de dirigir.',                                                                     14990, 7495, TRUE, now(), '[]'::jsonb),
    ('cassacao',              'Cassação',              'Defesa contra cassação da CNH.',                                                                                     19990, 9995, TRUE, now(), '[]'::jsonb),
    ('indicacao_condutor',   'Indicação de Condutor', 'Indicação de condutor real para transferência de pontuação.',                                                        4990,  2495, TRUE, now(), '[]'::jsonb),
    ('conversao_advertencia', 'Conversão de Advertência', 'Conversão de advertência por multa.',                                                                            6990,  3495, TRUE, now(), '[]'::jsonb)
ON CONFLICT (service_type) DO NOTHING;

-- ============================================================
-- 5. Seed — promoção de lançamento
-- ============================================================
INSERT INTO promotions
    (id, name, discount_type, discount_value, applicable_services, status, starts_at, ends_at)
VALUES
    ('promo_launch_50', 'Promoção de Lançamento', 'percentage', 50, '["all"]'::jsonb, 'active', now() - INTERVAL '1 day', now() + INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;