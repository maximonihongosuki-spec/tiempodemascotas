/*
  # Remove E-commerce Functionality

  1. Tables to Drop
    - `products` - Product catalog
    - `orders` - Customer orders
    
  2. Changes
    - Drop all related RLS policies
    - Drop tables with CASCADE to handle dependencies
    
  3. Notes
    - This will permanently delete all product and order data
    - Chat, messages, and appointments functionality will remain intact
*/

-- Drop products table and all related policies
DROP TABLE IF EXISTS products CASCADE;

-- Drop orders table and all related policies  
DROP TABLE IF EXISTS orders CASCADE;