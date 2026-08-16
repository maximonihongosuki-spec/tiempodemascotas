'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase, Product } from '../lib/supabase';
import { pgContains, pgOverlaps } from '../lib/pgArrayFilter';
import { ShoppingCart, Search, Filter, X, Star, PawPrint } from 'lucide-react';
import Cart from './Cart';
import { useCart } from './CartProvider';
import { ProductGridCard } from './ProductGrid';
import { Breadcrumbs } from './Breadcrumbs';

type Props = {
  initialProducts: Product[];
  initialCategories: {id: string, name: string, type: string, parent_id: string | null}[];
  showOutOfStock: boolean;
  currentPage?: number;
  totalCount?: number;
};

const SELECT_FIELDS = 'id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, category_general, category_specific, category_sub_specific, category_species, category_brand, url_slug, product_code, is_parent, is_featured, requires_prescription, parent_product_id, tags, category_age, is_bulk';

export default function AllProductsClient({ 
  initialProducts, 
  initialCategories, 
  showOutOfStock,
  currentPage = 1,
  totalCount = 0
}: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isServerFiltered, setIsServerFiltered] = useState(false);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 48;
  const [hasMore, setHasMore] = useState(initialProducts.length === PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSpecific, setSelectedSpecific] = useState<string>('all');
  const [selectedSubSpecific, setSelectedSubSpecific] = useState<string>('all');
  const [selectedDetail, setSelectedDetail] = useState<string>('all');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [categories, setCategories] = useState<{id: string, name: string, type: string, parent_id: string | null}[]>(initialCategories);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'name'>('relevance');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [openDropdown, setOpenDropdown] = useState<'category' | 'specific' | 'subSpecific' | 'detail' | 'species' | 'brand' | 'price' | null>(null);
  const [brandSearch, setBrandSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { cartItems, setCartItems, isCartOpen, setIsCartOpen } = useCart();

  const isMounted = useRef(false);

  const searchServerSide = async (term: string) => {
    try {
      setLoading(true);
      
      let searchWords = term.trim().split(/\s+/).filter(w => w.length >= 2);
      if (searchWords.length === 0 && term.trim().length > 0) {
        searchWords = [term.trim()];
      }

      const searchColumns = ['name', 'public_name', 'product_code', 'description', 'description_ai_enhanced', 'category_brand', 'category_sub_specific'];
      
      // Parte 1: productos sueltos que matcheen directamente
      let standaloneQuery = supabase
        .from('products')
        .select(SELECT_FIELDS)
        .eq('active', true)
        .eq('is_parent', false)
        .is('parent_product_id', null);

      for (const word of searchWords) {
        const orClause = searchColumns.map(col => `${col}.ilike.%${word}%`).join(',');
        standaloneQuery = standaloneQuery.or(orClause);
      }

      // Parte 2: hijos de grupos que matcheen (para saber qué padres incluir)
      let childMatchQuery = supabase
        .from('products')
        .select('parent_product_id, stock')
        .eq('active', true)
        .eq('is_parent', false)
        .not('parent_product_id', 'is', null);

      for (const word of searchWords) {
        const orClause = searchColumns.map(col => `${col}.ilike.%${word}%`).join(',');
        childMatchQuery = childMatchQuery.or(orClause);
      }

      if (!showOutOfStock) {
        childMatchQuery = childMatchQuery.gt('stock', 0);
      }

      const [{ data: standaloneData, error: errA }, { data: matchingChildren, error: errB }] =
        await Promise.all([standaloneQuery, childMatchQuery]);

      if (errA) throw errA;
      if (errB) throw errB;

      const parentIdsWithMatch = Array.from(new Set(
        (matchingChildren || []).map((c: any) => c.parent_product_id).filter(Boolean)
      ));

      let parentData: any[] = [];
      if (parentIdsWithMatch.length > 0) {
        const { data, error: errC } = await supabase
          .from('products')
          .select(SELECT_FIELDS)
          .eq('active', true)
          .eq('is_parent', true)
          .in('id', parentIdsWithMatch);
        if (errC) throw errC;
        parentData = data || [];
      }

      const combined = [...(standaloneData || []), ...parentData];

      const finalFiltered = (combined as any[]).filter(p => {
        if (p.is_parent) return true; // ya viene garantizado que tiene al menos 1 hijo válido
        return showOutOfStock || (p.stock || 0) > 0;
      }) as Product[];

      setProducts(finalFiltered);
      setHasMore(false); // resultado de búsqueda completo, sin paginación adicional
    } catch (err) {
      console.error('Error in searchServerSide:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const handler = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        searchServerSide(searchTerm.trim());
      } else {
        loadProducts(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const filters: any = {};
    let hasUrlFilters = false;

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);

      const queryParam = urlParams.get('q');
      if (queryParam) {
        setSearchTerm(queryParam);
        hasUrlFilters = true;
      }

      const catGen = urlParams.get('cat_gen');
      if (catGen) {
        // Mapa de vinculación: nombre del megamenú → valores reales en DB
        const CAT_GEN_MAP: Record<string, string> = {
          'Farmacia': 'Salud y Farmacia Veterinaria|Medicina y Cuidado',
          'Salud y Farmacia Veterinaria': 'Salud y Farmacia Veterinaria|Medicina y Cuidado',
          'Medicina y Cuidado': 'Medicina y Cuidado',
          'Alimentos Balanceados y Húmedos': 'Alimentos Balanceados y Húmedos',
          'Alimento': 'Alimentos Balanceados y Húmedos',
          'Accesorios': 'Accesorios|Accesorios Varios',
          'Accesorios Varios': 'Accesorios Varios',
          'Cuidado, Higiene y Bienestar': 'Cuidado, Higiene y Bienestar',
          'Varios': 'Varios',
          'Jardinería': 'Jardinería',
        };
        const mappedGen = CAT_GEN_MAP[catGen] ?? catGen;
        setSelectedCategory(mappedGen.split('|')[0]);
        filters.catGen = mappedGen;
        hasUrlFilters = true;
      }

      const catSpec = urlParams.get('cat_spec');
      if (catSpec) {
        // Mapa de vinculación: nombre del megamenú → valores reales en DB
        const CAT_SPEC_MAP: Record<string, string> = {
          'Alimento Balanceado': 'Alimento Balanceado|Balanceado',
          'Shampoo y acondicionadores': 'Shampoo/acondicionadores/jabón',
          'Perfumes': 'Perfumes|Perfumes/colonia/loción',
          'Snacks, premios y galletas': 'Snacks, premios y galletas',
          'Mochilas, bolsos y transportadores': 'Mochilas, bolsos y transportadores',
          'casas, jaulas, corrales': 'casas, jaulas, corrales',
          'ropa': 'ropa',
          'Juguetes': 'Juguetes',
        };
        const mappedSpec = CAT_SPEC_MAP[catSpec] ?? catSpec;
        setSelectedSpecific(mappedSpec.split('|')[0]);
        filters.catSpec = mappedSpec;
        hasUrlFilters = true;
      }

      const species = urlParams.get('species');
      if (species) {
        setSelectedSpecies(species);
        filters.species = species;
        hasUrlFilters = true;
      }

      const brand = urlParams.get('brand');
      if (brand) {
        setSelectedBrand(brand);
        filters.brand = brand;
        hasUrlFilters = true;
      }

      const age = urlParams.get('age');
      if (age) {
        filters.age = age;
        hasUrlFilters = true;
      }

      const bulk = urlParams.get('bulk');
      if (bulk) {
        filters.bulk = bulk;
        hasUrlFilters = true;
      }

      const catSubSpec = urlParams.get('cat_sub_spec');
      if (catSubSpec) {
        setSelectedSubSpecific(catSubSpec);
        filters.catSubSpec = catSubSpec;
        hasUrlFilters = true;
      }

      const catDetail = urlParams.get('cat_detail');
      if (catDetail) {
        setSelectedDetail(catDetail);
        filters.catDetail = catDetail;
        hasUrlFilters = true;
      }

      const condition = urlParams.get('condition');
      if (condition) {
        // Mapa de vinculación para condiciones
        const CONDITION_MAP: Record<string, string> = {
          'Obesidad y Diabetes': 'Obesidad|Diabético',
          'Recuperación': 'recuperacion',
          'recuperacion': 'recuperacion',
          'Articular / Motriz': 'Articular/Movilidad',
        };
        const mappedCond = CONDITION_MAP[condition] ?? condition;
        filters.condition = mappedCond;
        hasUrlFilters = true;
      }

      const prescription = urlParams.get('prescription');
      if (prescription) {
        filters.prescription = prescription;
        hasUrlFilters = true;
      }

    }

    const hasSpecificFilters = !!(filters.species || filters.catSpec || filters.catSubSpec || filters.catDetail ||
      filters.brand || filters.age || filters.bulk === 'true' || filters.catGen ||
      filters.condition || filters.prescription === 'true');

    if (hasSpecificFilters) {
      setLoading(true);
      loadProducts(false, filters);
    } else if (hasUrlFilters && !filters.catGen && !filters.catSpec && !filters.catSubSpec && !filters.catDetail && !filters.species && !filters.brand && !filters.age && !filters.bulk && !filters.condition && !filters.prescription) {
      // It only has 'q' parameter. Let the debounced effect handle search.
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, []);

  const loadProducts = async (append = false, filters?: {
    catGen?: string;
    catSpec?: string;
    catSubSpec?: string;
    catDetail?: string;
    species?: string;
    brand?: string;
    age?: string;
    bulk?: string;
    condition?: string;
    prescription?: string;
  }) => {
    try {
      if (append) setLoadingMore(true);

      const hasSpecificFilters = !!(filters && (
        filters.species || filters.catSpec || filters.catSubSpec || filters.catDetail || filters.brand || filters.age || filters.bulk === 'true' || filters.catGen || filters.condition || filters.prescription === 'true'
      ));

      // ═══════════════════════════════════════════════════════
      // CASO A: hay filtros específicos (típicamente desde el megamenú)
      // Búsqueda en dos partes: sueltos + grupos con hijos que matcheen
      // ═══════════════════════════════════════════════════════
      if (hasSpecificFilters && !append) {
        const applyFilters = (q: any) => {

          // category_species — array en DB, usar contains
          if (filters?.species) {
            q = pgContains(q, 'category_species', [filters.species]);
          }

          // category_specific — array en DB, puede venir con pipe para múltiples valores
          if (filters?.catSpec) {
            const specs = filters.catSpec.split('|').map((s: string) => s.trim()).filter(Boolean);
            if (specs.length === 1) {
              q = pgContains(q, 'category_specific', [specs[0]]);
            } else {
              // OR entre múltiples específicas usando overlaps
              q = pgOverlaps(q, 'category_specific', specs);
            }
          }

          // category_sub_specific — columna TEXT plana en DB (no array)
          // usamos ilike para matchear tanto texto plano como JSON serializado
          if (filters?.catSubSpec) {
            q = q.ilike('category_sub_specific', `%${filters.catSubSpec}%`);
          }

          if (filters?.catDetail) {
            q = pgContains(q, 'category_detail', [filters.catDetail]);
          }

          // category_brand — columna text simple
          if (filters?.brand) {
            q = q.eq('category_brand', filters.brand);
          }

          // category_age — array en DB, usar contains
          if (filters?.age) {
            q = pgContains(q, 'category_age', [filters.age]);
          }

          // is_bulk — boolean
          if (filters?.bulk === 'true') {
            q = q.eq('is_bulk', true);
          }

          // category_general — array en DB, puede venir con pipe para múltiples valores
          if (filters?.catGen) {
            const gens = filters.catGen.split('|').map((s: string) => s.trim()).filter(Boolean);
            if (gens.length === 1) {
              q = pgContains(q, 'category_general', [gens[0]]);
            } else {
              q = pgOverlaps(q, 'category_general', gens);
            }
          }

          // category_condition — array en DB, puede venir con pipe para múltiples valores
          if (filters?.condition) {
            const conds = filters.condition.split('|').map((s: string) => s.trim()).filter(Boolean);
            if (conds.length === 1) {
              q = pgContains(q, 'category_condition', [conds[0]]);
            } else {
              q = pgOverlaps(q, 'category_condition', conds);
            }
          }

          // is_prescription — boolean
          if (filters?.prescription === 'true') {
            q = q.eq('is_prescription', true);
          }

          return q;
        };

        // Buscar directamente sobre productos con parent_product_id=null
        // (incluye sueltos Y padres). Las categorías están en el producto raíz, no en los hijos.
        let mainQuery = supabase
          .from('products')
          .select(SELECT_FIELDS)
          .eq('active', true)
          .is('parent_product_id', null);
        mainQuery = applyFilters(mainQuery).order('name', { ascending: true });

        const { data: mainData, error: errA } = await mainQuery;
        if (errA) throw errA;

        // ── Búsqueda suplementaria en hijos ──────────────────────────────
        // is_bulk y category_sub_specific viven en hijos (variantes).
        // CLAVE: para is_bulk, category_age y category_species también
        // viven en el hijo — se aplican en childQuery, NO en parentQuery.
        let extraParentIds: string[] = [];

        if (filters?.bulk === 'true' || filters?.catSubSpec) {
          let childQuery = supabase
            .from('products')
            .select('parent_product_id')
            .eq('active', true)
            .not('parent_product_id', 'is', null);

          if (!showOutOfStock) {
            childQuery = childQuery.gt('stock', 0);
          }

          if (filters?.bulk === 'true') {
            childQuery = childQuery.eq('is_bulk', true);
            // Para productos granel, age y species viven en el hijo
            if (filters?.species) {
              childQuery = pgContains(childQuery, 'category_species', [filters.species]);
            }
            if (filters?.age) {
              childQuery = pgContains(childQuery, 'category_age', [filters.age]);
            }
          }

          if (filters?.catSubSpec) {
            childQuery = childQuery.ilike('category_sub_specific', `%${filters.catSubSpec}%`);
            // Para catSubSpec, species y age viven en el padre — no aplicar acá
          }

          const { data: matchingChildren } = await childQuery;
          extraParentIds = Array.from(new Set(
            (matchingChildren || [])
              .map((c: any) => c.parent_product_id)
              .filter(Boolean)
          ));
        }

        // Brand childQuery: find parent IDs of children with this brand
        // (brand often lives on variants, not on the parent container)
        if (filters?.brand) {
          let brandChildQuery = supabase
            .from('products')
            .select('parent_product_id')
            .eq('active', true)
            .eq('is_parent', false)
            .not('parent_product_id', 'is', null)
            .eq('category_brand', filters.brand);

          if (filters?.species) {
            brandChildQuery = pgContains(brandChildQuery, 'category_species', [filters.species]);
          }
          if (!showOutOfStock) {
            brandChildQuery = brandChildQuery.gt('stock', 0);
          }

          const { data: brandChildren } = await brandChildQuery;
          const brandParentIds = Array.from(new Set(
            (brandChildren || [])
              .map((c: any) => c.parent_product_id)
              .filter(Boolean)
          ));

          // Merge brand parent IDs into extraParentIds
          extraParentIds = Array.from(new Set([...extraParentIds, ...brandParentIds]));
        }

        // Traer los padres de esos hijos
        let extraParents: any[] = [];
        if (extraParentIds.length > 0) {
          const alreadyIncluded = new Set((mainData || []).map((p: any) => p.id));
          const newIds = extraParentIds.filter((id: string) => !alreadyIncluded.has(id));
          if (newIds.length > 0) {
            let parentQuery = supabase
              .from('products')
              .select(SELECT_FIELDS)
              .eq('active', true)
              .eq('is_parent', true)
              .in('id', newIds);

            // Para is_bulk: age y species YA fueron aplicados en childQuery
            // Solo aplicar filtros que viven en el padre: catSpec, catGen, condition
            // Para catSubSpec: age y species viven en el padre — aplicarlos acá
            if (filters?.bulk !== 'true' && !filters?.brand) {
              // Solo para catSubSpec u otros casos no-bulk
              if (filters?.species) {
                parentQuery = pgContains(parentQuery, 'category_species', [filters.species]);
              }
              if (filters?.age) {
                parentQuery = pgContains(parentQuery, 'category_age', [filters.age]);
              }
            }

            // catSpec, catGen y condition siempre viven en el padre
            if (filters?.catSpec && !filters?.brand) {
              const specs = filters.catSpec.split('|').map((s: string) => s.trim()).filter(Boolean);
              if (specs.length === 1) {
                parentQuery = pgContains(parentQuery, 'category_specific', [specs[0]]);
              } else {
                parentQuery = pgOverlaps(parentQuery, 'category_specific', specs);
              }
            }
            if (filters?.catGen) {
              const gens = filters.catGen.split('|').map((s: string) => s.trim()).filter(Boolean);
              if (gens.length === 1) {
                parentQuery = pgContains(parentQuery, 'category_general', [gens[0]]);
              } else {
                parentQuery = pgOverlaps(parentQuery, 'category_general', gens);
              }
            }
            if (filters?.condition) {
              const conds = filters.condition.split('|').map((s: string) => s.trim()).filter(Boolean);
              if (conds.length === 1) {
                parentQuery = pgContains(parentQuery, 'category_condition', [conds[0]]);
              } else {
                parentQuery = pgOverlaps(parentQuery, 'category_condition', conds);
              }
            }

            if (filters?.catDetail) {
              parentQuery = pgContains(parentQuery, 'category_detail', [filters.catDetail]);
            }

            const { data: pData } = await parentQuery;
            extraParents = pData || [];
          }
        }
        // ─────────────────────────────────────────────────────────────────

        const allCandidates = [...(mainData || []), ...extraParents];
        const parentIds = allCandidates
          .filter((p: any) => p.is_parent)
          .map((p: any) => p.id);

        let validParentIds = new Set<string>();
        if (parentIds.length > 0) {
          let childrenStockQuery = supabase
            .from('products')
            .select('parent_product_id')
            .in('parent_product_id', parentIds)
            .eq('active', true);

          if (!showOutOfStock) {
            childrenStockQuery = childrenStockQuery.gt('stock', 0);
          }

          const { data: childrenWithStock } = await childrenStockQuery;
          validParentIds = new Set(
            (childrenWithStock || [])
              .map((c: any) => c.parent_product_id)
              .filter(Boolean)
          );
        }

        const finalFiltered = allCandidates.filter((p: any) => {
          if (p.is_parent) return validParentIds.has(p.id);
          return showOutOfStock || (p.stock || 0) > 0;
        }) as Product[];

        setProducts(finalFiltered);
        setHasMore(false);
        setIsServerFiltered(true);

        if (!append) {
          const { data: catData } = await supabase
            .from('categories')
            .select('id, name, type, parent_id')
            .order('name');
          if (catData) setCategories(catData);
        }
        return;
      }

      // ═══════════════════════════════════════════════════════
      // CASO B: sin filtros específicos — comportamiento original con paginación
      // ═══════════════════════════════════════════════════════
      const from = append ? products.length : 0;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('products')
        .select(SELECT_FIELDS)
        .eq('active', true)
        .is('parent_product_id', null);

      const { data, error } = await query
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (!data || data.length === 0) {
        setHasMore(false);
        if (!append) setProducts([]);
        return;
      }

      const parentIds = (data as any[]).filter(p => p.is_parent).map(p => p.id);
      let validParentIds = new Set<string>();
      if (parentIds.length > 0) {
        let childrenQuery = supabase
          .from('products')
          .select('parent_product_id')
          .in('parent_product_id', parentIds)
          .eq('active', true);
        if (!showOutOfStock) {
          childrenQuery = childrenQuery.gt('stock', 0);
        }
        const { data: childrenWithStock } = await childrenQuery;
        validParentIds = new Set(
          (childrenWithStock || []).map(c => c.parent_product_id).filter(Boolean) as string[]
        );
      }

      const filtered = (data as any[]).filter(p => {
        if (p.is_parent) return validParentIds.has(p.id);
        return showOutOfStock || (p.stock || 0) > 0;
      }) as Product[];

      setProducts(prev => append ? [...prev, ...filtered] : filtered);
      setHasMore(data.length === PAGE_SIZE);
      setIsServerFiltered(false);

      if (!append) {
        const { data: catData } = await supabase.from('categories').select('id, name, type, parent_id').order('name');
        if (catData) setCategories(catData);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const applyDropdownFilters = (overrides?: Partial<{
    category: string; specific: string; subSpecific: string; detail: string;
    species: string; brand: string;
  }>) => {
    const cat = overrides?.category ?? selectedCategory;
    const spec = overrides?.specific ?? selectedSpecific;
    const sub = overrides?.subSpecific ?? selectedSubSpecific;
    const det = overrides?.detail ?? selectedDetail;
    const spe = overrides?.species ?? selectedSpecies;
    const brd = overrides?.brand ?? selectedBrand;

    const filters: any = {};
    if (cat !== 'all') filters.catGen = cat;
    if (spec !== 'all') filters.catSpec = spec;
    if (sub !== 'all') filters.catSubSpec = sub;
    if (det !== 'all') filters.catDetail = det;
    if (spe !== 'all') filters.species = spe;
    if (brd !== 'all') filters.brand = brd;

    const hasAny = cat !== 'all' || spec !== 'all' || sub !== 'all' || det !== 'all' || spe !== 'all' || brd !== 'all';

    if (hasAny) {
      setLoading(true);
      loadProducts(false, filters);
    } else {
      // Sin ningún filtro — volver al listado paginado normal
      setLoading(true);
      loadProducts(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const filters: any = {};
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const catGen = urlParams.get('cat_gen');
      if (catGen) filters.catGen = catGen;
      const catSpec = urlParams.get('cat_spec');
      if (catSpec) filters.catSpec = catSpec;
      const species = urlParams.get('species');
      if (species) filters.species = species;
      const brand = urlParams.get('brand');
      if (brand) filters.brand = brand;
      const age = urlParams.get('age');
      if (age) filters.age = age;
      const bulk = urlParams.get('bulk');
      if (bulk) filters.bulk = bulk;
      const catSubSpec = urlParams.get('cat_sub_spec');
      if (catSubSpec) filters.catSubSpec = catSubSpec;
      const condition = urlParams.get('condition');
      if (condition) filters.condition = condition;
      const prescription = urlParams.get('prescription');
      if (prescription) filters.prescription = prescription;
    }
    loadProducts(true, filters);
  };

  const handleAddToCart = (product: Product, quantity = 1) => {
    const maxStock = typeof product.stock === 'number' ? product.stock : Infinity;
    if (maxStock <= 0) {
      alert(`"${product.public_name || product.name}" no tiene stock disponible.`);
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        const targetQty = existing.quantity + quantity;
        if (targetQty > maxStock) {
          alert(`Solo hay ${maxStock} unidad(es) en stock de "${product.public_name || product.name}".`);
          return prev.map((item) =>
            item.product_id === product.id ? { ...item, quantity: maxStock } : item
          );
        }
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: targetQty } : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.public_name || product.name,
          price: product.price,
          quantity: Math.min(quantity, maxStock),
          image_url: product.uploaded_image_url || product.image_url,
          stock: product.stock,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedSpecific('all');
    setSelectedSubSpecific('all');
    setSelectedDetail('all');
    setSelectedSpecies('all');
    setSelectedBrand('all');
    setPriceRange({ min: '', max: '' });
    setSearchTerm('');
    setBrandSearch('');
    setOpenDropdown(null);
    setIsServerFiltered(false);
    setLoading(true);
    loadProducts(false);
  };

  const filteredProducts = isServerFiltered
    ? products
    : products.filter((product) => {
        const matchesCategory = (() => {
          if (selectedCategory === 'all') return true;
          const specCat = categories.find(c => c.type === 'specific' 
            && Array.isArray(product.category_specific) 
            && product.category_specific.includes(c.name));
          if (!specCat) return false;
          const genCat = categories.find(c => c.id === specCat.parent_id);
          return genCat?.name === selectedCategory;
        })();
        const matchesSpecific = selectedSpecific === 'all' 
          || (Array.isArray(product.category_specific) 
              && product.category_specific.includes(selectedSpecific));
        const matchesSpecies = selectedSpecies === 'all' 
          || (Array.isArray(product.category_species) 
              ? product.category_species.includes(selectedSpecies) 
              : product.category_species === selectedSpecies);
        const matchesBrand = selectedBrand === 'all' 
          || product.category_brand === selectedBrand;
        const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
        const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        const matchesPrice = product.price >= minPrice 
          && product.price <= maxPrice;
        return matchesCategory && matchesSpecific && matchesSpecies 
               && matchesBrand && matchesPrice;
      });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'name') return (a.public_name || a.name).localeCompare(b.public_name || b.name);
    return (a.public_name || a.name).localeCompare(b.public_name || b.name, 'es');
  });

  const categoryOptions = categories.filter(c => c.type === 'general' || !c.type);

  const specificOptions = categories.filter(c => {
    if (c.type !== 'specific') return false;
    if (selectedCategory === 'all') return true;
    const parentGen = categories.find(g => g.type === 'general' && g.name === selectedCategory);
    return parentGen ? c.parent_id === parentGen.id : true;
  });

  const subSpecificOptions = categories.filter(c => {
    if (c.type !== 'sub_specific') return false;
    if (selectedSpecific === 'all') return false;
    const parentSpec = categories.find(s => s.type === 'specific' && s.name === selectedSpecific);
    return parentSpec ? c.parent_id === parentSpec.id : false;
  });

  const detailOptions = categories.filter(c => {
    if (c.type !== 'detail') return false;
    if (selectedSubSpecific === 'all') return false;
    const parentSub = categories.find(s => s.type === 'sub_specific' && s.name === selectedSubSpecific);
    return parentSub ? c.parent_id === parentSub.id : false;
  });

  const speciesOptions = categories.filter(c => c.type === 'species');
  const brandOptions = categories.filter(c => c.type === 'brand');
  const filteredBrandOptions = brandOptions.filter(cat => 
    cat.name.toLowerCase().includes(brandSearch.toLowerCase())
  );
  const hasActiveFilters = selectedCategory !== 'all' || selectedSpecific !== 'all' || selectedSubSpecific !== 'all' || selectedDetail !== 'all' || selectedSpecies !== 'all' || selectedBrand !== 'all' || !!priceRange.min || !!priceRange.max;
  const categoryPath = [
    selectedCategory !== 'all' ? selectedCategory : null,
    selectedSpecific !== 'all' ? selectedSpecific : null,
    selectedSubSpecific !== 'all' ? selectedSubSpecific : null,
    selectedDetail !== 'all' ? selectedDetail : null,
  ].filter(Boolean) as string[];

  // Fallback: si no hay ruta de categoría pero sí especie o marca, mostrar esos
  const activeCategoryLabel = categoryPath.length > 0
    ? categoryPath.join(' / ')
    : (selectedSpecies !== 'all' ? selectedSpecies : selectedBrand !== 'all' ? selectedBrand : null);

  const breadcrumbsItems: { name: string; url?: string }[] = [
    { name: 'Inicio', url: 'https://tiempodemascotas.com.py/' },
    { name: 'Productos', url: 'https://tiempodemascotas.com.py/productos' }
  ];

  if (selectedCategory !== 'all') {
    breadcrumbsItems.push({
      name: selectedCategory,
      url: `https://tiempodemascotas.com.py/productos?category=${encodeURIComponent(selectedCategory)}`
    });
  }
  if (selectedSpecific !== 'all') {
    breadcrumbsItems.push({
      name: selectedSpecific,
      url: `https://tiempodemascotas.com.py/productos?specific=${encodeURIComponent(selectedSpecific)}`
    });
  }
  if (selectedSubSpecific !== 'all') {
    breadcrumbsItems.push({
      name: selectedSubSpecific,
      url: `https://tiempodemascotas.com.py/productos?subSpecific=${encodeURIComponent(selectedSubSpecific)}`
    });
  }
  if (selectedDetail !== 'all') {
    breadcrumbsItems.push({
      name: selectedDetail,
      url: `https://tiempodemascotas.com.py/productos?detail=${encodeURIComponent(selectedDetail)}`
    });
  }

  if (categoryPath.length === 0) {
    if (selectedSpecies !== 'all') {
      breadcrumbsItems.push({
        name: selectedSpecies,
        url: `https://tiempodemascotas.com.py/productos?species=${encodeURIComponent(selectedSpecies)}`
      });
    } else if (selectedBrand !== 'all') {
      breadcrumbsItems.push({
        name: selectedBrand,
        url: `https://tiempodemascotas.com.py/productos?brand=${encodeURIComponent(selectedBrand)}`
      });
    }
  }

  if (breadcrumbsItems.length > 1) {
    breadcrumbsItems[breadcrumbsItems.length - 1].url = undefined;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
           <div className="animate-spin mb-4 text-[#1A8A00]"><PawPrint size={48} /></div>
           <p className="font-display font-bold text-[#1E1B4B]">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1E1B4B] selection:bg-[#eeee22] selection:text-[#1A8A00]">
      <div className="pt-28 md:pt-32 lg:pt-48 pb-16 md:pb-24 container mx-auto px-4 md:px-6">
        <div className="mb-6 md:mb-8">
          <Breadcrumbs items={breadcrumbsItems} />
          
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 md:gap-8">
             <div className="relative">
                {activeCategoryLabel ? (
                  <h1 className="text-2xl md:text-5xl font-display font-black text-[#1A8A00] tracking-tight leading-none mb-1 drop-shadow-sm relative z-10 uppercase text-balance">
                    {activeCategoryLabel}
                  </h1>
                ) : (
                  <h1 className="text-4xl md:text-7xl font-display font-black text-[#1A8A00] tracking-tight leading-none mb-2 drop-shadow-sm relative z-10 uppercase text-balance">
                    EXPLORA NUESTRO <br />
                    <span className="text-[#064E3B]">CATÁLOGO</span>
                  </h1>
                )}
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Barra de Filtros con Dropdowns compactos */}
          <div className="bg-white rounded-[2rem] border-2 border-[#E5E7EB] p-4 md:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b-2 border-[#E5E7EB] border-dashed">
              <div ref={dropdownRef} className="flex flex-wrap items-center gap-2">
                {/* Dropdown 1: Categoría */}
                <div className="relative">
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                      selectedCategory !== 'all' 
                        ? 'bg-[#1A8A00] text-white border-[#1A8A00] shadow-sm' 
                        : 'bg-white border-[#E5E7EB] text-[#1E1B4B] hover:border-gray-300'
                    }`}
                  >
                    <span>{selectedCategory !== 'all' ? selectedCategory : 'Categoría'}</span>
                    <span className={`text-[10px] transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  
                  {openDropdown === 'category' && (
                    <div className="absolute left-0 mt-2 z-50 min-w-[220px] max-h-[300px] overflow-y-auto bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-2 scrollbar-thin">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectedCategory === 'all'}
                            onChange={() => {
                              setSelectedCategory('all');
                              setSelectedSpecific('all');
                              setSelectedSubSpecific('all');
                              setSelectedDetail('all');
                              setOpenDropdown(null);
                              applyDropdownFilters({ category: 'all', specific: 'all', subSpecific: 'all', detail: 'all' });
                            }}
                            className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                          />
                          <span>Todos</span>
                        </label>
                        {categoryOptions.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedCategory === cat.name}
                              onChange={() => {
                                const newVal = selectedCategory === cat.name ? 'all' : cat.name;
                                setSelectedCategory(newVal);
                                setSelectedSpecific('all');
                                setSelectedSubSpecific('all');
                                setSelectedDetail('all');
                                setOpenDropdown(null);
                                applyDropdownFilters({ category: newVal, specific: 'all', subSpecific: 'all', detail: 'all' });
                              }}
                              className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                            />
                            <span>{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown 2: Específica */}
                <div className="relative">
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'specific' ? null : 'specific')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                      selectedSpecific !== 'all' 
                        ? 'bg-[#1A8A00] text-white border-[#1A8A00] shadow-sm' 
                        : 'bg-white border-[#E5E7EB] text-[#1E1B4B] hover:border-gray-300'
                    }`}
                  >
                    <span>{selectedSpecific !== 'all' ? selectedSpecific : 'Específica'}</span>
                    <span className={`text-[10px] transition-transform ${openDropdown === 'specific' ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  
                  {openDropdown === 'specific' && (
                    <div className="absolute left-0 mt-2 z-50 min-w-[220px] max-h-[300px] overflow-y-auto bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-2 scrollbar-thin">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectedSpecific === 'all'}
                            onChange={() => {
                              setSelectedSpecific('all');
                              setSelectedSubSpecific('all');
                              setSelectedDetail('all');
                              setOpenDropdown(null);
                              applyDropdownFilters({ specific: 'all', subSpecific: 'all', detail: 'all' });
                            }}
                            className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                          />
                          <span>Todos</span>
                        </label>
                        {specificOptions.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedSpecific === cat.name}
                              onChange={() => {
                                const newVal = selectedSpecific === cat.name ? 'all' : cat.name;
                                setSelectedSpecific(newVal);
                                setSelectedSubSpecific('all');
                                setSelectedDetail('all');
                                setOpenDropdown(null);
                                applyDropdownFilters({ specific: newVal, subSpecific: 'all', detail: 'all' });
                              }}
                              className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                            />
                            <span>{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown: Sub-específica */}
                {selectedSpecific !== 'all' && subSpecificOptions.length > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => setOpenDropdown(openDropdown === 'subSpecific' ? null : 'subSpecific')}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                        selectedSubSpecific !== 'all' 
                          ? 'bg-[#1A8A00] text-white border-[#1A8A00] shadow-sm' 
                          : 'bg-white border-[#E5E7EB] text-[#1E1B4B] hover:border-gray-300'
                      }`}
                    >
                      <span>{selectedSubSpecific !== 'all' ? selectedSubSpecific : 'Sub-específica'}</span>
                      <span className={`text-[10px] transition-transform ${openDropdown === 'subSpecific' ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    
                    {openDropdown === 'subSpecific' && (
                      <div className="absolute left-0 mt-2 z-50 min-w-[220px] max-h-[300px] overflow-y-auto bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-2 scrollbar-thin">
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedSubSpecific === 'all'}
                              onChange={() => {
                                setSelectedSubSpecific('all');
                                setSelectedDetail('all');
                                setOpenDropdown(null);
                                applyDropdownFilters({ subSpecific: 'all', detail: 'all' });
                              }}
                              className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                            />
                            <span>Todos</span>
                          </label>
                          {subSpecificOptions.map((cat) => (
                            <label key={cat.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                              <input 
                                type="checkbox"
                                checked={selectedSubSpecific === cat.name}
                                onChange={() => {
                                  const newVal = selectedSubSpecific === cat.name ? 'all' : cat.name;
                                  setSelectedSubSpecific(newVal);
                                  setSelectedDetail('all');
                                  setOpenDropdown(null);
                                  applyDropdownFilters({ subSpecific: newVal, detail: 'all' });
                                }}
                                className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                              />
                              <span>{cat.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dropdown: Detalle */}
                {selectedSubSpecific !== 'all' && detailOptions.length > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => setOpenDropdown(openDropdown === 'detail' ? null : 'detail')}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                        selectedDetail !== 'all' 
                          ? 'bg-[#1A8A00] text-white border-[#1A8A00] shadow-sm' 
                          : 'bg-white border-[#E5E7EB] text-[#1E1B4B] hover:border-gray-300'
                      }`}
                    >
                      <span>{selectedDetail !== 'all' ? selectedDetail : 'Detalle'}</span>
                      <span className={`text-[10px] transition-transform ${openDropdown === 'detail' ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    
                    {openDropdown === 'detail' && (
                      <div className="absolute left-0 mt-2 z-50 min-w-[220px] max-h-[300px] overflow-y-auto bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-2 scrollbar-thin">
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedDetail === 'all'}
                              onChange={() => {
                                setSelectedDetail('all');
                                setOpenDropdown(null);
                                applyDropdownFilters({ detail: 'all' });
                              }}
                              className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                            />
                            <span>Todos</span>
                          </label>
                          {detailOptions.map((cat) => (
                            <label key={cat.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                              <input 
                                type="checkbox"
                                checked={selectedDetail === cat.name}
                                onChange={() => {
                                  const newVal = selectedDetail === cat.name ? 'all' : cat.name;
                                  setSelectedDetail(newVal);
                                  setOpenDropdown(null);
                                  applyDropdownFilters({ detail: newVal });
                                }}
                                className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                              />
                              <span>{cat.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dropdown 3: Especie */}
                <div className="relative">
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'species' ? null : 'species')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                      selectedSpecies !== 'all' 
                        ? 'bg-[#1A8A00] text-white border-[#1A8A00] shadow-sm' 
                        : 'bg-white border-[#E5E7EB] text-[#1E1B4B] hover:border-gray-300'
                    }`}
                  >
                    <span>{selectedSpecies !== 'all' ? selectedSpecies : 'Especie'}</span>
                    <span className={`text-[10px] transition-transform ${openDropdown === 'species' ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  
                  {openDropdown === 'species' && (
                    <div className="absolute left-0 mt-2 z-50 min-w-[220px] max-h-[300px] overflow-y-auto bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-2 scrollbar-thin">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectedSpecies === 'all'}
                            onChange={() => { setSelectedSpecies('all'); setOpenDropdown(null); }}
                            className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                          />
                          <span>Todos</span>
                        </label>
                        {speciesOptions.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedSpecies === cat.name}
                              onChange={() => { setSelectedSpecies(selectedSpecies === cat.name ? 'all' : cat.name); setOpenDropdown(null); }}
                              className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                            />
                            <span>{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown 4: Marca */}
                <div className="relative">
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'brand' ? null : 'brand')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                      selectedBrand !== 'all' 
                        ? 'bg-[#1A8A00] text-white border-[#1A8A00] shadow-sm' 
                        : 'bg-white border-[#E5E7EB] text-[#1E1B4B] hover:border-gray-300'
                    }`}
                  >
                    <span>{selectedBrand !== 'all' ? selectedBrand : 'Marca'}</span>
                    <span className={`text-[10px] transition-transform ${openDropdown === 'brand' ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  
                  {openDropdown === 'brand' && (
                    <div className="absolute left-0 mt-2 z-50 min-w-[240px] max-h-[350px] flex flex-col bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-2">
                      <div className="p-1 mb-1.5 border-b border-gray-100 pb-2">
                        <input 
                          type="text"
                          placeholder="Buscar marca..."
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-[#1A8A00] focus:bg-white outline-none"
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 max-h-[250px] flex flex-col gap-1 scrollbar-thin">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectedBrand === 'all'}
                            onChange={() => { setSelectedBrand('all'); setOpenDropdown(null); }}
                            className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                          />
                          <span>Todos</span>
                        </label>
                        {filteredBrandOptions.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedBrand === cat.name}
                              onChange={() => { setSelectedBrand(selectedBrand === cat.name ? 'all' : cat.name); setOpenDropdown(null); }}
                              className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00] h-4 w-4 accent-[#1A8A00]"
                            />
                            <span>{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown 5: Precio */}
                <div className="relative">
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                      priceRange.min || priceRange.max 
                        ? 'bg-[#1A8A00] text-white border-[#1A8A00] shadow-sm' 
                        : 'bg-white border-[#E5E7EB] text-[#1E1B4B] hover:border-gray-300'
                    }`}
                  >
                    <span>
                      {priceRange.min || priceRange.max 
                        ? `Precio: ${priceRange.min ? `Gs. ${parseFloat(priceRange.min).toLocaleString('es')}` : '0'} - ${priceRange.max ? `Gs. ${parseFloat(priceRange.max).toLocaleString('es')}` : '∞'}`
                        : 'Precio'
                      }
                    </span>
                    <span className={`text-[10px] transition-transform ${openDropdown === 'price' ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  
                  {openDropdown === 'price' && (
                    <div className="absolute left-0 mt-2 z-50 min-w-[240px] bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-4">
                      <div className="space-y-3">
                        <div className="flex gap-2 items-center">
                          <div className="flex flex-col gap-1 w-1/2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Mínimo</span>
                            <input 
                              type="number"
                              placeholder="Min Gs."
                              value={priceRange.min}
                              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-[#1A8A00] outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1 w-1/2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Máximo</span>
                            <input 
                              type="number"
                              placeholder="Max Gs."
                              value={priceRange.max}
                              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-[#1A8A00] outline-none"
                            />
                          </div>
                        </div>
                        {(priceRange.min || priceRange.max) && (
                          <button
                            onClick={() => { setPriceRange({ min: '', max: '' }); setOpenDropdown(null); }}
                            className="w-full py-1.5 text-center text-[10px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            Limpiar precio
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ordenar por (Ubicado a la derecha) */}
              <div className="flex items-center gap-3 shrink-0 lg:mt-0">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase">Ordenar por:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border-2 border-[#E5E7EB] rounded-xl text-xs font-bold text-[#1E1B4B] px-3 py-2 focus:ring-0 focus:border-[#1A8A00] cursor-pointer outline-none"
                >
                  <option value="relevance">✨ Relevantes</option>
                  <option value="price-asc">💰 Menor Precio</option>
                  <option value="price-desc">💎 Mayor Precio</option>
                  <option value="name">🔤 Nombre</option>
                </select>
              </div>
            </div>

            {/* Fila de Chips de Filtros Activos (SOLO si hay filtros activos) */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Filtros activos:</span>
                {selectedCategory !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 bg-[#1A8A00]/5 text-[#1A8A00] border border-[#1A8A00]/10 rounded-full px-3 py-1 text-xs font-bold">
                    <span>Cat: {selectedCategory}</span>
                    <button 
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedSpecific('all');
                        setSelectedSubSpecific('all');
                        setSelectedDetail('all');
                        applyDropdownFilters({ category: 'all', specific: 'all', subSpecific: 'all', detail: 'all' });
                      }} 
                      className="hover:bg-[#1A8A00]/10 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {selectedSpecific !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 bg-[#1A8A00]/5 text-[#1A8A00] border border-[#1A8A00]/10 rounded-full px-3 py-1 text-xs font-bold">
                    <span>Esp: {selectedSpecific}</span>
                    <button 
                      onClick={() => {
                        setSelectedSpecific('all');
                        setSelectedSubSpecific('all');
                        setSelectedDetail('all');
                        applyDropdownFilters({ specific: 'all', subSpecific: 'all', detail: 'all' });
                      }} 
                      className="hover:bg-[#1A8A00]/10 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {selectedSubSpecific !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 bg-[#1A8A00]/5 text-[#1A8A00] border border-[#1A8A00]/10 rounded-full px-3 py-1 text-xs font-bold">
                    <span>Sub-esp: {selectedSubSpecific}</span>
                    <button 
                      onClick={() => {
                        setSelectedSubSpecific('all');
                        setSelectedDetail('all');
                        applyDropdownFilters({ subSpecific: 'all', detail: 'all' });
                      }} 
                      className="hover:bg-[#1A8A00]/10 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {selectedDetail !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 bg-[#1A8A00]/5 text-[#1A8A00] border border-[#1A8A00]/10 rounded-full px-3 py-1 text-xs font-bold">
                    <span>Detalle: {selectedDetail}</span>
                    <button 
                      onClick={() => {
                        setSelectedDetail('all');
                        applyDropdownFilters({ detail: 'all' });
                      }} 
                      className="hover:bg-[#1A8A00]/10 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {selectedSpecies !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 bg-[#1A8A00]/5 text-[#1A8A00] border border-[#1A8A00]/10 rounded-full px-3 py-1 text-xs font-bold">
                    <span>Especie: {selectedSpecies}</span>
                    <button 
                      onClick={() => {
                        setSelectedSpecies('all');
                        applyDropdownFilters({ species: 'all' });
                      }} 
                      className="hover:bg-[#1A8A00]/10 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {selectedBrand !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 bg-[#1A8A00]/5 text-[#1A8A00] border border-[#1A8A00]/10 rounded-full px-3 py-1 text-xs font-bold">
                    <span>Marca: {selectedBrand}</span>
                    <button 
                      onClick={() => {
                        setSelectedBrand('all');
                        applyDropdownFilters({ brand: 'all' });
                      }} 
                      className="hover:bg-[#1A8A00]/10 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {(priceRange.min || priceRange.max) && (
                  <div className="inline-flex items-center gap-1.5 bg-[#1A8A00]/5 text-[#1A8A00] border border-[#1A8A00]/10 rounded-full px-3 py-1 text-xs font-bold">
                    <span>Precio: Gs. {priceRange.min ? parseFloat(priceRange.min).toLocaleString('es') : '0'} - {priceRange.max ? `Gs. ${parseFloat(priceRange.max).toLocaleString('es')}` : '∞'}</span>
                    <button onClick={() => setPriceRange({ min: '', max: '' })} className="hover:bg-[#1A8A00]/10 rounded-full p-0.5 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <button 
                  onClick={clearFilters}
                  className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-full px-3 py-1 border border-red-100 transition-all ml-auto"
                >
                  Limpiar todo
                </button>
              </div>
            )}
          </div>

          {/* Grid de Productos */}
          <main className="w-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#E5E7EB] border-dashed">
              <span className="text-xs font-bold text-[#1A8A00] uppercase tracking-wider bg-white border-2 border-[#eeee22]/30 px-3 py-1 rounded-full">
                  {sortedProducts.length} Productos Encontrados
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-6">
              {sortedProducts.map((product) => (
                <ProductGridCard key={product.id} product={product} onAddToCart={handleAddToCart} />
              ))}
            </div>

            {hasMore && filteredProducts.length > 0 && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-[#1A8A00] hover:bg-[#064E3B] text-white rounded-2xl font-display font-bold uppercase tracking-wider text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? 'Cargando...' : 'Cargar más productos'}
                </button>
              </div>
            )}

            {sortedProducts.length === 0 && (
               <div className="bg-white rounded-[3rem] p-16 text-center border-4 border-dashed border-[#E5E7EB] mt-10">
                 <div className="text-4xl mb-4">🙈</div>
                 <h3 className="text-xl font-display font-bold text-[#1A8A00] mb-2">¡Oh no! No encontramos ese producto</h3>
                 <p className="text-[#6B7280] mb-6">Intenta buscar con otro nombre.</p>
                 <button onClick={clearFilters} className="bg-[#228B22] text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-[#1A8A00] transition-all">Ver todos los productos</button>
               </div>
            )}
          </main>
        </div>
      </div>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={(id, qty) => {
           if(qty <= 0) setCartItems(prev => prev.filter(i => i.product_id !== id));
           else setCartItems(prev => prev.map(i => {
             if (i.product_id !== id) return i;
             const maxStock = typeof i.stock === 'number' ? i.stock : Infinity;
             return { ...i, quantity: Math.min(qty, maxStock) };
           }));
        }}
        onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.product_id !== id))}
        onClearCart={() => setCartItems([])}
      />
    </div>
  );
}
