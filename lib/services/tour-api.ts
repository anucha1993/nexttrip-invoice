// ============================================================================
// tour-api Service Client
// ----------------------------------------------------------------------------
// Server-side only. The invoice app connects DIRECTLY to its own `invoices`
// database ONLY. All tour/master data (countries, airlines, wholesalers,
// sales staff, tours & periods) is fetched from tour-api over HTTP instead of
// connecting to any other database.
//
// Configure in .env:
//   TOUR_API_URL   = base URL incl. /api  (e.g. https://api.example.com/api)
//   TOUR_API_TOKEN = Sanctum bearer token issued to the invoice service account
// ============================================================================

const TOUR_API_URL = process.env.TOUR_API_URL;
const TOUR_API_TOKEN = process.env.TOUR_API_TOKEN;

/** Thrown when the tour-api client is not configured or the request fails. */
export class TourApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'TourApiError';
  }
}

type QueryValue = string | number | boolean | null | undefined;

/**
 * Low-level GET helper. Sends the Sanctum bearer token, requests JSON, never
 * caches, and applies a request timeout. Returns the parsed JSON body.
 */
async function tourApiGet<T>(
  path: string,
  params?: Record<string, QueryValue>
): Promise<T> {
  if (!TOUR_API_URL) {
    throw new TourApiError('TOUR_API_URL is not configured in .env');
  }
  if (!TOUR_API_TOKEN) {
    throw new TourApiError('TOUR_API_TOKEN is not configured in .env');
  }

  const base = TOUR_API_URL.replace(/\/+$/, '');
  const url = new URL(`${base}/${path.replace(/^\/+/, '')}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TOUR_API_TOKEN}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new TourApiError(
        `tour-api ${path} responded ${res.status}`,
        res.status
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof TourApiError) throw err;
    const reason = err instanceof Error ? err.message : String(err);
    throw new TourApiError(`tour-api ${path} request failed: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Low-level PATCH helper. Same auth/timeout behaviour as `tourApiGet`.
 * Never throws for the caller by default — callers that need best-effort,
 * non-blocking semantics should wrap the call in try/catch themselves.
 */
async function tourApiPatch<T>(path: string, body: unknown): Promise<T> {
  if (!TOUR_API_URL) {
    throw new TourApiError('TOUR_API_URL is not configured in .env');
  }
  if (!TOUR_API_TOKEN) {
    throw new TourApiError('TOUR_API_TOKEN is not configured in .env');
  }

  const base = TOUR_API_URL.replace(/\/+$/, '');
  const url = `${base}/${path.replace(/^\/+/, '')}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOUR_API_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new TourApiError(
        `tour-api ${path} responded ${res.status}: ${text.slice(0, 300)}`,
        res.status
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof TourApiError) throw err;
    const reason = err instanceof Error ? err.message : String(err);
    throw new TourApiError(`tour-api ${path} request failed: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toNum = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toNumOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Normalise a Laravel date/datetime string to `YYYY-MM-DD`. */
const toDateOnly = (v: unknown): string => {
  if (!v) return '';
  const s = String(v);
  return s.includes('T') ? s.split('T')[0] : s.slice(0, 10);
};

// ---------------------------------------------------------------------------
// Public shapes consumed by the invoice API routes
// ---------------------------------------------------------------------------

export interface CountryOption {
  id: number | null;
  code: string;
  nameTh: string;
  nameEn: string;
}

export interface AirlineOption {
  id: number | null;
  code: string;
  name: string;
}

export interface WholesaleOption {
  id: number | null;
  code: string;
  nameTh: string;
  nameEn: string;
  taxId: string;
  email: string | null;
}

export interface SaleOption {
  id: number | null;
  name: string;
  email: string;
}

export interface TourOption {
  id: number | null;
  tourCode: string;
  tourCode1: string | null;
  tourName: string;
  countryId: number | null;
  countryName: string | null;
  airlineId: number | null;
  airlineName: string | null;
  wholesaleId: number | null;
  wholesaleName: string | null;
  numDays: string | null;
}

export interface TourPeriodOption {
  id: number | null;
  startDate: string;
  endDate: string;
  price1: number;
  price2: number;
  price3: number;
  price4: number;
}

/** A person found in tour-api (a web member or a guest booking contact). */
export interface TourCustomerResult {
  source: 'member' | 'booking';
  externalId: number;
  name: string;
  email: string | null;
  phone: string | null;
}

// ---------------------------------------------------------------------------
// Raw tour-api response shapes (minimal)
// ---------------------------------------------------------------------------

interface Paginated<T> {
  success?: boolean;
  data: T[];
}

interface UsersEnvelope {
  success?: boolean;
  data: { data: Array<Record<string, unknown>> };
}

interface RawOffer {
  price_adult?: unknown;
  discount_adult?: unknown;
  price_single?: unknown;
  discount_single?: unknown;
  price_child?: unknown;
  discount_child_bed?: unknown;
  price_child_nobed?: unknown;
  discount_child_nobed?: unknown;
  price_infant?: unknown;
}

interface RawTransportPivot {
  transport?: { id?: unknown; name?: unknown; type?: unknown } | null;
}

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------

/** Active countries for the country dropdown. */
export async function fetchCountries(): Promise<CountryOption[]> {
  const json = await tourApiGet<Paginated<Record<string, unknown>>>('countries', {
    is_active: true,
    per_page: 1000,
  });
  return (json.data ?? []).map((c) => ({
    id: toNumOrNull(c.id),
    code: (c.iso2 as string) || '',
    nameTh: (c.name_th as string) || (c.name_en as string) || '',
    nameEn: (c.name_en as string) || '',
  }));
}

/** Active airlines (transports of type "airline"). */
export async function fetchAirlines(): Promise<AirlineOption[]> {
  const json = await tourApiGet<Paginated<Record<string, unknown>>>('transports', {
    type: 'airline',
    status: 'on',
    per_page: 1000,
  });
  return (json.data ?? []).map((t) => ({
    id: toNumOrNull(t.id),
    code: (t.code as string) || '',
    name: (t.name as string) || '',
  }));
}

/** Active wholesalers for the wholesaler dropdown. */
export async function fetchWholesalers(): Promise<WholesaleOption[]> {
  const json = await tourApiGet<Paginated<Record<string, unknown>>>('wholesalers', {
    is_active: true,
    per_page: 1000,
  });
  return (json.data ?? []).map(mapWholesale);
}

/** Single wholesaler by id (name + tax id for quotation display). */
export async function fetchWholesaler(id: number): Promise<WholesaleOption | null> {
  try {
    const json = await tourApiGet<{ data: Record<string, unknown> }>(
      `wholesalers/${id}`
    );
    return json.data ? mapWholesale(json.data) : null;
  } catch {
    return null;
  }
}

function mapWholesale(w: Record<string, unknown>): WholesaleOption {
  return {
    id: toNumOrNull(w.id),
    code: (w.code as string) || '',
    nameTh: (w.company_name_th as string) || (w.name as string) || '',
    nameEn: (w.company_name_en as string) || (w.name as string) || '',
    taxId: (w.tax_id as string) || '',
    email: (w.contact_email as string) || null,
  };
}

/** Active sales staff (users with role "sale"). */
export async function fetchSales(): Promise<SaleOption[]> {
  const json = await tourApiGet<UsersEnvelope>('users', {
    role: 'sale',
    is_active: true,
    per_page: 1000,
  });
  const rows = json.data?.data ?? [];
  return rows.map((u) => ({
    id: toNumOrNull(u.id),
    name: (u.name as string) || '',
    email: (u.email as string) || '',
  }));
}

/** Single user by id (name for quotation display). */
export async function fetchSale(id: number): Promise<SaleOption | null> {
  try {
    const json = await tourApiGet<{ data: Record<string, unknown> }>(`users/${id}`);
    const u = json.data;
    if (!u) return null;
    return {
      id: toNumOrNull(u.id),
      name: (u.name as string) || '',
      email: (u.email as string) || '',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Customers (person identity — web members + guest bookings)
// ---------------------------------------------------------------------------

/**
 * Unified customer search against tour-api (web_members + guest bookings).
 * Used by the invoice quotation flow so a sale can pull an existing tour
 * customer instead of retyping. Returns [] on empty/short queries.
 */
export async function searchTourCustomers(q: string): Promise<TourCustomerResult[]> {
  const query = (q ?? '').trim();
  if (query.length < 2) return [];

  const json = await tourApiGet<Paginated<Record<string, unknown>>>(
    'integrations/customers/search',
    { q: query }
  );

  return (json.data ?? [])
    .map((r) => ({
      source: r.source === 'booking' ? ('booking' as const) : ('member' as const),
      externalId: toNum(r.externalId),
      name: String(r.name ?? '').trim(),
      email: (r.email as string) || null,
      phone: (r.phone as string) || null,
    }))
    .filter((r) => r.externalId > 0 && r.name !== '');
}

// ---------------------------------------------------------------------------
// Tours (local synced catalog)
// ---------------------------------------------------------------------------

/** Search the local tour catalog by keyword. */
export async function fetchTours(search: string, limit = 20): Promise<TourOption[]> {
  const json = await tourApiGet<Paginated<Record<string, unknown>>>('tours', {
    search: search || undefined,
    status: 'active',
    per_page: limit,
    sort_by: 'created_at',
    sort_dir: 'desc',
  });
  return (json.data ?? []).map(mapTour);
}

function mapTour(t: Record<string, unknown>): TourOption {
  // Primary country (relation preferred, fall back to FK column)
  const primaryCountry = t.primaryCountry as Record<string, unknown> | null;
  const countryId = toNumOrNull(primaryCountry?.id ?? t.primary_country_id);
  const countryName =
    (primaryCountry?.name_th as string) ||
    (primaryCountry?.name_en as string) ||
    null;

  // First airline transport
  const transports = Array.isArray(t.transports)
    ? (t.transports as RawTransportPivot[])
    : [];
  const airline = transports.find((p) => p.transport?.type === 'airline')?.transport;
  const airlineId = toNumOrNull(airline?.id);
  const airlineName = (airline?.name as string) || null;

  // Wholesaler
  const wholesaler = t.wholesaler as Record<string, unknown> | null;
  const wholesaleId = toNumOrNull(wholesaler?.id ?? t.wholesaler_id);
  const wholesaleName = (wholesaler?.name as string) || null;

  // Duration -> "5D4N"
  const days = toNumOrNull(t.duration_days);
  const numDays = days && days > 0 ? `${days}D${Math.max(days - 1, 0)}N` : null;

  return {
    id: toNumOrNull(t.id),
    tourCode: (t.tour_code as string) || '',
    tourCode1: (t.wholesaler_tour_code as string) || null,
    tourName: (t.title as string) || '',
    countryId,
    countryName,
    airlineId,
    airlineName,
    wholesaleId,
    wholesaleName,
    numDays,
  };
}

/** Future periods (with pricing) for a tour, mapped to the price1-4 tiers. */
export async function fetchTourPeriods(tourId: number): Promise<TourPeriodOption[]> {
  const json = await tourApiGet<Paginated<Record<string, unknown>>>(
    `tours/${tourId}/periods`,
    { future_only: true }
  );
  return (json.data ?? []).map((p) => {
    const offer = (p.offer as RawOffer | null) ?? {};
    const net = (price: unknown, discount: unknown): number => {
      const base = toNum(price);
      const disc = toNum(discount);
      return base > 0 ? Math.max(base - disc, 0) : 0;
    };
    return {
      id: toNumOrNull(p.id),
      startDate: toDateOnly(p.start_date),
      endDate: toDateOnly(p.end_date),
      // price1 = ผู้ใหญ่พักคู่ (adult twin) — the only tier auto-applied in the form
      price1: net(offer.price_adult, offer.discount_adult),
      // price2 = ผู้ใหญ่พักเดี่ยว (single)
      price2: net(offer.price_single, offer.discount_single),
      // price3 = เด็กมีเตียง (child with bed)
      price3: net(offer.price_child, offer.discount_child_bed),
      // price4 = เด็กไม่มีเตียง / ทารก (child no bed / infant)
      price4:
        toNum(offer.price_child_nobed) > 0
          ? net(offer.price_child_nobed, offer.discount_child_nobed)
          : toNum(offer.price_infant),
    };
  });
}

// ---------------------------------------------------------------------------
// Booking → Invoice callback (reverse direction: invoice reports back to
// tour-api). Best-effort: callers should catch failures themselves so a
// failed callback never blocks a quotation/invoice/payment save.
// ---------------------------------------------------------------------------

export type BookingInvoiceStatus = 'quotation_created' | 'invoiced' | 'paid' | 'cancelled';

export interface NotifyBookingInvoiceStatusInput {
  bookingId: number;
  status: BookingInvoiceStatus;
  quotationId?: number | null;
  quotationNumber?: string | null;
  invoiceNumber?: string | null;
  note?: string | null;
}

/**
 * Reports a booking's invoice-side lifecycle back to tour-api so the booking
 * admin (tour-backend) can display the linked quotation number and status.
 * Uses the same Sanctum service token already configured for other tour-api
 * calls. Throws `TourApiError` on failure — callers decide whether to
 * swallow it (recommended for non-critical notification points).
 */
export async function notifyBookingInvoiceStatus(
  input: NotifyBookingInvoiceStatusInput
): Promise<void> {
  await tourApiPatch(`integrations/bookings/${input.bookingId}/invoice-status`, {
    status: input.status,
    quotationId: input.quotationId ?? undefined,
    quotationNumber: input.quotationNumber ?? undefined,
    invoiceNumber: input.invoiceNumber ?? undefined,
    note: input.note ?? undefined,
  });
}

