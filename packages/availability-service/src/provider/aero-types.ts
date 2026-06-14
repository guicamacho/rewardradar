/**
 * Response shapes for the upstream award-availability provider (Aero
 * partner search API). Field names mirror the provider payload verbatim
 * so the mapper below stays a thin copy.
 */

export interface FlightRoute {
  ID: string;
  OriginAirport: string;
  OriginRegion: string;
  DestinationAirport: string;
  DestinationRegion: string;
  NumDaysOut: number;
  Distance: number;
  Source: string;
}

export interface AeroFlightItem {
  ID: string;
  RouteID: string;
  Route: FlightRoute;
  Date: string;
  ParsedDate: string;
  YAvailable: boolean;
  WAvailable: boolean;
  JAvailable: boolean;
  FAvailable: boolean;
  YAvailableRaw: boolean;
  WAvailableRaw: boolean;
  JAvailableRaw: boolean;
  FAvailableRaw: boolean;
  YMileageCost: string;
  WMileageCost: string;
  JMileageCost: string;
  FMileageCost: string;
  YMileageCostRaw: number;
  WMileageCostRaw: number;
  JMileageCostRaw: number;
  FMileageCostRaw: number;
  YDirectMileageCost: number;
  WDirectMileageCost: number;
  JDirectMileageCost: number;
  FDirectMileageCost: number;
  YDirectMileageCostRaw: number;
  WDirectMileageCostRaw: number;
  JDirectMileageCostRaw: number;
  FDirectMileageCostRaw: number;
  TaxesCurrency: string;
  YTotalTaxes: number;
  WTotalTaxes: number;
  JTotalTaxes: number;
  FTotalTaxes: number;
  YTotalTaxesRaw: number;
  WTotalTaxesRaw: number;
  JTotalTaxesRaw: number;
  FTotalTaxesRaw: number;
  YDirectTotalTaxes: number;
  WDirectTotalTaxes: number;
  JDirectTotalTaxes: number;
  FDirectTotalTaxes: number;
  YDirectTotalTaxesRaw: number;
  WDirectTotalTaxesRaw: number;
  JDirectTotalTaxesRaw: number;
  FDirectTotalTaxesRaw: number;
  YRemainingSeats: number;
  WRemainingSeats: number;
  JRemainingSeats: number;
  FRemainingSeats: number;
  YRemainingSeatsRaw: number;
  WRemainingSeatsRaw: number;
  JRemainingSeatsRaw: number;
  FRemainingSeatsRaw: number;
  YDirectRemainingSeats: number;
  WDirectRemainingSeats: number;
  JDirectRemainingSeats: number;
  FDirectRemainingSeats: number;
  YDirectRemainingSeatsRaw: number;
  WDirectRemainingSeatsRaw: number;
  JDirectRemainingSeatsRaw: number;
  FDirectRemainingSeatsRaw: number;
  YAirlines: string;
  WAirlines: string;
  JAirlines: string;
  FAirlines: string;
  YAirlinesRaw: string;
  WAirlinesRaw: string;
  JAirlinesRaw: string;
  FAirlinesRaw: string;
  YDirectAirlines: string;
  WDirectAirlines: string;
  JDirectAirlines: string;
  FDirectAirlines: string;
  YDirectAirlinesRaw: string;
  WDirectAirlinesRaw: string;
  JDirectAirlinesRaw: string;
  FDirectAirlinesRaw: string;
  YDirect: boolean;
  WDirect: boolean;
  JDirect: boolean;
  FDirect: boolean;
  YDirectRaw: boolean;
  WDirectRaw: boolean;
  JDirectRaw: boolean;
  FDirectRaw: boolean;
  Source: string;
  CreatedAt: string;
  UpdatedAt: string;
  AvailabilityTrips: null;
}

export interface AeroSearchResponse {
  data: AeroFlightItem[];
}
