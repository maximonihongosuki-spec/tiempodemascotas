/*
  # Add Installment Columns to Credit Payments

  1. Changes to credit_payments table
    - Add `installment_number` (integer) - Number of the installment (1, 2, 3...)
    - Add `due_date` (date) - Date when installment is due
    - Add `status` (text) - Payment status (pending, paid, overdue)
    - Add `promissory_note_status` (text) - Promissory note status (pending, signed, filed)

  2. Notes
    - These columns allow tracking individual installments for credit sales
    - Each sale can have multiple installment records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_payments' AND column_name = 'installment_number'
  ) THEN
    ALTER TABLE credit_payments ADD COLUMN installment_number integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_payments' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE credit_payments ADD COLUMN due_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_payments' AND column_name = 'status'
  ) THEN
    ALTER TABLE credit_payments ADD COLUMN status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_payments' AND column_name = 'promissory_note_status'
  ) THEN
    ALTER TABLE credit_payments ADD COLUMN promissory_note_status text DEFAULT 'pending';
  END IF;
END $$;
