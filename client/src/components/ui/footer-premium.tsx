import React from "react";
import { Link } from "wouter";
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin, ChevronRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-slate-900 text-white py-16 mt-auto">
      <div className="container mx-auto px-4">
        {/* Newsletter Section */}
        <div className="bg-primary/10 rounded-xl p-6 mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Stay Updated</h3>
              <p className="text-white/80 mb-0">Subscribe to our newsletter for the latest properties and market insights.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                type="email" 
                placeholder="Your email address" 
                className="bg-white/10 border-white/20 placeholder:text-white/50 text-white"
              />
              <Button className="shrink-0">
                Subscribe <ChevronRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold text-primary mb-6">Sakany</h3>
            <p className="text-white/70 mb-6 max-w-xs">
              Transforming property discovery through intelligent matching technologies, data-driven insights, and seamless user experiences.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-white/10 hover:bg-primary text-white p-2 rounded-full transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="bg-white/10 hover:bg-primary text-white p-2 rounded-full transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="bg-white/10 hover:bg-primary text-white p-2 rounded-full transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="bg-white/10 hover:bg-primary text-white p-2 rounded-full transition-colors">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[3px] after:w-12 after:bg-primary after:-mb-2">Explore</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Home
                </Link>
              </li>
              <li>
                <Link href="/properties" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Properties
                </Link>
              </li>
              <li>
                <Link href="/lifestyle" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Lifestyle Match
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Property Categories */}
          <div>
            <h4 className="text-lg font-semibold mb-6 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[3px] after:w-12 after:bg-primary after:-mb-2">Property Types</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/properties?type=apartment" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Luxury Apartments
                </Link>
              </li>
              <li>
                <Link href="/properties?type=villa" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Modern Villas
                </Link>
              </li>
              <li>
                <Link href="/properties?type=house" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Family Houses
                </Link>
              </li>
              <li>
                <Link href="/properties?type=commercial" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Commercial Spaces
                </Link>
              </li>
              <li>
                <Link href="/properties?type=land" className="text-white/70 hover:text-primary flex items-center transition-colors">
                  <ChevronRight size={16} className="mr-2 text-primary" />
                  Premium Land
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-6 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[3px] after:w-12 after:bg-primary after:-mb-2">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <MapPin size={20} className="text-primary shrink-0 mt-1" />
                <span className="text-white/70">123 Riyadh Business District, Kingdom Tower, Saudi Arabia</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={20} className="text-primary" />
                <span className="text-white/70">+966 123 456 789</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={20} className="text-primary" />
                <span className="text-white/70">support@sakany.com</span>
              </li>
            </ul>
            
            <div className="mt-6">
              <h5 className="text-sm font-medium mb-3">Working Hours</h5>
              <p className="text-white/70 text-sm">Monday - Friday: 9:00 AM - 6:00 PM</p>
              <p className="text-white/70 text-sm">Saturday: 10:00 AM - 4:00 PM</p>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/50 text-sm">
            © {currentYear} Sakany. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center space-x-6 mt-4 md:mt-0">
            <Link href="/terms" className="text-sm text-white/50 hover:text-primary">Terms & Conditions</Link>
            <Link href="/privacy" className="text-sm text-white/50 hover:text-primary">Privacy Policy</Link>
            <Link href="/cookie" className="text-sm text-white/50 hover:text-primary">Cookie Policy</Link>
          </div>
          <div className="mt-4 md:mt-0 text-sm text-white/50">
            Made with <Heart size={14} className="inline text-red-500" /> in Saudi Arabia
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;