import { Button } from "@/components/ui/button";
import { Car, Leaf, Clock, Star } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  const scrollToBooking = () => {
    const element = document.querySelector('#booking');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section 
      id="home" 
      className="relative min-h-screen flex items-center pt-16 sm:pt-20 overflow-hidden"
      style={{
        backgroundImage: `url(${heroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: window.innerWidth > 768 ? 'fixed' : 'scroll'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-hero"></div>
      
      <div className="relative z-10 container mx-auto px-4 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start space-x-2 text-accent">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium">Eco-Friendly Transport</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
              <span className="text-foreground block">Umweltfreundliche</span>
              <span className="bg-gradient-primary bg-clip-text text-transparent block mt-2">
                Taxi Service
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Schnell, zuverlässig und umweltbewusst durch Berlin. 
              Unsere modernen Fahrzeuge bringen Sie sicher ans Ziel.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start">
            <Button 
              size="lg" 
              onClick={scrollToBooking}
              className="w-full sm:w-auto bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-xl transition-all duration-300"
            >
              <Car className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Jetzt Buchen
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto border-primary/50 text-foreground hover:bg-primary/10"
            >
              Mehr Erfahren
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pt-4">
            <div className="flex items-center justify-center lg:justify-start space-x-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">24/7 Service</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start space-x-2">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">4.9★ Rating</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start space-x-2">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">100% Eco</span>
            </div>
          </div>
        </div>

        <div className="relative order-first lg:order-last">
          <div className="relative z-10">
            <div className="w-full h-64 sm:h-80 lg:h-96 bg-gradient-primary/20 rounded-2xl sm:rounded-3xl backdrop-blur-sm border border-primary/20"></div>
            <div className="absolute inset-0 bg-gradient-taxi/10 rounded-2xl sm:rounded-3xl backdrop-blur-sm rotate-2 sm:rotate-3 border border-accent/20"></div>
            <div className="absolute inset-2 sm:inset-4 bg-card/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-elegant border border-border/50 flex items-center justify-center">
              <div className="text-center space-y-3 sm:space-y-4 p-4">
                <Car className="w-12 h-12 sm:w-16 sm:h-16 text-primary mx-auto" />
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">Modern Fleet</h3>
                <p className="text-sm sm:text-base text-muted-foreground">Hybrid & Electric Vehicles</p>
              </div>
            </div>
          </div>
          
          {/* Floating elements */}
          <div className="absolute -top-2 sm:-top-4 -right-2 sm:-right-4 w-16 h-16 sm:w-24 sm:h-24 bg-accent/60 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute -bottom-4 sm:-bottom-8 -left-4 sm:-left-8 w-20 h-20 sm:w-32 sm:h-32 bg-primary/40 rounded-full blur-2xl animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;