
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-coffee-black text-white">
      <div className="coffee-container py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Nile & Bean</h3>
            <p className="text-gray-300 mb-4">
              Making coffee ordering feel as warm and personal as visiting your favorite café.
            </p>
            <p className="text-gray-300">
              &copy; {currentYear} Nile & Bean. All rights reserved.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/menu" className="text-gray-300 hover:text-white transition-colors">
                  Menu
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300">
              <li>Muhammed Mahmoud Ahmed</li>
              <li>Phone: +20 1125301065</li>
              <li>Email: moo7ameed222666@gmail.com</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
