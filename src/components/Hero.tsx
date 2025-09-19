import { Button } from "@/components/ui/button";
import { Car, Leaf, Clock, Star } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  return (
    <section 
      id="home" 
      className="relative min-h-screen flex items-center pt-20 overflow-hidden"
      style={{
        backgroundImage: `url(${heroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-hero"></div>
      
      <div className="relative z-10 container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-accent">
              <Leaf className="w-5 h-5" />
              <span className="text-sm font-medium">Eco-Friendly Transport</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              <span className="text-foreground">Umweltfreundliche</span>
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Taxi Service
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-lg">
              Schnell, zuverlässig und umweltbewusst durch Berlin. 
              Unsere modernen Fahrzeuge bringen Sie sicher ans Ziel.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-xl transition-all duration-300"
            >
              <Car className="w-5 h-5 mr-2" />
              Jetzt Buchen
            </Button>
            <Button variant="outline" size="lg" className="border-primary/50 text-foreground hover:bg-primary/10">
              Mehr Erfahren
            </Button>
          </div>

          <div className="flex items-center space-x-8 pt-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">24/7 Service</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">4.9★ Rating</span>
            </div>
            <div className="flex items-center space-x-2">
              <Leaf className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">100% Eco</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative z-10">
            <div className="w-full h-96 bg-gradient-primary/20 rounded-3xl backdrop-blur-sm border border-primary/20"></div>
            <div className="absolute inset-0 bg-gradient-taxi/10 rounded-3xl backdrop-blur-sm rotate-3 border border-accent/20"></div>
            <div className="absolute inset-4 bg-card/80 backdrop-blur-md rounded-2xl shadow-elegant border border-border/50 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Car className="w-16 h-16 text-primary mx-auto" />
                <h3 className="text-2xl font-bold text-foreground">Modern Fleet</h3>
                <p className="text-muted-foreground">Hybrid & Electric Vehicles</p>
              </div>
            </div>
          </div>
          
          {/* Floating elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/60 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/40 rounded-full blur-2xl animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;