import React from "react";
import { Link } from "wouter";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-semibold text-primary">Sakany</h3>
            <p className="text-sm text-gray-500">Transforming property discovery</p>
          </div>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8">
            <div>
              <h4 className="text-sm font-medium mb-2">Quick Links</h4>
              <ul className="text-sm space-y-2">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/search">Properties</Link></li>
                <li><Link href="/lifestyle">Lifestyle Match</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Contact</h4>
              <ul className="text-sm space-y-2">
                <li>support@sakany.com</li>
                <li>+966 123 456 789</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-4 text-center text-sm text-gray-500">
          <p>© {currentYear} Sakany. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};