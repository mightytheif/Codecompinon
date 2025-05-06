import React from "react";
import { Link } from "wouter";
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-100 py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-semibold text-primary mb-4">Sakany</h3>
            <p className="text-gray-600 mb-4 max-w-xs">
              A cutting-edge real estate platform transforming property discovery through intelligent matching technologies.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-600 hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/properties" className="text-gray-600 hover:text-primary transition-colors">Properties</Link></li>
              <li><Link href="/lifestyle" className="text-gray-600 hover:text-primary transition-colors">Lifestyle Match</Link></li>
              <li><Link href="/about" className="text-gray-600 hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-600 hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          {/* Property Types */}
          <div>
            <h4 className="text-lg font-medium mb-4">Property Types</h4>
            <ul className="space-y-2">
              <li><Link href="/properties?type=apartment" className="text-gray-600 hover:text-primary transition-colors">Apartments</Link></li>
              <li><Link href="/properties?type=villa" className="text-gray-600 hover:text-primary transition-colors">Villas</Link></li>
              <li><Link href="/properties?type=house" className="text-gray-600 hover:text-primary transition-colors">Houses</Link></li>
              <li><Link href="/properties?type=commercial" className="text-gray-600 hover:text-primary transition-colors">Commercial</Link></li>
              <li><Link href="/properties?type=land" className="text-gray-600 hover:text-primary transition-colors">Land</Link></li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-medium mb-4">Contact Information</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin size={20} className="text-primary shrink-0 mt-1" />
                <span className="text-gray-600">123 Riyadh Business District, Saudi Arabia</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={20} className="text-primary" />
                <span className="text-gray-600">+966 123 456 789</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={20} className="text-primary" />
                <span className="text-gray-600">support@sakany.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">© {currentYear} Sakany. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/terms" className="text-sm text-gray-500 hover:text-primary">Terms & Conditions</Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-primary">Privacy Policy</Link>
            <Link href="/cookie" className="text-sm text-gray-500 hover:text-primary">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;