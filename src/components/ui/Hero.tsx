
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface HeroProps {
  title: string;
  subtitle: string;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
}

export const Hero = ({ 
  title, 
  subtitle, 
  image = "https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=2940&auto=format&fit=crop",
  ctaText = "Browse Menu",
  ctaLink = "/menu"
}: HeroProps) => {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={image}
          alt="Hero background"
          className="w-full h-full object-cover object-center brightness-[0.7]"
        />
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-8">
          {subtitle}
        </p>
        {ctaText && ctaLink && (
          <Link to={ctaLink}>
            <Button className="coffee-btn-primary text-lg px-8 py-3">
              {ctaText}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};
