/**
 * ADMIN DASHBOARD
 * Buchungsübersicht mit Rechnungsanfragen und Fahrer-Provisionen
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  Phone, 
  MapPin, 
  Clock, 
  User, 
  Car,
  Euro,
  FileText,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { 
  Booking, 
  BookingStatus, 
  Driver, 
  DriverDebt,
  DashboardStats 
} from '@/types';
import { formatPrice } from '@/lib/pricing/munich-tariff';

// =============================================================================
// KONSTANTEN
// =============================================================================

const STATUS_LABELS: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  pending: { label: 'Ausstehend', variant: 'secondary' },
  telegram_broadcast: { label: 'In Telegram', variant: 'warning' },
  claimed: { label: 'Angenommen', variant: 'success' },
  assigned_manual: { label: 'Manuell zugew.', variant: 'default' },
  confirmed: { label: 'Bestätigt', variant: 'default' },
  in_progress: { label: 'In Fahrt', variant: 'success' },
  completed: { label: 'Abgeschlossen', variant: 'default' },
  cancelled: { label: 'Storniert', variant: 'destructive' },
  no_show: { label: 'Nicht erschienen', variant: 'destructive' },
};

// =============================================================================
// MOCK-DATEN (würde durch Supabase-Abfragen ersetzt)
// =============================================================================

const MOCK_STATS: DashboardStats = {
  totalBookingsToday: 47,
  pendingBookings: 5,
  activeBookings: 12,
  completedBookingsToday: 30,
  totalRevenueToday: 2845.50,
  outstandingBrokerageFees: 156.80,
  availableDrivers: 8,
};

const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    booking_number: '25-000001',
    status: 'telegram_broadcast',
    pickup_datetime: new Date(Date.now() + 3600000).toISOString(),
    customer_name: 'Max Mustermann',
    customer_phone: '+49 171 12345678',
    pickup_address: 'Marienplatz 1, 80331 München',
    pickup_district: 'Altstadt-Lehel',
    destination_address: 'Flughafen München (MUC)',
    vehicle_type: 'standard',
    passenger_count: 2,
    has_bicycle: false,
    price_total: 106.00,
    fixed_route_type: 'hbf_airport',
    payment_method: 'cash',
    needs_invoice: false,
    price_base_fare: 0,
    price_distance_fare: 0,
    price_waiting_fare: 0,
    price_surcharges: 0,
    brokerage_fee_amount: 5.30,
    brokerage_fee_paid: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    booking_number: '25-000002',
    status: 'claimed',
    pickup_datetime: new Date(Date.now() + 7200000).toISOString(),
    customer_name: 'Anna Schmidt',
    customer_phone: '+49 172 87654321',
    pickup_address: 'Hauptbahnhof, 80335 München',
    pickup_district: 'Ludwigsvorstadt-Isarvorstadt',
    destination_address: 'Messe München, 81829 München',
    vehicle_type: 'xl',
    passenger_count: 5,
    has_bicycle: true,
    price_total: 60.50,
    fixed_route_type: 'hbf_messe',
    payment_method: 'invoice',
    needs_invoice: true,
    invoice_company: 'Schmidt GmbH',
    invoice_vat_id: 'DE123456789',
    assigned_driver_id: 'driver-1',
    assignment_type: 'telegram',
    price_base_fare: 5.90,
    price_distance_fare: 37.80,
    price_waiting_fare: 0,
    price_surcharges: 17.50,
    brokerage_fee_amount: 3.03,
    brokerage_fee_paid: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    tenant_id: 'tenant-1',
    booking_number: '25-000003',
    status: 'assigned_manual',
    pickup_datetime: new Date(Date.now() + 1800000).toISOString(),
    customer_name: 'Bayerische AG',
    customer_phone: '+49 89 1234567',
    pickup_address: 'Maximilianstraße 25, 80539 München',
    pickup_district: 'Altstadt-Lehel',
    destination_address: 'Flughafen München (MUC)',
    vehicle_type: 'luxury',
    passenger_count: 1,
    has_bicycle: false,
    price_total: 106.00,
    fixed_route_type: null,
    payment_method: 'invoice',
    needs_invoice: true,
    invoice_company: 'Bayerische AG',
    invoice_vat_id: 'DE987654321',
    invoice_address: 'Maximilianstraße 25\n80539 München',
    assigned_driver_id: 'driver-2',
    assigned_by: 'admin-1',
    assignment_type: 'manual',
    price_base_fare: 5.90,
    price_distance_fare: 100.10,
    price_waiting_fare: 0,
    price_surcharges: 0,
    brokerage_fee_amount: 0,
    brokerage_fee_paid: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_DRIVERS: Driver[] = [
  {
    id: 'driver-1',
    tenant_id: 'tenant-1',
    first_name: 'Klaus',
    last_name: 'Müller',
    phone: '+49 173 1234567',
    vehicle_plate: 'M-KM 1234',
    vehicle_type: 'xl',
    is_active: true,
    is_available: true,
    current_balance: -45.20,
    total_earnings: 1250.00,
    total_brokerage_fees: 62.50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'driver-2',
    tenant_id: 'tenant-1',
    first_name: 'Maria',
    last_name: 'Schneider',
    phone: '+49 174 9876543',
    vehicle_plate: 'M-MS 5678',
    vehicle_type: 'luxury',
    is_active: true,
    is_available: false,
    current_balance: -23.60,
    total_earnings: 890.00,
    total_brokerage_fees: 44.50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_DRIVER_DEBTS: DriverDebt[] = [
  {
    driver_id: 'driver-1',
    tenant_id: 'tenant-1',
    first_name: 'Klaus',
    last_name: 'Müller',
    total_fees: 62.50,
    paid_fees: 17.30,
    outstanding_fees: 45.20,
    unpaid_bookings: 9,
  },
  {
    driver_id: 'driver-2',
    tenant_id: 'tenant-1',
    first_name: 'Maria',
    last_name: 'Schneider',
    total_fees: 44.50,
    paid_fees: 20.90,
    outstanding_fees: 23.60,
    unpaid_bookings: 4,
  },
];

// =============================================================================
// KOMPONENTEN
// =============================================================================

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendUp 
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_LABELS[status];
  return (
    <Badge variant={config.variant as 'default' | 'secondary' | 'destructive' | 'outline'}>
      {config.label}
    </Badge>
  );
}

function BookingDetailDialog({ booking }: { booking: Booking }) {
  const driver = MOCK_DRIVERS.find(d => d.id === booking.assigned_driver_id);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Buchung #{booking.booking_number}</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Status und Zeit */}
        <div className="flex items-center justify-between">
          <BookingStatusBadge status={booking.status} />
          <span className="text-sm text-muted-foreground">
            Erstellt: {format(new Date(booking.created_at), 'PPp', { locale: de })}
          </span>
        </div>

        {/* Kundendaten */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> Kundendaten
          </h4>
          <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{booking.customer_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefon</p>
              <p className="font-medium flex items-center gap-2">
                <Phone className="h-3 w-3" />
                <a href={`tel:${booking.customer_phone}`} className="text-primary hover:underline">
                  {booking.customer_phone || '-'}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Fahrtdetails */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Fahrtdetails
          </h4>
          <div className="space-y-3 bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
              <div>
                <p className="text-sm text-muted-foreground">Abholung</p>
                <p className="font-medium">{booking.pickup_address}</p>
                <p className="text-sm">
                  {format(new Date(booking.pickup_datetime), 'PPp', { locale: de })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
              <div>
                <p className="text-sm text-muted-foreground">Ziel</p>
                <p className="font-medium">{booking.destination_address || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fahrzeug & Preis */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Car className="h-4 w-4" /> Fahrzeug
            </h4>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Typ:</span>
                <span className="capitalize">{booking.vehicle_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Passagiere:</span>
                <span>{booking.passenger_count}</span>
              </div>
              {booking.has_bicycle && (
                <Badge variant="outline">+ Fahrrad</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Euro className="h-4 w-4" /> Preis
            </h4>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gesamt:</span>
                <span className="font-bold text-lg">{formatPrice(booking.price_total)}</span>
              </div>
              {booking.fixed_route_type && (
                <Badge variant="secondary">Festpreis</Badge>
              )}
              {booking.needs_invoice && (
                <div className="text-sm">
                  <span className="text-amber-600 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Rechnung angefordert
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fahrer-Zuweisung */}
        {driver && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Fahrer
            </h4>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">{driver.first_name} {driver.last_name}</p>
              <p className="text-sm text-muted-foreground">{driver.phone}</p>
              <p className="text-sm text-muted-foreground">{driver.vehicle_plate}</p>
              {booking.assignment_type === 'telegram' && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-blue-600">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Via Telegram
                  </Badge>
                  {booking.brokerage_fee_amount > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Vermittlungsgebühr: {formatPrice(booking.brokerage_fee_amount)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rechnungsdaten */}
        {booking.needs_invoice && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Rechnungsdaten
            </h4>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p><strong>Firma:</strong> {booking.invoice_company}</p>
              <p><strong>USt-IdNr:</strong> {booking.invoice_vat_id}</p>
              <p className="whitespace-pre-line"><strong>Adresse:</strong> {booking.invoice_address}</p>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

function BookingsTable({ 
  bookings, 
  showInvoiceFilter = false 
}: { 
  bookings: Booking[];
  showInvoiceFilter?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.booking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.pickup_address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesInvoice = !showInvoiceFilter || booking.needs_invoice;

    return matchesSearch && matchesStatus && matchesInvoice;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suche nach Buchungsnr., Name oder Adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | 'all')}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([status, config]) => (
              <SelectItem key={status} value={status}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buchung</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Abholung</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Preis</TableHead>
              <TableHead>Fahrer</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((booking) => {
              const driver = MOCK_DRIVERS.find(d => d.id === booking.assigned_driver_id);
              
              return (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    #{booking.booking_number}
                    {booking.needs_invoice && (
                      <FileText className="inline-block h-4 w-4 ml-2 text-amber-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(booking.pickup_datetime), 'dd.MM. HH:mm', { locale: de })}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {booking.pickup_district}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.customer_name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatPrice(booking.price_total)}</span>
                    {booking.brokerage_fee_amount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        -{formatPrice(booking.brokerage_fee_amount)} Gebühr
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {driver ? (
                      <div>
                        <span>{driver.first_name} {driver.last_name}</span>
                        {booking.assignment_type === 'telegram' && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            TG
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          Details
                        </Button>
                      </DialogTrigger>
                      {selectedBooking && (
                        <BookingDetailDialog booking={selectedBooking} />
                      )}
                    </Dialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DriverDebtsTable({ debts }: { debts: DriverDebt[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fahrer</TableHead>
            <TableHead className="text-right">Gesamtgebühren</TableHead>
            <TableHead className="text-right">Bereits bezahlt</TableHead>
            <TableHead className="text-right">Offener Betrag</TableHead>
            <TableHead className="text-center">Offene Buchungen</TableHead>
            <TableHead>Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debts.map((debt) => (
            <TableRow key={debt.driver_id}>
              <TableCell className="font-medium">
                {debt.first_name} {debt.last_name}
              </TableCell>
              <TableCell className="text-right">
                {formatPrice(debt.total_fees)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {formatPrice(debt.paid_fees)}
              </TableCell>
              <TableCell className="text-right">
                <span className={`font-bold ${debt.outstanding_fees > 0 ? 'text-red-600' : ''}`}>
                  {formatPrice(debt.outstanding_fees)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {debt.unpaid_bookings > 0 ? (
                  <Badge variant="destructive">{debt.unpaid_bookings}</Badge>
                ) : (
                  <CheckCircle className="inline h-4 w-4 text-green-500" />
                )}
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={debt.outstanding_fees <= 0}
                >
                  Als bezahlt markieren
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// HAUPT-KOMPONENTE
// =============================================================================

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Übersicht über Buchungen, Fahrer und Finanzen
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">+ Neue Buchung</Button>
          </div>
        </div>

        {/* Statistiken */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Buchungen heute"
            value={MOCK_STATS.totalBookingsToday.toString()}
            icon={Calendar}
            trend="+12% vs. gestern"
            trendUp={true}
          />
          <StatCard
            title="Umsatz heute"
            value={formatPrice(MOCK_STATS.totalRevenueToday)}
            icon={TrendingUp}
            trend="+8% vs. gestern"
            trendUp={true}
          />
          <StatCard
            title="Aktive Fahrten"
            value={MOCK_STATS.activeBookings.toString()}
            icon={Car}
          />
          <StatCard
            title="Offene Gebühren"
            value={formatPrice(MOCK_STATS.outstandingBrokerageFees)}
            icon={Euro}
            trend="Bei 13 Fahrern"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bookings">
              <Calendar className="h-4 w-4 mr-2" />
              Buchungen
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              Rechnungsanfragen
            </TabsTrigger>
            <TabsTrigger value="drivers">
              <Users className="h-4 w-4 mr-2" />
              Fahrer & Gebühren
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alle Buchungen</CardTitle>
              </CardHeader>
              <CardContent>
                <BookingsTable bookings={MOCK_BOOKINGS} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Rechnungsanfragen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BookingsTable 
                  bookings={MOCK_BOOKINGS.filter(b => b.needs_invoice)} 
                  showInvoiceFilter
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vermittlungsgebühren Übersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <DriverDebtsTable debts={MOCK_DRIVER_DEBTS} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
