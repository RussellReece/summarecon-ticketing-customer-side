// src/lib/data/venueTemplates.ts
//
// Layout element definitions and fallbacks for the 3 Summarecon Mall Bandung venues:
// 1. Downtown Walk (Outdoor, 0 seats, Standing A/B/C + Quota Q1)
// 2. Atrium Cibadak (Indoor, 80 seats, 2 blocks: Block A 01-05, Block B 06-10)
// 3. Sawarga Courtyard (Amphitheatre, Mixed: Standing Pit + 12 Rear Seats + Quota)
//    Supports Option A & Option B.

import type { VenueLayoutElement } from "@/components/seat-map/VenueRenderer";

export const DOWNTOWN_WALK_ELEMENTS: VenueLayoutElement[] = [
  {
    element_id: "DWT-L-01",
    name: "Main Stage",
    element_type: "STAGE",
    ticketable: false,
    position: { x: 31, y: 8, width: 31, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-02",
    name: "Backstage",
    element_type: "BACKSTAGE",
    ticketable: false,
    position: { x: 63, y: 8, width: 17, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-03",
    name: "Standing A - Front / General",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-DWT-SA",
    booking_type: "STANDING",
    position: { x: 6, y: 25, width: 26, height: 23, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-04",
    name: "Standing B - General",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-DWT-SB",
    booking_type: "STANDING",
    position: { x: 34, y: 25, width: 26, height: 23, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-05",
    name: "Standing C - Side / Overflow",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-DWT-SC",
    booking_type: "STANDING",
    position: { x: 62, y: 25, width: 26, height: 23, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-06",
    name: "Cross Aisle / Emergency Access",
    element_type: "EMERGENCY_ACCESS",
    ticketable: false,
    position: { x: 7, y: 51, width: 82, height: 4, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-07",
    name: "Tenant Area",
    element_type: "TENANT_AREA",
    ticketable: false,
    position: { x: 6, y: 63, width: 19, height: 14, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-08",
    name: "Book by Quota Q1 - Reserved Area",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-DWT-Q1",
    booking_type: "BOOK_BY_QUOTA",
    position: { x: 27, y: 63, width: 19, height: 14, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-09",
    name: "A11Y",
    element_type: "ACCESSIBLE_VIEWING",
    ticketable: false,
    position: { x: 48, y: 63, width: 12, height: 14, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-10",
    name: "Check-in",
    element_type: "CHECK_IN",
    ticketable: false,
    position: { x: 62, y: 63, width: 12, height: 14, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-11",
    name: "Entry",
    element_type: "ENTRY",
    ticketable: false,
    position: { x: 76, y: 63, width: 10, height: 14, unit: "normalized_percent" },
  },
  {
    element_id: "DWT-L-12",
    name: "Exit",
    element_type: "EXIT",
    ticketable: false,
    position: { x: 88, y: 63, width: 9, height: 14, unit: "normalized_percent" },
  },
];

export const ATRIUM_CIBADAK_ELEMENTS: VenueLayoutElement[] = [
  {
    element_id: "ATR-L-01",
    name: "Stage / Screen",
    element_type: "STAGE",
    ticketable: false,
    position: { x: 25, y: 7, width: 25, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-02",
    name: "Backstage",
    element_type: "BACKSTAGE",
    ticketable: false,
    position: { x: 56, y: 7, width: 16, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-03",
    name: "Block A - Seat 01-05",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-ATR-A",
    booking_type: "BOOK_BY_SEAT",
    position: { x: 16, y: 26, width: 28, height: 31, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-04",
    name: "Main Aisle",
    element_type: "AISLE",
    ticketable: false,
    position: { x: 48, y: 26, width: 11, height: 31, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-05",
    name: "Block B - Seat 06-10",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-ATR-B",
    booking_type: "BOOK_BY_SEAT",
    position: { x: 61, y: 26, width: 27, height: 31, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-06",
    name: "A11Y",
    element_type: "ACCESSIBLE_VIEWING",
    ticketable: false,
    position: { x: 17, y: 65, width: 14, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-07",
    name: "FOH",
    element_type: "FRONT_OF_HOUSE",
    ticketable: false,
    position: { x: 33, y: 65, width: 14, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-08",
    name: "Check-in",
    element_type: "CHECK_IN",
    ticketable: false,
    position: { x: 51, y: 65, width: 14, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-09",
    name: "Exit",
    element_type: "EXIT",
    ticketable: false,
    position: { x: 69, y: 65, width: 14, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-10",
    name: "Rear Circulation / Egress Lane",
    element_type: "EMERGENCY_ACCESS",
    ticketable: false,
    position: { x: 19, y: 78, width: 66, height: 4, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-11",
    name: "Side Aisle (L)",
    element_type: "AISLE",
    ticketable: false,
    position: { x: 8, y: 27, width: 3, height: 30, unit: "normalized_percent" },
  },
  {
    element_id: "ATR-L-12",
    name: "Side Aisle (R)",
    element_type: "AISLE",
    ticketable: false,
    position: { x: 91, y: 27, width: 3, height: 30, unit: "normalized_percent" },
  },
];

export const SAWARGA_COURTYARD_OPTION_B_ELEMENTS: VenueLayoutElement[] = [
  {
    element_id: "SWG-L-01",
    name: "Main Stage",
    element_type: "STAGE",
    ticketable: false,
    position: { x: 27, y: 6, width: 27, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-02",
    name: "Backstage",
    element_type: "BACKSTAGE",
    ticketable: false,
    position: { x: 60, y: 6, width: 18, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-03",
    name: "Standing Pit S1 - Front",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-SWG-S1",
    booking_type: "STANDING",
    position: { x: 15, y: 22, width: 64, height: 25, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-04",
    name: "Book by Seat - Rear",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-SWG-SEAT",
    booking_type: "BOOK_BY_SEAT",
    position: { x: 13, y: 52, width: 29, height: 18, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-05",
    name: "Book by Quota Q1 - Side",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-SWG-Q1",
    booking_type: "BOOK_BY_QUOTA",
    position: { x: 46, y: 52, width: 32, height: 18, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-06",
    name: "Cross Aisle / Egress",
    element_type: "EMERGENCY_ACCESS",
    ticketable: false,
    position: { x: 11, y: 72, width: 78, height: 4, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-07",
    name: "Check-in",
    element_type: "CHECK_IN",
    ticketable: false,
    position: { x: 13, y: 80, width: 15, height: 9, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-08",
    name: "Entrance",
    element_type: "ENTRY",
    ticketable: false,
    position: { x: 33, y: 80, width: 15, height: 9, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-09",
    name: "Accessible View",
    element_type: "ACCESSIBLE_VIEWING",
    ticketable: false,
    position: { x: 55, y: 80, width: 15, height: 9, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-L-10",
    name: "Exit",
    element_type: "EXIT",
    ticketable: false,
    position: { x: 78, y: 80, width: 15, height: 9, unit: "normalized_percent" },
  },
];

export const SAWARGA_COURTYARD_OPTION_A_ELEMENTS: VenueLayoutElement[] = [
  {
    element_id: "SWG-A-01",
    name: "Main Stage",
    element_type: "STAGE",
    ticketable: false,
    position: { x: 27, y: 6, width: 27, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-02",
    name: "Backstage",
    element_type: "BACKSTAGE",
    ticketable: false,
    position: { x: 60, y: 6, width: 18, height: 10, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-03",
    name: "Book by Seat - Front Tier",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-SWG-SEAT",
    booking_type: "BOOK_BY_SEAT",
    position: { x: 15, y: 22, width: 64, height: 22, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-04",
    name: "Standing Pit S1 - Mid Tier",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-SWG-S1",
    booking_type: "STANDING",
    position: { x: 13, y: 48, width: 45, height: 20, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-05",
    name: "Book by Quota Q1 - Side Tier",
    element_type: "TICKET_SECTION",
    ticketable: true,
    section_id: "SEC-SWG-Q1",
    booking_type: "BOOK_BY_QUOTA",
    position: { x: 62, y: 48, width: 25, height: 20, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-06",
    name: "Cross Aisle / Egress",
    element_type: "EMERGENCY_ACCESS",
    ticketable: false,
    position: { x: 11, y: 72, width: 78, height: 4, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-07",
    name: "Check-in",
    element_type: "CHECK_IN",
    ticketable: false,
    position: { x: 13, y: 80, width: 15, height: 9, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-08",
    name: "Entrance",
    element_type: "ENTRY",
    ticketable: false,
    position: { x: 33, y: 80, width: 15, height: 9, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-09",
    name: "Accessible View",
    element_type: "ACCESSIBLE_VIEWING",
    ticketable: false,
    position: { x: 55, y: 80, width: 15, height: 9, unit: "normalized_percent" },
  },
  {
    element_id: "SWG-A-10",
    name: "Exit",
    element_type: "EXIT",
    ticketable: false,
    position: { x: 78, y: 80, width: 15, height: 9, unit: "normalized_percent" },
  },
];

/**
 * Get layout elements by venue code or template ID.
 */
export function getVenueElements(venueIdOrTemplateId?: string): VenueLayoutElement[] {
  if (!venueIdOrTemplateId) return ATRIUM_CIBADAK_ELEMENTS;

  const id = venueIdOrTemplateId.toUpperCase();
  if (id.includes("DWT") || id.includes("DOWNTOWN")) {
    return DOWNTOWN_WALK_ELEMENTS;
  }
  if (id.includes("OPTION-A") || id.includes("SWG-A")) {
    return SAWARGA_COURTYARD_OPTION_A_ELEMENTS;
  }
  if (id.includes("SWG") || id.includes("SAWARGA")) {
    return SAWARGA_COURTYARD_OPTION_B_ELEMENTS;
  }
  return ATRIUM_CIBADAK_ELEMENTS;
}

