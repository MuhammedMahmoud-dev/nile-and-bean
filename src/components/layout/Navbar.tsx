import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="coffee-container px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="font-playfair font-bold text-2xl">
                Nile<span className="text-coffee-dark">&</span>Bean
              </span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-coffee-black hover:text-coffee-dark transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/menu" 
              className="text-coffee-black hover:text-coffee-dark transition-colors"
            >
              Menu
            </Link>
            <Link 
              to="/about" 
              className="text-coffee-black hover:text-coffee-dark transition-colors"
            >
              About
            </Link>
            <Link to="/cart" className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-coffee-black hover:text-coffee-dark hover:bg-coffee-light/30 transition-colors"
              >
                <ShoppingCart />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-coffee-dark text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <Link to="/cart" className="relative mr-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-coffee-black hover:text-coffee-dark"
              >
                <ShoppingCart />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-coffee-dark text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(!isOpen)}
              className="text-coffee-black"
            >
              {isOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white px-2 pt-2 pb-3 space-y-1 sm:px-3 shadow-md animate-fade-in">
          <Link 
            to="/" 
            className="block px-3 py-2 text-base font-medium text-coffee-black hover:bg-coffee-light/30 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link 
            to="/menu" 
            className="block px-3 py-2 text-base font-medium text-coffee-black hover:bg-coffee-light/30 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            Menu
          </Link>
          <Link 
            to="/about" 
            className="block px-3 py-2 text-base font-medium text-coffee-black hover:bg-coffee-light/30 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
