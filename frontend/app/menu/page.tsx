"use client";

import { useState } from "react";
import { useCategories, useProducts } from "@/hooks/useProducts";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import Link from "next/link";
import { Category, Product } from "@/types";

function CategoryCard({ category, isSelected, onClick }: { category: Category; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
        isSelected
          ? "bg-orange-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {category.name}
    </button>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/menu/${product.id}`}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      {product.image ? (
        <img src={product.image} alt={product.name} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          No Image
        </div>
      )}
      <div className="p-4">
        <h3 className="font-medium text-gray-900">{product.name}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        {product.option_groups && product.option_groups.length > 0 && (
          <p className="text-xs text-orange-500 mt-2">Customizable</p>
        )}
      </div>
    </Link>
  );
}

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: products, isLoading: loadingProducts } = useProducts(selectedCategory);

  if (loadingCategories) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Our Menu</h1>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            selectedCategory === null
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {categories?.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            isSelected={selectedCategory === cat.id}
            onClick={() => setSelectedCategory(cat.id)}
          />
        ))}
      </div>

      {loadingProducts ? (
        <Loading />
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState message="No products available" />
      )}
    </div>
  );
}
