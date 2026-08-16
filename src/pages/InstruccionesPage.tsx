import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type AIInstruction = {
  instruction_key: string;
  instruction_text: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  active: boolean;
};

export default function InstruccionesPage() {
  const [instructions, setInstructions] = useState<AIInstruction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: instructionsData } = await supabase
        .from('ai_instructions')
        .select('instruction_key, instruction_text')
        .eq('is_active', true);

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, category, active')
        .eq('active', true)
        .order('name');

      setInstructions(instructionsData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#6b4e3d] mb-8">
          Instrucciones para Asistente de IA
        </h1>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#6b4e3d] mb-4">
            Instrucciones del Sistema
          </h2>

          {instructions.length === 0 ? (
            <p className="text-gray-600">No hay instrucciones activas configuradas.</p>
          ) : (
            <div className="space-y-6">
              {instructions.map((instruction) => (
                <div key={instruction.instruction_key} className="border-l-4 border-[#c19a89] pl-4">
                  <h3 className="font-semibold text-lg text-[#6b4e3d] mb-2">
                    {instruction.instruction_key}
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {instruction.instruction_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#6b4e3d] mb-4">
            Catálogo de Productos Disponibles
          </h2>

          {products.length === 0 ? (
            <p className="text-gray-600">No hay productos disponibles.</p>
          ) : (
            <div className="space-y-6">
              {products.map((product) => (
                <div key={product.id} className="border border-[#c19a89] rounded-lg p-4">
                  <div className="flex gap-4">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-32 h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/150?text=Sin+imagen';
                      }}
                    />

                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-[#6b4e3d] mb-2">
                        {product.name}
                      </h3>

                      <p className="text-gray-700 mb-2">
                        {product.description}
                      </p>

                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-[#c19a89]">
                          ${product.price.toLocaleString()}
                        </span>

                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
                          {product.category}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="text-sm text-gray-600">
                          <strong>URL del producto:</strong>{' '}
                          <a
                            href={`${window.location.origin}/?product=${product.id}`}
                            className="text-[#c19a89] hover:underline"
                          >
                            {window.location.origin}/?product={product.id}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-[#6b4e3d] mb-2">
            Nota para desarrolladores
          </h3>
          <p className="text-sm text-gray-600">
            Esta página está diseñada para ser consultada por sistemas de IA.
            Contiene las instrucciones activas y el catálogo completo de productos disponibles
            con sus URLs correspondientes.
          </p>
        </div>
      </div>
    </div>
  );
}
