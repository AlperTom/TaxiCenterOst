/**
 * INDEX PAGE - Landing Page
 * Hauptseite für Taxi Center Ostbahnhof
 */

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import BookingSystem from "@/components/BookingSystem";

/**
 * Index Komponente - Landing Page
 * @returns JSX.Element
 */
const Index = (): JSX.Element => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <BookingSystem />
      </main>
      <footer className="bg-muted py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Taxi Center Ostbahnhof</h3>
              <p className="text-muted-foreground text-sm">
                Ihr zuverlässiger Partner für Fahrten in München und Umgebung.
                24/7 Service, professionelle Fahrer, faire Preise.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Kontakt</h3>
              <address className="not-italic text-sm text-muted-foreground">
                <p>Bahnhofplatz 1</p>
                <p>80335 München</p>
                <p className="mt-2">Tel: +49 89 12345678</p>
                <p>Email: info@taxi-ostbahnhof.de</p>
              </address>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Service</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Flughafentransfer</li>
                <li>• Messe-Service</li>
                <li>• Kurierfahrten</li>
                <li>• Krankenfahrten</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-4 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Taxi Center Ostbahnhof. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
