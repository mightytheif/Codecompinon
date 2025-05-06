import { Link, useLocation, useNavigate } from "wouter";
import React from "react";
// Import one of the footer options below (uncomment the one you prefer):
import Footer from "./ui/footer-simple";
// import Footer from "./ui/footer-standard";
// import Footer from "./ui/footer-premium";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="bg-white shadow-sm py-4 px-6">
        <ul className="flex space-x-6">
          <NavigationMenuLink>
            <span onClick={() => navigate("/")} className="cursor-pointer hover:text-primary transition-colors">
              Home
            </span>
          </NavigationMenuLink>
          <NavigationMenuLink>
            <span onClick={() => navigate("/properties")} className="cursor-pointer hover:text-primary transition-colors">
              Properties
            </span>
          </NavigationMenuLink>
          <NavigationMenuLink>
            <span onClick={() => navigate("/lifestyle")} className="cursor-pointer hover:text-primary transition-colors">
              Lifestyle Match
            </span>
          </NavigationMenuLink>
          {/* Add more navigation links as needed */}
        </ul>
      </nav>
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}

const NavigationMenuLink = ({ children }: { children: React.ReactNode }) => {
  return <li>{children}</li>;
};