import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Category, Product } from "../types";
import ProductCard from "../components/ProductCard";
import { ShoppingBag, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

interface HomeProps {
  categories: Category[];
}

export default function Home({ categories }: HomeProps) {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryId = searchParams.get("category");
  const subcategoryId = searchParams.get("subcategory");
  const search = searchParams.get("search");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    if (subcategoryId) params.set("subcategory", subcategoryId);
    if (search) params.set("search", search);

    fetch(`/api/products?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, [categoryId, subcategoryId, search]);

  const featuredProducts = products.filter(p => p.featured === 1);
  const regularProducts = products.filter(p => p.featured !== 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero / Featured Section */}
      {!search && !categoryId && !subcategoryId && featuredProducts.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Destaques</h2>
              <p className="text-sm text-neutral-500">As melhores ofertas selecionadas para você</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Main Catalog */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {search ? `Resultados para "${search}"` : categoryId ? "Catálogo de Produtos" : "Todas as Ofertas"}
            </h2>
            <p className="text-sm text-neutral-500">
              {products.length} {products.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-3xl p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Nenhum produto encontrado</h3>
              <p className="text-neutral-500 max-w-xs mx-auto">Tente ajustar seus filtros ou buscar por outro termo.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(!search && !categoryId && !subcategoryId ? regularProducts : products).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
