export type StoreChain = 'Пятёрочка' | 'Перекрёсток' | 'Чижик' | 'Даркстор X5';

export type FoodCategory =
  | 'bread'      // Хлеб и выпечка
  | 'produce'    // Овощи и фрукты
  | 'grocery'    // Бакалея и крупы
  | 'dairy'      // Молочная продукция
  | 'sweet';     // Сладкая выпечка / десерты

export type DietaryTag = 'sugar' | 'lactose' | 'gluten' | 'nuts';

export type TransportType = 'walk' | 'bike' | 'car';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Store {
  id: string;
  name: string;
  chain: StoreChain;
  address: string;
  coords: Coordinates;
}

export interface FoodBatchItem {
  id: string;
  storeId: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  weightKgPerUnit: number;
  ttlHours: number; // сколько часов осталось до конца срока
  tags: DietaryTag[];
  /** Отфильтровано регламентом безопасности фудшеринга X5 */
  rejectedReason?: string;
}

export interface FamilyProfile {
  id: string;
  label: string; // обезличенный идентификатор, например "Семья #104 (мкр. Центр)"
  district: string;
  coords: Coordinates;
  membersCount: number;
  hasChildren: boolean;
  isElderly: boolean;
  restrictions: DietaryTag[];
  restrictionNotes: string;
  daysSinceLastHelp: number;
}

export interface Volunteer {
  id: string;
  name: string;
  transport: TransportType;
  maxCapacityKg: number;
  speedKmh: number;
  availableMinutes: number;
  coords: Coordinates;
  x5ClubPoints: number;
  completedTrips: number;
  level: string;
}

export interface AllocatedItem {
  item: FoodBatchItem;
  allocatedUnits: number;
  allocatedWeightKg: number;
}

export interface FamilyBasket {
  id: string;
  family: FamilyProfile;
  store: Store;
  items: AllocatedItem[];
  totalWeightKg: number;
  minTtlHours: number;
  diversityScore: number; // 0..100
  aiExplanation: string;
}

export interface RouteStop {
  type: 'volunteer_start' | 'store' | 'family';
  id: string;
  label: string;
  coords: Coordinates;
  basket?: FamilyBasket;
  etaMinutes: number;
  distanceFromPrevKm: number;
}

export interface VolunteerRoute {
  id: string;
  volunteer: Volunteer;
  store: Store;
  baskets: FamilyBasket[];
  stops: RouteStop[];
  totalWeightKg: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  naiveDistanceKm: number;
  naiveDurationMinutes: number;
  savedMinutes: number;
  minTtlHours: number;
  x5ClubPointsReward: number;
  grechkaEquivalentPacks: number;
  co2SavedKg: number;
  completed?: boolean;
}

export interface DispatchSummary {
  baskets: FamilyBasket[];
  routes: VolunteerRoute[];
  unallocatedItems: FoodBatchItem[];
  rejectedItems: FoodBatchItem[];
  totalAvailableKg: number;
  totalRescuedKg: number;
  rescueRatePercent: number;
  familiesHelped: number;
  totalCo2SavedKg: number;
  totalGrechkaPacks: number;
  totalX5PointsIssued: number;
  estimatedDisposalSavingsRub: number;
  totalSavedMinutes: number;
  avgRouteTimeReductionPercent: number;
}
