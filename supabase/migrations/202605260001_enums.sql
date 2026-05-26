create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type product_status as enum ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'ARCHIVED');
create type sale_status as enum ('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED');
create type collection_status as enum ('PENDING', 'UP_TO_DATE', 'OVERDUE', 'PAID');
create type payment_plan_type as enum ('FULL_PAYMENT', 'INSTALLMENTS');
create type installment_status as enum ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
create type payment_method as enum ('CASH', 'BANK_TRANSFER', 'MERCADO_PAGO', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER');
create type payment_status as enum ('PENDING', 'CONFIRMED', 'VOIDED');
create type allocation_status as enum ('ACTIVE', 'VOIDED');
create type app_role as enum ('ADMIN', 'STAFF', 'CUSTOMER');
