import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, Clock, Users, Car, Leaf, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BookingSystem = () => {
  const [booking, setBooking] = useState({
    from: "",
    to: "",
    date: "",
    time: "",
    passengers: "1",
    vehicleType: "",
  });
  const { toast } = useToast();

  const vehicleTypes = [
    {
      id: "eco",
      name: "Eco Taxi",
      description: "Hybrid vehicle • Up to 4 passengers",
      price: "€0.80/km",
      icon: Leaf,
      gradient: "bg-gradient-eco",
    },
    {
      id: "electric",
      name: "Electric Taxi", 
      description: "100% Electric • Up to 4 passengers",
      price: "€0.90/km",
      icon: Zap,
      gradient: "bg-gradient-primary",
    },
    {
      id: "premium",
      name: "Premium Taxi",
      description: "Luxury hybrid • Up to 6 passengers",
      price: "€1.20/km",
      icon: Car,
      gradient: "bg-gradient-taxi",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking.from || !booking.to || !booking.date || !booking.time || !booking.vehicleType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Booking Submitted!",
      description: "We'll contact you shortly to confirm your ride.",
    });
  };

  return (
    <section id="booking" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Buchen Sie Ihre Fahrt
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Schnell, einfach und umweltfreundlich
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="shadow-elegant">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Car className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                Taxi Booking System
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Fill in your details for an instant quote and booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Location inputs */}
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Von (Abholung)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        placeholder="Abholadresse eingeben..."
                        value={booking.from}
                        onChange={(e) => setBooking({ ...booking, from: e.target.value })}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nach (Ziel)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        placeholder="Zieladresse eingeben..."
                        value={booking.to}
                        onChange={(e) => setBooking({ ...booking, to: e.target.value })}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Date and time */}
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Datum</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground z-10 pointer-events-none flex-shrink-0" />
                      <Input
                        type="date"
                        value={booking.date}
                        onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Uhrzeit</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground z-10 pointer-events-none flex-shrink-0" />
                      <Input
                        type="time"
                        value={booking.time}
                        onChange={(e) => setBooking({ ...booking, time: e.target.value })}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Passagiere</label>
                    <Select value={booking.passengers} onValueChange={(value) => setBooking({ ...booking, passengers: value })}>
                      <SelectTrigger className="h-12">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                          <SelectValue placeholder="Anzahl" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border shadow-lg">
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? "Person" : "Personen"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Vehicle selection */}
                <div className="space-y-4">
                  <label className="text-sm font-medium text-foreground">Fahrzeugtyp wählen</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {vehicleTypes.map((vehicle) => {
                      const IconComponent = vehicle.icon;
                      return (
                        <Card
                          key={vehicle.id}
                          className={`cursor-pointer transition-all duration-300 ${
                            booking.vehicleType === vehicle.id
                              ? "ring-2 ring-primary shadow-glow"
                              : "hover:shadow-lg"
                          }`}
                          onClick={() => setBooking({ ...booking, vehicleType: vehicle.id })}
                        >
                          <CardContent className="p-3 sm:p-4 text-center space-y-2 sm:space-y-3">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${vehicle.gradient} rounded-full flex items-center justify-center mx-auto`}>
                              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground text-sm sm:text-base">{vehicle.name}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground">{vehicle.description}</p>
                              <p className="text-xs sm:text-sm font-medium text-primary mt-1">{vehicle.price}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow h-12 sm:h-14 text-base sm:text-lg"
                >
                  Fahrt Buchen
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default BookingSystem;