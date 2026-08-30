
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product);
  };

  return (
    <div className="coffee-card">
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-gray-200">
        <img
          src={product.image}
          alt={product.name}
          className="h-60 w-full object-cover object-center transition-all duration-300 hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-medium mb-1">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-2">{product.shortDescription}</p>
        <div className="flex justify-between items-center mt-3">
          <span className="text-coffee-dark font-medium">${product.price.toFixed(2)}</span>
          <div className="space-x-2">
            <Link to={`/product/${product.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="border-coffee-dark text-coffee-dark hover:bg-coffee-dark hover:text-white"
              >
                Customize
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-coffee-dark hover:bg-coffee-black text-white"
              onClick={handleAddToCart}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
