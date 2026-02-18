import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/umwelt-taxi-logo.png";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "Home" },
    { href: "#services", label: "Services" },
    { href: "#booking", label: "Booking" },
    { href: "#about", label: "About" },
    { href: "#contact", label: "Contact" },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => scrollToSection('#home')}>
          <img src={logo} alt="Umwelt Taxi München" className="h-8 sm:h-10 w-auto" />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="text-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden sm:flex text-xs sm:text-sm px-2 sm:px-4"
          >
            <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden md:inline">Call Now</span>
            <span className="md:hidden">Call</span>
          </Button>
          
          <Button 
            onClick={() => scrollToSection('#booking')}
            size="sm"
            className="bg-gradient-primary text-primary-foreground shadow-glow text-xs sm:text-sm px-2 sm:px-4"
          >
            <span className="hidden sm:inline">Jetzt Buchen</span>
            <span className="sm:hidden">Buchen</span>
          </Button>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden p-1 sm:p-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 sm:w-80">
              <div className="flex flex-col h-full">
                <div className="flex items-center mb-8">
                  <img src={logo} alt="Umwelt Taxi München" className="h-8 w-auto" />
                </div>
                
                <nav className="flex flex-col space-y-4 flex-1">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => scrollToSection(link.href)}
                      className="text-left text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    >
                      {link.label}
                    </button>
                  ))}
                </nav>

                <div className="space-y-4 pt-6 border-t border-border">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setIsOpen(false)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    +49 (89) 123 4567
                  </Button>
                  <Button 
                    onClick={() => scrollToSection('#booking')}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                  >
                    Jetzt Buchen
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;