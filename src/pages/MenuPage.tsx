
import { useState } from 'react';
import { Hero } from '@/components/ui/Hero';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import { products } from '@/data/products';
import { Product } from '@/types';

type CategoryType = Product['category'] | 'all';

const MenuPage = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  
  const categoryNames: Record<CategoryType, string> = {
    all: 'All Items',
    coffee: 'Coffee',
    tea: 'Tea',
    pastry: 'Pastries',
    seasonal: 'Seasonal Specials'
  };
  
  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(product => product.category === activeCategory);

  return (
    <div>
      <Hero 
        title="Our Menu"
        subtitle="Discover our handcrafted drinks and freshly baked pastries"
        image="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2940&auto=format&fit=crop"
        ctaText=""
        ctaLink=""
      />
      
      <section className="coffee-section">
        <div className="coffee-container">
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {Object.entries(categoryNames).map(([category, name]) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                className={activeCategory === category 
                  ? "bg-coffee-dark hover:bg-coffee-black text-white" 
                  : "border-coffee-dark text-coffee-dark hover:bg-coffee-dark hover:text-white"
                }
                onClick={() => setActiveCategory(category as CategoryType)}
              >
                {name}
              </Button>
            ))}
          </div>
          
          <h2 className="text-3xl font-bold mb-8 text-center">
            {categoryNames[activeCategory]}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No products found in this category</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MenuPage;
