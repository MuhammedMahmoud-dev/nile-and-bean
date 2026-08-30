
import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface FeaturedProductsProps {
  title: string;
  products: Product[];
}

export const FeaturedProducts = ({ title, products }: FeaturedProductsProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const productsPerPage = 3;
  const totalPages = Math.ceil(products.length / productsPerPage);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 6000);
    return () => clearInterval(interval);
  }, [totalPages]);

  const currentProducts = products.slice(
    currentPage * productsPerPage,
    (currentPage + 1) * productsPerPage
  );

  return (
    <section className="coffee-section bg-coffee-light/30">
      <div className="coffee-container">
        <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`w-3 h-3 mx-1 rounded-full ${
                  i === currentPage ? 'bg-coffee-dark' : 'bg-gray-300'
                }`}
                onClick={() => setCurrentPage(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
