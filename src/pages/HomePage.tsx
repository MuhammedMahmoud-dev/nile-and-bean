
import { Hero } from '@/components/ui/Hero';
import { FeaturedProducts } from '@/components/ui/FeaturedProducts';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getFeaturedProducts, getPopularProducts } from '@/data/products';

const HomePage = () => {
  const featuredProducts = getFeaturedProducts();
  const popularProducts = getPopularProducts();

  return (
    <div>
      <Hero 
        title="Fresh Brews, Friendly Vibes"
        subtitle="Artisanal coffee, handcrafted with care. Order ahead and skip the line!"
      />
      
      <section className="coffee-section">
        <div className="coffee-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Welcome to Nile & Bean</h2>
            <p className="text-lg max-w-3xl mx-auto text-gray-600">
              Your friendly online coffee shop where every cup has a story. From perfectly pulled espressos to artisanal pastries, we bring the café experience to your door.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-coffee-light/30 p-6 rounded-lg text-center">
              <h3 className="text-xl font-bold mb-3">Carefully Sourced</h3>
              <p className="text-gray-600">
                We source our coffee beans from sustainable farms around the world, ensuring the highest quality in every cup.
              </p>
            </div>
            <div className="bg-caramel/20 p-6 rounded-lg text-center">
              <h3 className="text-xl font-bold mb-3">Expertly Crafted</h3>
              <p className="text-gray-600">
                Our baristas are trained to prepare your drinks with precision and care, consistently delivering the perfect flavor.
              </p>
            </div>
            <div className="bg-cream/50 p-6 rounded-lg text-center">
              <h3 className="text-xl font-bold mb-3">Conveniently Delivered</h3>
              <p className="text-gray-600">
                Order ahead for pickup or have your favorites delivered to your doorstep at your convenience.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <FeaturedProducts title="Featured Drinks & Treats" products={featuredProducts} />
      
      <section className="coffee-section bg-coffee-gradient text-white">
        <div className="coffee-container text-center">
          <h2 className="text-3xl font-bold mb-4">Today's Specials</h2>
          <p className="text-xl mb-8">
            Discover our limited-time offerings and seasonal favorites
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {featuredProducts.slice(0, 2).map((product) => (
              <div key={product.id} className="bg-white/10 backdrop-blur-sm p-6 rounded-lg flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-2">{product.name}</h3>
                <p className="mb-4">{product.shortDescription}</p>
                <span className="text-xl font-bold mb-4">${product.price.toFixed(2)}</span>
                <Link to={`/product/${product.id}`}>
                  <Button className="bg-white text-coffee-dark hover:bg-gray-100">
                    Order Now
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <section className="coffee-section">
        <div className="coffee-container">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
              <img 
                src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2178&auto=format&fit=crop" 
                alt="BrewBuddy atmosphere" 
                className="rounded-lg shadow-lg w-full"
              />
            </div>
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-4">Our Story</h2>
              <p className="text-gray-600 mb-6">
                BrewBuddy was born from a simple idea: making coffee ordering feel as warm and personal as visiting your favorite café. We believe every cup has a story — and we want to be part of yours.
              </p>
              <Link to="/about">
                <Button variant="outline" className="border-coffee-dark text-coffee-dark hover:bg-coffee-dark hover:text-white">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      <section className="coffee-section bg-coffee-black text-white">
        <div className="coffee-container text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Order?</h2>
          <p className="text-xl mb-8">
            Browse our full menu and customize your perfect drink
          </p>
          <Link to="/menu">
            <Button className="bg-white text-coffee-dark hover:bg-gray-100 text-lg px-8 py-3">
              View Full Menu
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
