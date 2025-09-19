import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Phone, Shield, Leaf, Star, Users, CreditCard } from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: Clock,
      title: "24/7 Verfügbarkeit",
      description: "Rund um die Uhr für Sie da - Tag und Nacht",
      features: ["Sofortige Buchung", "Schnelle Ankunft", "Zuverlässig"],
      gradient: "bg-gradient-primary",
    },
    {
      icon: Leaf,
      title: "Umweltfreundlich",
      description: "100% Hybrid- und Elektrofahrzeuge",
      features: ["CO2-neutral", "Leise Fahrt", "Nachhaltig"],
      gradient: "bg-gradient-eco",
    },
    {
      icon: Shield,
      title: "Sicher & Komfortabel",
      description: "Professionelle Fahrer und moderne Fahrzeuge",
      features: ["Lizenzierte Fahrer", "Versichert", "Sauber"],
      gradient: "bg-gradient-taxi",
    },
    {
      icon: MapPin,
      title: "Flughafentransfer",
      description: "Direkter Service zu allen Berliner Flughäfen",
      features: ["BER Airport", "Festpreise", "Pünktlich"],
      gradient: "bg-gradient-primary",
    },
    {
      icon: Users,
      title: "Gruppentransport",
      description: "Fahrzeuge für bis zu 8 Personen",
      features: ["Großraumtaxis", "Familienfreundlich", "Gepäckraum"],
      gradient: "bg-gradient-eco",
    },
    {
      icon: CreditCard,
      title: "Flexible Zahlung",
      description: "Bar, Karte oder kontaktlos bezahlen",
      features: ["Alle Karten", "PayPal", "Apple Pay"],
      gradient: "bg-gradient-taxi",
    },
  ];

  const stats = [
    { number: "50,000+", label: "Zufriedene Kunden", icon: Star },
    { number: "24/7", label: "Service", icon: Clock },
    { number: "100%", label: "Eco-Friendly", icon: Leaf },
    { number: "5★", label: "Durchschnittsbewertung", icon: Star },
  ];

  return (
    <section id="services" className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Unsere Services
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Warum TaxiOstbahnhof?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Wir bieten mehr als nur eine Fahrt - wir sorgen für eine nachhaltige und komfortable Mobilität in Berlin.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <IconComponent className="w-6 h-6 text-primary mr-2" />
                  <span className="text-3xl font-bold text-foreground">{stat.number}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="group hover:shadow-elegant transition-all duration-300">
                <CardHeader>
                  <div className={`w-12 h-12 ${service.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-foreground">{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card className="bg-gradient-primary text-white border-0 shadow-glow">
            <CardContent className="py-12">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h3 className="text-2xl font-bold mb-2">Sofort buchen</h3>
              <p className="text-lg opacity-90 mb-6">
                Rufen Sie uns an oder nutzen Sie unser Online-Buchungssystem
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <a 
                  href="tel:+49301234567" 
                  className="text-2xl font-bold bg-white/20 px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
                >
                  +49 (30) 123 4567
                </a>
                <span className="text-white/70">oder</span>
                <button className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors">
                  Online Buchen
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Services;