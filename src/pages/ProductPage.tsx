
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/hooks/useCart';
import { getProductById } from '@/data/products';
import { CartItem } from '@/types';

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const product = getProductById(id || '');
  
  const [selectedSize, setSelectedSize] = useState(
    product?.options?.sizes?.[0]?.name || ''
  );
  const [selectedMilk, setSelectedMilk] = useState(
    product?.options?.milk?.[0] || ''
  );
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  if (!product) {
    return (
      <div className="coffee-section">
        <div className="coffee-container text-center">
          <h2 className="text-3xl font-bold mb-4">Product Not Found</h2>
          <p className="mb-8">Sorry, we couldn't find the product you're looking for.</p>
          <Button onClick={() => navigate('/menu')}>Back to Menu</Button>
        </div>
      </div>
    );
  }
  
  const handleExtraToggle = (extra: string) => {
    setSelectedExtras(prev => 
      prev.includes(extra)
        ? prev.filter(item => item !== extra)
        : [...prev, extra]
    );
  };
  
  const calculateTotalPrice = () => {
    let total = product.price;
    
    // Add size price
    if (selectedSize && product.options?.sizes) {
      const sizeOption = product.options.sizes.find(size => size.name === selectedSize);
      if (sizeOption) {
        total += sizeOption.price;
      }
    }
    
    // Add extras price
    if (selectedExtras.length > 0 && product.options?.extras) {
      selectedExtras.forEach(extraName => {
        const extraOption = product.options?.extras?.find(extra => extra.name === extraName);
        if (extraOption) {
          total += extraOption.price;
        }
      });
    }
    
    return total * quantity;
  };
  
  const handleAddToCart = () => {
    const customizedProduct: Partial<CartItem> = {
      ...product,
      quantity,
      size: selectedSize,
      milk: selectedMilk,
      extras: selectedExtras,
      specialInstructions: specialInstructions.trim() || undefined
    };
    
    addToCart(product, quantity, customizedProduct);
    navigate('/cart');
  };
  
  return (
    <div className="coffee-section">
      <div className="coffee-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="overflow-hidden rounded-lg">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-auto object-cover rounded-lg"
            />
          </div>
          
          <div>
            <Button 
              variant="outline" 
              className="mb-4"
              onClick={() => navigate('/menu')}
            >
              Back to Menu
            </Button>
            
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-xl text-coffee-dark font-medium mb-4">
              ${calculateTotalPrice().toFixed(2)}
            </p>
            <p className="text-gray-600 mb-6">{product.longDescription || product.shortDescription}</p>
            
            <div className="space-y-6">
              {/* Size Options */}
              {product.options?.sizes && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Size</h3>
                  <RadioGroup 
                    value={selectedSize} 
                    onValueChange={setSelectedSize}
                    className="flex flex-wrap gap-3"
                  >
                    {product.options.sizes.map((size, index) => (
                      <div key={index} className="flex items-center">
                        <RadioGroupItem 
                          value={size.name} 
                          id={`size-${size.name}`} 
                          className="peer sr-only" 
                        />
                        <Label
                          htmlFor={`size-${size.name}`}
                          className="flex items-center justify-center rounded-md border-2 border-muted bg-transparent px-3 py-2 peer-data-[state=checked]:border-coffee-dark peer-data-[state=checked]:bg-coffee-light cursor-pointer"
                        >
                          {size.name}
                          {size.price > 0 && ` (+$${size.price.toFixed(2)})`}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
              
              {/* Milk Options */}
              {product.options?.milk && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Milk</h3>
                  <RadioGroup 
                    value={selectedMilk} 
                    onValueChange={setSelectedMilk}
                    className="flex flex-wrap gap-3"
                  >
                    {product.options.milk.map((milk, index) => (
                      <div key={index} className="flex items-center">
                        <RadioGroupItem 
                          value={milk} 
                          id={`milk-${milk}`} 
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`milk-${milk}`}
                          className="flex items-center justify-center rounded-md border-2 border-muted bg-transparent px-3 py-2 peer-data-[state=checked]:border-coffee-dark peer-data-[state=checked]:bg-coffee-light cursor-pointer"
                        >
                          {milk}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
              
              {/* Extra Options */}
              {product.options?.extras && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Extras</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.options.extras.map((extra, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`extra-${index}`}
                          checked={selectedExtras.includes(extra.name)}
                          onCheckedChange={() => handleExtraToggle(extra.name)}
                        />
                        <Label htmlFor={`extra-${index}`} className="cursor-pointer">
                          {extra.name} (+${extra.price.toFixed(2)})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Special Instructions */}
              <div>
                <h3 className="text-lg font-medium mb-3">Special Instructions</h3>
                <Textarea 
                  placeholder="Any special requests? (Optional)"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="h-24"
                />
              </div>
              
              {/* Quantity */}
              <div>
                <h3 className="text-lg font-medium mb-3">Quantity</h3>
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
              
              <Button 
                className="w-full bg-coffee-dark hover:bg-coffee-black text-white py-6 text-lg"
                onClick={handleAddToCart}
              >
                Add to Cart - ${calculateTotalPrice().toFixed(2)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
