/*
  # Create E-commerce Tables

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, required) - Product name
      - `description` (text) - Product description
      - `price` (numeric, required) - Product price
      - `category` (text) - Product category
      - `image_url` (text) - Product image URL
      - `stock` (integer, default 0) - Available stock
      - `active` (boolean, default true) - Whether product is visible
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `orders`
      - `id` (uuid, primary key)
      - `customer_name` (text, required) - Customer name for pickup
      - `customer_email` (text) - Customer email
      - `customer_phone` (text) - Customer phone
      - `items` (jsonb, required) - Array of order items
      - `total` (numeric, required) - Total order amount
      - `status` (text, default 'pending') - Order status
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz) - Order timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on all tables
    - Allow public read access to active products
    - Allow public insert to orders
    - No public update/delete access
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL CHECK (price >= 0),
  category text DEFAULT 'general',
  image_url text DEFAULT '',
  stock integer DEFAULT 0 CHECK (stock >= 0),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  total numeric NOT NULL CHECK (total >= 0),
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Products policies - Allow public read of active products
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (active = true);

-- Orders policies - Allow public insert for customer orders
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);