import React from "react";
import { Product } from "../types";
import { ExternalLink, Tag } from "lucide-react";
import { motion } from "motion/react";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const handleClick = async () => {
    try {
      await fetch(`/api/products/${product.id}/click`, { method: "POST" });
    } catch (e) {
      console.error("Failed to track click", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden transition-all hover:shadow-xl hover:shadow-brand/5 flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-white p-4">
        <img
          src={product.image || "https://picsum.photos/seed/product/400/400"}
          alt={product.name}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {product.featured === 1 ? (
          <div className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 shadow-lg">
            <Tag className="w-3 h-3" />
            Destaque
          </div>
        ) : product.tag_label && (
          <div 
            className="absolute top-3 left-3 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 shadow-lg"
            style={{ backgroundColor: product.tag_color || "#0F172A" }}
          >
            <Tag className="w-3 h-3" />
            {product.tag_label}
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-2">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
            {product.category_name} • {product.subcategory_name}
          </p>
          <h3 className="font-bold text-neutral-900 line-clamp-2 group-hover:text-brand transition-colors leading-tight min-h-[2.5rem]">
            {product.name}
          </h3>
        </div>

        <p className="text-sm text-neutral-500 line-clamp-2 mb-4 leading-relaxed">
          {product.description}
        </p>

        <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-neutral-100">
          <div className="flex flex-col">
            {product.price_original && (
              <span className="text-[10px] text-neutral-400 font-medium line-through">
                De R$ {product.price_original.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            )}
            {product.price && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                  Por
                </span>
                <span className="text-xl font-black text-brand">
                  R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
          <a
            href={product.link_afiliado}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="w-full bg-brand text-white text-sm font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-brand/90 transition-all active:scale-95 shadow-lg shadow-brand/10"
          >
            Ver Oferta
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
