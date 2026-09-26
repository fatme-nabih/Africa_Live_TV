-- Phase 1: Modèle de données paiement - Migration sécurisée (expand/contract)

-- On supprime l'ancienne PK (order_id)
ALTER TABLE "naboopay_transactions" DROP CONSTRAINT "naboopay_transactions_pkey";
ALTER TABLE "naboopay_transactions" ALTER COLUMN "order_id" DROP NOT NULL;
ALTER TABLE "naboopay_transactions" ALTER COLUMN "payload" SET DEFAULT '{}'::jsonb;

-- Step 1: Ajouter les nouvelles colonnes comme nullables
ALTER TABLE "naboopay_transactions" ADD COLUMN "id" text;
ALTER TABLE "naboopay_transactions" ADD COLUMN "checkout_attempt_id" text;
ALTER TABLE "naboopay_transactions" ADD COLUMN "provider_order_id" text;
ALTER TABLE "naboopay_transactions" ADD COLUMN "idempotency_key" text;
ALTER TABLE "naboopay_transactions" ADD COLUMN "currency" text DEFAULT 'XOF';
ALTER TABLE "naboopay_transactions" ADD COLUMN "provider_status" text;
ALTER TABLE "naboopay_transactions" ADD COLUMN "checkout_url" text;
ALTER TABLE "naboopay_transactions" ADD COLUMN "provider_created_at" timestamp with time zone;
ALTER TABLE "naboopay_transactions" ADD COLUMN "paid_at" timestamp with time zone;

-- Step 2: Backfiller les lignes historiques
UPDATE "naboopay_transactions" SET
  "id" = "order_id",
  "checkout_attempt_id" = "order_id",
  "idempotency_key" = "order_id",
  "currency" = COALESCE("currency", 'XOF')
WHERE "id" IS NULL;

-- Step 3: Vérifier qu’aucune ligne invalide ne subsiste
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "naboopay_transactions" WHERE "id" IS NULL OR "checkout_attempt_id" IS NULL OR "idempotency_key" IS NULL) THEN
    RAISE EXCEPTION 'Des lignes non backfillées subsistent.';
  END IF;
END $$;

-- Step 5: Ajouter NOT NULL *avant* la PK
ALTER TABLE "naboopay_transactions" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "naboopay_transactions" ALTER COLUMN "checkout_attempt_id" SET NOT NULL;
ALTER TABLE "naboopay_transactions" ALTER COLUMN "idempotency_key" SET NOT NULL;
ALTER TABLE "naboopay_transactions" ALTER COLUMN "currency" SET NOT NULL;

-- Step 4: Ajouter les contraintes d’unicité et PK
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "naboopay_transactions_provider_order_uidx" ON "naboopay_transactions" USING btree ("provider_order_id") WHERE "naboopay_transactions"."provider_order_id" IS NOT NULL;
CREATE INDEX "naboopay_transactions_provider_order_id_idx" ON "naboopay_transactions" USING btree ("provider_order_id");
CREATE INDEX "naboopay_transactions_user_checkout_idx" ON "naboopay_transactions" USING btree ("user_id","checkout_attempt_id");
CREATE INDEX "naboopay_transactions_status_updated_idx" ON "naboopay_transactions" USING btree ("status","updated_at");
CREATE INDEX "naboopay_transactions_user_created_idx" ON "naboopay_transactions" USING btree ("user_id","created_at" DESC NULLS LAST);

ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_checkout_attempt_uidx" UNIQUE("checkout_attempt_id");
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_user_idempotency_uidx" UNIQUE("user_id","idempotency_key");
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_amount_check" CHECK ("naboopay_transactions"."amount" > 0);
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_currency_check" CHECK ("naboopay_transactions"."currency" = 'XOF');
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_plan_code_check" CHECK ("naboopay_transactions"."plan_code" in ('lumina_all_access_monthly', 'lumina_all_access_annual'));
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_status_check" CHECK ("naboopay_transactions"."status" in ('creating', 'pending', 'completed', 'failed', 'canceled', 'reconciliation_required'));
