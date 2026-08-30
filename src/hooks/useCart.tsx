
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartItem, Product } from '@/types';
import { toast } from '@/components/ui/sonner';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, options?: Partial<Omit<CartItem, keyof Product>>) => void;
  updateItem: (index: number, updates: Partial<CartItem>) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('brewBuddyCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('brewBuddyCart', JSON.stringify(items));
  }, [items]);

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  
  const total = items.reduce((sum, item) => {
    const basePrice = item.price * item.quantity;
    return sum + basePrice;
  }, 0);

  const addToCart = (
    product: Product, 
    quantity: number = 1,
    options?: Partial<Omit<CartItem, keyof Product>>
  ) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const cartItem: CartItem = {
        ...product,
        quantity,
        ...(options || {})
      };
      
      newItems.push(cartItem);
      toast.success(`Added ${product.name} to cart`);
      return newItems;
    });
  };

  const updateItem = (index: number, updates: Partial<CartItem>) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], ...updates };
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const removedItem = newItems.splice(index, 1)[0];
      toast.success(`Removed ${removedItem.name} from cart`);
      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    toast.success('Cart cleared');
  };

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      updateItem, 
      removeItem, 
      clearCart, 
      itemCount, 
      total 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
