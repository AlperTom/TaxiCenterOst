import { Button } from "@/components/ui/button";
import { Phone, Menu } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-taxi rounded-lg flex items-center justify-center">
            <span className="text-taxi-yellow-foreground font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">TaxiOstbahnhof</h1>
            <p className="text-xs text-muted-foreground">Eco-Friendly Taxi Service</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <a href="#home" className="text-foreground hover:text-primary transition-colors">Home</a>
          <a href="#services" className="text-foreground hover:text-primary transition-colors">Services</a>
          <a href="#booking" className="text-foreground hover:text-primary transition-colors">Booking</a>
          <a href="#about" className="text-foreground hover:text-primary transition-colors">About</a>
          <a href="#contact" className="text-foreground hover:text-primary transition-colors">Contact</a>
        </nav>

        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" className="hidden md:flex">
            <Phone className="w-4 h-4 mr-2" />
            Call Now
          </Button>
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            Book Ride
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;