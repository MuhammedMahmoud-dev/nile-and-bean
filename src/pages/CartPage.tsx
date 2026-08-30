
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { OrderDetails } from '@/types';

const CartPage = () => {
  const { items, removeItem, updateItem, clearCart, total } = useCart();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    orderType: 'pickup',
    paymentMethod: 'card',
    contactInfo: {
      name: '',
      phone: '',
      email: ''
    }
  });
  
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  
  const handleRemoveItem = (index: number) => {
    removeItem(index);
  };
  
  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity >= 1) {
      updateItem(index, { quantity });
    }
  };
  
  const handleProceedToCheckout = () => {
    if (items.length > 0) {
      setStep('checkout');
    }
  };
  
  const handleOrderTypeChange = (value: 'pickup' | 'delivery') => {
    setOrderDetails(prev => ({ ...prev, orderType: value }));
  };
  
  const handlePaymentMethodChange = (value: 'card' | 'applepay' | 'googlepay') => {
    setOrderDetails(prev => ({ ...prev, paymentMethod: value }));
  };
  
  const handleContactInfoChange = (field: 'name' | 'phone' | 'email', value: string) => {
    setOrderDetails(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };
  
  const handleAddressChange = (field: 'street' | 'city' | 'zipCode', value: string) => {
    setOrderDetails(prev => ({
      ...prev,
      address: {
        ...prev.address || { street: '', city: '', zipCode: '' },
        [field]: value
      }
    }));
  };
  
  const handlePlaceOrder = () => {
    // In a real implementation, this would submit the order to a backend
    // For now, we'll just show a success message and clear the cart
    
    alert('Thank you for your order! It will be ready shortly.');
    clearCart();
    navigate('/');
  };
  
  if (items.length === 0 && step === 'cart') {
    return (
      <div className="coffee-section min-h-[60vh] flex items-center justify-center">
        <div className="coffee-container text-center">
          <h2 className="text-3xl font-bold mb-4">Your Cart is Empty</h2>
          <p className="mb-8">Looks like you haven't added any items to your cart yet.</p>
          <Button onClick={() => navigate('/menu')} className="coffee-btn-primary">
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="coffee-section">
      <div className="coffee-container">
        <h1 className="text-3xl font-bold mb-8 text-center">
          {step === 'cart' ? 'Your Cart' : 'Checkout'}
        </h1>
        
        {step === 'cart' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row border rounded-lg p-4">
                    <div className="sm:w-24 sm:h-24 mb-4 sm:mb-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-grow sm:ml-4">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {item.size && <div>Size: {item.size}</div>}
                        {item.milk && <div>Milk: {item.milk}</div>}
                        {item.extras && item.extras.length > 0 && (
                          <div>Extras: {item.extras.join(', ')}</div>
                        )}
                        {item.specialInstructions && (
                          <div>Notes: {item.specialInstructions}</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-3">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span>{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/menu')}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg h-fit">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${(total * 0.08).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${(total * 1.08).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button 
                className="w-full bg-coffee-dark hover:bg-coffee-black text-white"
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Pickup or Delivery</h2>
                <RadioGroup
                  value={orderDetails.orderType}
                  onValueChange={(value) => handleOrderTypeChange(value as 'pickup' | 'delivery')}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup">Pickup in Store</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery">Delivery</Label>
                  </div>
                </RadioGroup>
                
                {orderDetails.orderType === 'delivery' && (
                  <div className="mt-4 space-y-3">
                    <h3 className="font-medium">Delivery Address</h3>
                    <Input 
                      placeholder="Street Address"
                      value={orderDetails.address?.street || ''}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input 
                        placeholder="City"
                        value={orderDetails.address?.city || ''}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                      />
                      <Input 
                        placeholder="Zip Code"
                        value={orderDetails.address?.zipCode || ''}
                        onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                <div className="space-y-3">
                  <Input 
                    placeholder="Full Name"
                    value={orderDetails.contactInfo.name}
                    onChange={(e) => handleContactInfoChange('name', e.target.value)}
                  />
                  <Input 
                    placeholder="Phone Number"
                    value={orderDetails.contactInfo.phone}
                    onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                  />
                  <Input 
                    placeholder="Email Address"
                    type="email"
                    value={orderDetails.contactInfo.email}
                    onChange={(e) => handleContactInfoChange('email', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                <RadioGroup
                  value={orderDetails.paymentMethod}
                  onValueChange={(value) => handlePaymentMethodChange(value as 'card' | 'applepay' | 'googlepay')}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card">Credit / Debit Card</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="applepay" id="applepay" />
                    <Label htmlFor="applepay">Apple Pay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="googlepay" id="googlepay" />
                    <Label htmlFor="googlepay">Google Pay</Label>
                  </div>
                </RadioGroup>
                
                {orderDetails.paymentMethod === 'card' && (
                  <div className="mt-4 space-y-3">
                    <Input placeholder="Card Number" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="MM / YY" />
                      <Input placeholder="CVC" />
                    </div>
                    <Input placeholder="Name on Card" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg h-fit">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="mb-4">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between py-2">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${(total * 0.08).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${(total * 1.08).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-coffee-dark hover:bg-coffee-black text-white"
                  onClick={handlePlaceOrder}
                >
                  Place Order
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setStep('cart')}
                >
                  Back to Cart
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
