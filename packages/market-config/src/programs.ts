/**
 * Canonical loyalty programme catalogue. These ids are the contract
 * between the data core and every brand frontend. Add programmes here
 * first, then feature them in market configs.
 */

export type Alliance = "star" | "oneworld" | "skyteam" | "none";

export interface ProgramMeta {
  id: string;
  name: string;
  airline: string;
  alliance: Alliance;
}

export const PROGRAMS = {
  smiles:              { id: "smiles",              name: "Smiles",                airline: "GOL",                alliance: "none" },
  latam_pass:          { id: "latam_pass",          name: "LATAM Pass",            airline: "LATAM",              alliance: "none" },
  azul_fidelidade:     { id: "azul_fidelidade",     name: "Azul Fidelidade",       airline: "Azul",               alliance: "none" },
  lifemiles:           { id: "lifemiles",           name: "LifeMiles",             airline: "Avianca",            alliance: "star" },
  club_premier:        { id: "club_premier",        name: "Club Premier",          airline: "Aeromexico",         alliance: "skyteam" },
  aerolineas_plus:     { id: "aerolineas_plus",     name: "Aerolineas Plus",       airline: "Aerolineas Argentinas", alliance: "skyteam" },
  connectmiles:        { id: "connectmiles",        name: "ConnectMiles",          airline: "Copa Airlines",      alliance: "star" },
  aeroplan:            { id: "aeroplan",            name: "Aeroplan",              airline: "Air Canada",         alliance: "star" },
  united_mileageplus:  { id: "united_mileageplus",  name: "MileagePlus",           airline: "United",             alliance: "star" },
  aa_aadvantage:       { id: "aa_aadvantage",       name: "AAdvantage",            airline: "American Airlines",  alliance: "oneworld" },
  delta_skymiles:      { id: "delta_skymiles",      name: "SkyMiles",              airline: "Delta",              alliance: "skyteam" },
  alaska_mileage_plan: { id: "alaska_mileage_plan", name: "Mileage Plan",          airline: "Alaska Airlines",    alliance: "oneworld" },
  miles_and_more:      { id: "miles_and_more",      name: "Miles & More",          airline: "Lufthansa Group",    alliance: "star" },
  flying_blue:         { id: "flying_blue",         name: "Flying Blue",           airline: "Air France-KLM",     alliance: "skyteam" },
  ba_executive_club:   { id: "ba_executive_club",   name: "The British Airways Club", airline: "British Airways", alliance: "oneworld" },
  iberia_plus:         { id: "iberia_plus",         name: "Iberia Plus",           airline: "Iberia",             alliance: "oneworld" },
  eurobonus:           { id: "eurobonus",           name: "EuroBonus",             airline: "SAS",                alliance: "skyteam" },
  virgin_atlantic:     { id: "virgin_atlantic",     name: "Flying Club",           airline: "Virgin Atlantic",    alliance: "skyteam" },
  turkish_ms:          { id: "turkish_ms",          name: "Miles&Smiles",          airline: "Turkish Airlines",   alliance: "star" },
  qantas_ff:           { id: "qantas_ff",           name: "Qantas Frequent Flyer", airline: "Qantas",             alliance: "oneworld" },
  velocity:            { id: "velocity",            name: "Velocity",              airline: "Virgin Australia",   alliance: "none" },
  krisflyer:           { id: "krisflyer",           name: "KrisFlyer",             airline: "Singapore Airlines", alliance: "star" },
  asia_miles:          { id: "asia_miles",          name: "Asia Miles",            airline: "Cathay Pacific",     alliance: "oneworld" },
  ana_mileage_club:    { id: "ana_mileage_club",    name: "ANA Mileage Club",      airline: "ANA",                alliance: "star" },
  jal_mileage_bank:    { id: "jal_mileage_bank",    name: "JAL Mileage Bank",      airline: "Japan Airlines",     alliance: "oneworld" },
  emirates_skywards:   { id: "emirates_skywards",   name: "Skywards",              airline: "Emirates",           alliance: "none" },
  etihad_guest:        { id: "etihad_guest",        name: "Etihad Guest",          airline: "Etihad",             alliance: "none" },
  qatar_privilege:     { id: "qatar_privilege",     name: "Privilege Club",        airline: "Qatar Airways",      alliance: "oneworld" },
} as const satisfies Record<string, ProgramMeta>;

export type KnownProgramId = keyof typeof PROGRAMS;
export const ALL_PROGRAM_IDS = Object.keys(PROGRAMS) as KnownProgramId[];

export function isKnownProgram(id: string): id is KnownProgramId {
  return id in PROGRAMS;
}
