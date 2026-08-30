
export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  category: 'coffee' | 'tea' | 'pastry' | 'seasonal';
  shortDescription: string;
  longDescription?: string;
  options?: {
    sizes?: Array<{
      name: string;
      price: number;
    }>;
    milk?: Array<string>;
    extras?: Array<{
      name: string;
      price: number;
    }>;
  };
  featured?: boolean;
  popular?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  size?: string;
  milk?: string;
  extras?: Array<string>;
  specialInstructions?: string;
}

export interface OrderDetails {
  orderType: 'delivery' | 'pickup';
  address?: {
    street: string;
    city: string;
    zipCode: string;
  };
  paymentMethod: 'card' | 'applepay' | 'googlepay';
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
}
