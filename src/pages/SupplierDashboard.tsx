// Add React import to use React.FormEvent and React.ChangeEvent
import React, { useState, useEffect } from 'react';
import { Package, Upload, Plus, Edit2, Trash2, LogOut, FileUp, Image } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';
import { isSupplierAuthenticated, logout } from '../lib/auth';
import { parseProductCSV, formatPrice, generateProductCode } from '../lib/csvParser';
import { uploadImageToStorage, assertNoBase64 } from '../lib/imageUpload';

export default function SupplierDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');

  const [formData, setFormData] = useState({
    product_code: '',
    external_code: '',
    name: '',
    description: '',
    price: 0,
    category: '',
    image_url: '',
    uploaded_image_url: '',
    stock: 0,
    brand: '',
    location: 'GUARDA PROVEEDOR',
    cost: 0,
    wholesale_price: 0
  });

  useEffect(() => {
    if (!isSupplierAuthenticated()) {
      window.location.href = '/proveedores';
      return;
    }
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .not('supplier_id', 'is', null)
      .order('created_at', { ascending: false });

    if (data) setProducts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productData = {
        product_code: formData.product_code.trim(),
        external_code: formData.external_code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        category: formData.category.toLowerCase(),
        image_url: imageSource === 'url' ? (formData.image_url.trim() || '') : '',
        uploaded_image_url: imageSource === 'upload' ? (formData.uploaded_image_url.trim() || '') : '',
        stock: Number(formData.stock),
        brand: formData.brand.trim(),
        location: 'GUARDA PROVEEDOR', // Always force location for suppliers
        cost: Number(formData.cost),
        wholesale_price: Number(formData.wholesale_price),
        supplier_id: '00000000-0000-0000-0000-000000000001',
        delivery_time_hours: 24,
        active: true
      };

      assertNoBase64(productData);

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        alert('Producto actualizado');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        alert('Producto agregado');
      }

      setFormData({
        product_code: '',
        external_code: '',
        name: '',
        description: '',
        price: 0,
        category: '',
        image_url: '',
        uploaded_image_url: '',
        stock: 0,
        brand: '',
        location: 'GUARDA PROVEEDOR',
        cost: 0,
        wholesale_price: 0
      });
      setImageSource('url');
      setEditingProduct(null);
      setShowAddForm(false);
      loadProducts();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Producto eliminado');
      loadProducts();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      product_code: product.product_code,
      external_code: product.external_code || '',
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image_url: product.image_url,
      uploaded_image_url: product.uploaded_image_url || '',
      stock: product.stock,
      brand: product.brand || '',
      location: 'GUARDA PROVEEDOR',
      cost: product.cost || 0,
      wholesale_price: product.wholesale_price || 0
    });
    setImageSource(product.uploaded_image_url ? 'upload' : 'url');
    setShowAddForm(true);
  };

  const handleCSVUpload = async () => {
    try {
      if (!csvText.trim()) {
        alert('Por favor ingresa el contenido CSV');
        return;
      }

      const parsedProducts = parseProductCSV(csvText, 'GUARDA PROVEEDOR');

      if (parsedProducts.length === 0) {
        alert('No se encontraron productos válidos en el CSV');
        return;
      }

      const productsToInsert = parsedProducts.map(product => ({
        product_code: generateProductCode(), // Generate new web code
        external_code: product.external_code, // Store original CSV code as external_code
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category.toLowerCase(),
        image_url: '',
        uploaded_image_url: '',
        stock: product.stock,
        brand: product.brand,
        location: 'GUARDA PROVEEDOR', // Always force location for suppliers
        cost: product.cost,
        wholesale_price: product.wholesale_price,
        supplier_id: '00000000-0000-0000-0000-000000000001',
        delivery_time_hours: 24,
        active: true
      }));

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;

      alert(`${productsToInsert.length} productos cargados exitosamente`);
      setCsvText('');
      setShowCSVUpload(false);
      loadProducts();
    } catch (error: any) {
      alert('Error al cargar CSV: ' + error.message);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('El archivo es muy grande. Máximo 5MB');
      return;
    }

    try {
      const url = await uploadImageToStorage(file, 'product-images');
      setFormData(prev => ({ ...prev, uploaded_image_url: url }));
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Error al cargar la imagen: ' + error.message);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/proveedores';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-black to-gray-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Panel de Proveedores</h1>
              <p className="text-sm opacity-90">PC Marketing - Gestión de Productos</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Mis Productos</h2>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowCSVUpload(!showCSVUpload);
                setShowAddForm(false);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FileUp className="w-5 h-5" />
              <span>Cargar CSV</span>
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowCSVUpload(false);
                setEditingProduct(null);
                setFormData({
                  product_code: '',
                  external_code: '',
                  name: '',
                  description: '',
                  price: 0,
                  category: '',
                  image_url: '',
                  uploaded_image_url: '',
                  stock: 0,
                  brand: '',
                  location: 'GUARDA PROVEEDOR',
                  cost: 0,
                  wholesale_price: 0
                });
                setImageSource('url');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-black text-white rounded-lg hover:opacity-90 font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Agregar Producto</span>
            </button>
          </div>
        </div>

        {showCSVUpload && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Cargar Productos desde CSV</h3>
            <p className="text-sm text-gray-600 mb-4">
              Formato: CODIGO;DESCRIPCION;COSTO;PRECIO MINORISTA;PRECIO VETERINARIO;CANTIDAD;FAMILIA;MARCA;LOCALIDAD;Imagen del producto
              <br />
              Ejemplo: P001;Producto de muestra;50.000;100.000;80.000;10;MUEBLES;MARCA;GUARDA PROVEEDOR;
              <br />
              <strong>Nota:</strong> La ubicación siempre se establece como "GUARDA PROVEEDOR" para productos de proveedores.
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder="Pega aquí tu CSV..."
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleCSVUpload}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Upload className="w-5 h-5 inline mr-2" />
                Cargar Productos
              </button>
              <button
                onClick={() => setShowCSVUpload(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Web
                  </label>
                  <input
                    type="text"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="PRD-XXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Externo (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.external_code}
                    onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Código del proveedor o sistema externo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo (₲)
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Minorista (₲)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Veterinario (₲)
                  </label>
                  <input
                    type="number"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Imagen del Producto</label>

                <div className="flex space-x-4 mb-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={imageSource === 'url'}
                      onChange={() => setImageSource('url')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">URL de Imagen</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={imageSource === 'upload'}
                      onChange={() => setImageSource('upload')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Subir Archivo</span>
                  </label>
                </div>

                {imageSource === 'url' ? (
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://..."
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.uploaded_image_url && (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <Image className="w-4 h-4" />
                        <span>Imagen cargada correctamente</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-black text-white rounded-lg hover:opacity-90 font-semibold"
                >
                  {editingProduct ? 'Actualizar' : 'Agregar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingProduct(null);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Códigos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className="text-xs font-mono bg-red-600/10 text-red-600 px-2 py-1 rounded block">
                        Web: {product.product_code}
                      </span>
                      {product.external_code && (
                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded block">
                          Ext: {product.external_code}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {(product.image_url || product.uploaded_image_url) && (
                        <img
                          src={product.uploaded_image_url || product.image_url}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-semibold">₲ {product.price.toLocaleString('es-PY')}</td>
                  <td className="px-6 py-4 text-sm">{product.stock}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>No hay productos registrados</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}