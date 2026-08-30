import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Hero } from '@/components/ui/Hero';
import { useState } from 'react';
import { toast } from '@/components/ui/sonner';

const AboutPage = () => {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Thanks for your message! We\'ll get back to you soon.');
    setContactForm({
      name: '',
      email: '',
      message: ''
    });
  };

  return (
    <div>
      <Hero 
        title="About Nile & Bean"
        subtitle="Our story, our mission, and our passion for coffee"
        image="https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=2942&auto=format&fit=crop"
        ctaText=""
        ctaLink=""
      />
      
      <section className="coffee-section">
        <div className="coffee-container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Story</h2>
              <p className="text-gray-600 mb-4">
                Nile & Bean was born from a simple idea: making coffee ordering feel as warm and personal as visiting your favorite café. We believe every cup has a story — and we want to be part of yours.
              </p>
              <p className="text-gray-600 mb-4">
                What started as a small coffee cart in a busy downtown area has grown into a beloved online coffee service, but we've never lost sight of what matters most: the connection between people and the coffee they love.
              </p>
              <p className="text-gray-600">
                Every bean we source, every drink we craft, and every pastry we bake is chosen with care and attention to detail. We're committed to sustainability, quality, and creating moments of joy with every sip.
              </p>
            </div>
            <div>
              <img 
                src="https://images.unsplash.com/photo-1442975631115-c4f7b05b8a2c?q=80&w=2940&auto=format&fit=crop" 
                alt="Coffee beans" 
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>
      
      <section className="coffee-section bg-coffee-light/30">
        <div className="coffee-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-lg max-w-3xl mx-auto text-gray-600">
              At Nile & Bean, we're guided by a set of core principles that shape everything we do.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <h3 className="text-xl font-bold mb-3">Quality</h3>
              <p className="text-gray-600">
                We source the finest beans and ingredients, ensuring every cup meets our exacting standards.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <h3 className="text-xl font-bold mb-3">Community</h3>
              <p className="text-gray-600">
                We believe coffee brings people together, creating moments of connection and conversation.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <h3 className="text-xl font-bold mb-3">Sustainability</h3>
              <p className="text-gray-600">
                We're committed to environmentally responsible practices throughout our supply chain.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="coffee-section">
        <div className="coffee-container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Meet Our Founder</h2>
              <p className="text-gray-600 mb-4">
                Muhammed Mahmoud Ahmed founded Nile & Bean with a passion for creating a more personal coffee experience. With years of experience in the coffee industry, Muhammed recognized that what people loved most about their local cafés wasn't just the coffee—it was the feeling of being welcomed and known.
              </p>
              <p className="text-gray-600 mb-4">
                Nile & Bean is the realization of his vision to bring that same warmth and personal touch to online ordering, making sure that convenience doesn't have to come at the cost of connection.
              </p>
              <div className="mt-8">
                <h3 className="text-xl font-medium mb-2">Contact Information:</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>Phone: +20 1125301065</li>
                  <li>Email: moo7ameed222666@gmail.com</li>
                </ul>
              </div>
            </div>
            <div className="bg-coffee-light/30 p-8 rounded-lg">
              <h2 className="text-3xl font-bold mb-4">Get In Touch</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
                  <Input 
                    id="name"
                    name="name"
                    value={contactForm.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                  <Input 
                    id="email"
                    name="email"
                    type="email"
                    value={contactForm.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
                  <Textarea 
                    id="message"
                    name="message"
                    value={contactForm.message}
                    onChange={handleInputChange}
                    required
                    className="min-h-[120px]"
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-coffee-dark hover:bg-coffee-black text-white"
                >
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
