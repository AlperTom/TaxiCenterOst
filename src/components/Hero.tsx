import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Car, Leaf, Clock, Star } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().catch(() => {
        // Autoplay blocked — silent fallback to poster
      });
    }
  }, []);

  const scrollToBooking = () => {
    const element = document.querySelector('#booking');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={heroBackground}
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/hero-background.mov" type="video/quicktime" />
      </video>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-hero z-[1]" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 text-accent bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5">
          <Leaf className="w-4 h-4" />
          <span className="text-xs sm:text-sm font-medium">Eco-Friendly Transport</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-tight">
          <span className="text-foreground block">Umweltfreundliche</span>
          <span className="bg-gradient-primary bg-clip-text text-transparent block mt-2">
            Taxi Service
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Schnell, zuverlässig und umweltbewusst durch Berlin.
          Unsere modernen Fahrzeuge bringen Sie sicher ans Ziel.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Button
            size="lg"
            onClick={scrollToBooking}
            className="w-full sm:w-auto bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-xl transition-all duration-300"
          >
            <Car className="w-5 h-5 mr-2" />
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

        <div className="flex items-center justify-center gap-8 sm:gap-12 pt-4">
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
    </section>
  );
};

export default Hero;
