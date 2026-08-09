import type { Locale } from "@/lib/i18n/config";

export type RoutePlannerMessages = {
  title: string;
  routes: string;
  openPlanner: string;
  origin: string;
  destination: string;
  useMyLocation: string;
  chooseOnMap: string;
  choosingOnMap: string;
  swap: string;
  addStop: string;
  removeStop: string;
  stop: string;
  car: string;
  bicycle: string;
  pedestrian: string;
  departNow: string;
  departAt: string;
  arriveAt: string;
  fastest: string;
  shortest: string;
  eco: string;
  alternatives: string;
  traffic: string;
  trafficDelay: string;
  trafficDelayLabel: string;
  incidentsOnRoute: string;
  tolls: string;
  tollsPresent: string;
  noTollsDetected: string;
  tollPriceUnavailable: string;
  ferry: string;
  tunnel: string;
  motorway: string;
  lowEmissionZone: string;
  avoidTolls: string;
  avoidMotorways: string;
  avoidFerries: string;
  avoidTunnels: string;
  avoidUnpaved: string;
  avoidLez: string;
  distance: string;
  duration: string;
  fuelEstimate: string;
  energyEstimate: string;
  consumption: string;
  fuelPrice: string;
  electricityPrice: string;
  petrol: string;
  diesel: string;
  hybrid: string;
  electric: string;
  propulsion: string;
  vehicleSettings: string;
  options: string;
  instructions: string;
  noRouteFound: string;
  outsideCoverage: string;
  routeLeavesCoverage: string;
  serviceUnavailable: string;
  calculationAborted: string;
  closureOnRoute: string;
  roadworksOnRoute: string;
  trafficMayBeDelayed: string;
  originRequired: string;
  destinationRequired: string;
  routeToPlace: string;
  routeFromHere: string;
  routeToHere: string;
  calculating: string;
  clearRoute: string;
  close: string;
  shareLink: string;
  preference: string;
  selectedRoute: string;
  expandSheet: string;
  collapseSheet: string;
  pickOrigin: string;
  pickDestination: string;
  pickWaypoint: string;
  geolocationDenied: string;
  ferryDetected: string;
  tunnelDetected: string;
  lezDetected: string;
  tollDetected: string;
  searchAddressOrPlace: string;
  calculateRoute: string;
  calculatingRoute: string;
  recommendedRoute: string;
  alternativeRoute: string;
  noResults: string;
  useMyLocationShort: string;
  resultTypeAddress: string;
  resultTypeStreet: string;
  resultTypeIntersection: string;
  resultTypePoi: string;
  resultTypeCity: string;
  providerNotEntitledDev: string;
  transitServiceUnavailable: string;
  transitProviderNotConfiguredDev: string;
  transit: string;
  transfers: string;
  transfer: string;
  fareUnavailable: string;
  fareEstimated: string;
  transitModes: string;
  allPublicTransport: string;
  preferBus: string;
  preferMetro: string;
  preferTram: string;
  preferTrain: string;
  preferMetroTram: string;
  fewerTransfers: string;
  lessWalking: string;
  transitDateOutOfRange: string;
  waiting: string;
  walking: string;
  board: string;
  getOff: string;
  direction: string;
  stops: string;
  stopSingular: string;
  coach: string;
  tram: string;
  metro: string;
  regionalTrain: string;
  train: string;
  highSpeedTrain: string;
  longDistanceTrain: string;
  transferWalk: string;
  flight: string;
  direct: string;
  oneStop: string;
  nStops: string;
  layover: string;
  departureAirport: string;
  arrivalAirport: string;
  terminal: string;
  operatedBy: string;
  searchPrice: string;
  priceConfirmed: string;
  airportTransfer: string;
  airportChangeRequired: string;
  groundConnectionUnavailable: string;
  cheapest: string;
  recommended: string;
  passengers: string;
  directFlightsOnly: string;
  departureDate: string;
  cabin: string;
  flightServiceUnavailable: string;
  flightProviderNotConfiguredDev: string;
  confirmPrice: string;
  confirmingPrice: string;
  airportTime: string;
  noFlightsFound: string;
  flightDateRequired: string;
};

const en: RoutePlannerMessages = {
  title: "Directions",
  routes: "Routes",
  openPlanner: "Directions",
  origin: "Origin",
  destination: "Destination",
  useMyLocation: "Use my location",
  chooseOnMap: "Choose on map",
  choosingOnMap: "Tap the map…",
  swap: "Swap",
  addStop: "Add stop",
  removeStop: "Remove stop",
  stop: "Stop",
  car: "Car",
  bicycle: "Bicycle",
  pedestrian: "Walk",
  departNow: "Leave now",
  departAt: "Leave at",
  arriveAt: "Arrive by",
  fastest: "Fastest",
  shortest: "Shortest",
  eco: "Eco",
  alternatives: "Alternatives",
  traffic: "Traffic",
  trafficDelay: "Traffic delay",
  trafficDelayLabel: "traffic delay",
  incidentsOnRoute: "incidents on your route",
  tolls: "Tolls",
  tollsPresent: "Tolls detected",
  noTollsDetected: "No tolls detected",
  tollPriceUnavailable: "Exact price not available",
  ferry: "Ferry",
  tunnel: "Tunnel",
  motorway: "Motorway",
  lowEmissionZone: "Low-emission zone",
  avoidTolls: "Avoid tolls",
  avoidMotorways: "Avoid motorways",
  avoidFerries: "Avoid ferries",
  avoidTunnels: "Avoid tunnels",
  avoidUnpaved: "Avoid unpaved roads",
  avoidLez: "Avoid low-emission zones",
  distance: "Distance",
  duration: "Duration",
  fuelEstimate: "Fuel estimate",
  energyEstimate: "Energy estimate",
  consumption: "Consumption",
  fuelPrice: "Fuel price",
  electricityPrice: "Electricity price",
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  electric: "Electric",
  propulsion: "Propulsion",
  vehicleSettings: "Vehicle",
  options: "Options",
  instructions: "Instructions",
  noRouteFound: "No route found",
  outsideCoverage: "Outside the covered area",
  routeLeavesCoverage: "This route leaves the supported European area",
  serviceUnavailable: "Directions temporarily unavailable",
  calculationAborted: "Calculation cancelled",
  closureOnRoute: "A road closure is reported on this route",
  roadworksOnRoute: "Roadworks are reported on this route",
  trafficMayBeDelayed: "Some traffic information may be delayed",
  originRequired: "Origin required",
  destinationRequired: "Destination required",
  routeToPlace: "Directions to this place",
  routeFromHere: "Directions from here",
  routeToHere: "Directions to here",
  calculating: "Calculating route…",
  clearRoute: "Clear route",
  close: "Close",
  shareLink: "Shareable link updated",
  preference: "Preference",
  selectedRoute: "Selected route",
  expandSheet: "Expand",
  collapseSheet: "Collapse",
  pickOrigin: "Choose origin on map",
  pickDestination: "Choose destination on map",
  pickWaypoint: "Choose stop on map",
  geolocationDenied: "Location permission denied",
  ferryDetected: "Ferry section detected",
  tunnelDetected: "Tunnel section detected",
  lezDetected: "Low-emission zone on route",
  tollDetected: "Toll road detected — exact price not available",
  searchAddressOrPlace: "Search for an address or place",
  calculateRoute: "Calculate route",
  calculatingRoute: "Calculating…",
  recommendedRoute: "Recommended route",
  alternativeRoute: "Alternative",
  noResults: "No results",
  useMyLocationShort: "Use my location",
  resultTypeAddress: "Address",
  resultTypeStreet: "Street",
  resultTypeIntersection: "Intersection",
  resultTypePoi: "Point of interest",
  resultTypeCity: "City",
  providerNotEntitledDev:
    "TomTom Routing API is not enabled for this API key",
  transitServiceUnavailable:
    "Public transport directions are temporarily unavailable",
  transitProviderNotConfiguredDev: "Google Routes API is not configured",
  transit: "Transit",
  transfers: "transfers",
  transfer: "transfer",
  fareUnavailable: "Fare unavailable",
  fareEstimated: "Estimated fare",
  transitModes: "Public transport",
  allPublicTransport: "All public transport",
  preferBus: "Bus",
  preferMetro: "Metro / Subway",
  preferTram: "Tram / Light rail",
  preferTrain: "Train / Rail",
  preferMetroTram: "Metro / Tram",
  fewerTransfers: "Fewer transfers",
  lessWalking: "Less walking",
  transitDateOutOfRange: "Transit schedules are not available for this date.",
  waiting: "Waiting",
  walking: "Walking",
  board: "Board",
  getOff: "Get off",
  direction: "Direction",
  stops: "stops",
  stopSingular: "stop",
  coach: "Coach",
  tram: "Tram",
  metro: "Metro",
  regionalTrain: "Regional train",
  train: "Train",
  highSpeedTrain: "High-speed train",
  longDistanceTrain: "Long-distance train",
  transferWalk: "Transfer",
  flight: "Flight",
  direct: "Direct",
  oneStop: "1 stop",
  nStops: "{count} stops",
  layover: "Layover",
  departureAirport: "Departure airport",
  arrivalAirport: "Arrival airport",
  terminal: "Terminal",
  operatedBy: "Operated by",
  searchPrice: "Search price",
  priceConfirmed: "Price confirmed",
  airportTransfer: "Airport transfer",
  airportChangeRequired: "Requires an airport change",
  groundConnectionUnavailable: "Ground connection could not be calculated",
  cheapest: "Cheapest",
  recommended: "Recommended",
  passengers: "Passengers",
  directFlightsOnly: "Direct flights only",
  departureDate: "Departure date",
  cabin: "Cabin",
  flightServiceUnavailable: "Flight search is temporarily unavailable",
  flightProviderNotConfiguredDev: "Amadeus Flight Offers API is not configured",
  confirmPrice: "Confirm price",
  confirmingPrice: "Confirming price…",
  airportTime: "Airport time",
  noFlightsFound: "No flights found",
  flightDateRequired: "Departure date required",
};

const fr: RoutePlannerMessages = {
  ...en,
  title: "Itinéraire",
  routes: "Itinéraires",
  openPlanner: "Itinéraire",
  origin: "Origine",
  destination: "Destination",
  useMyLocation: "Utiliser ma position",
  chooseOnMap: "Choisir sur la carte",
  choosingOnMap: "Touchez la carte…",
  swap: "Inverser",
  addStop: "Ajouter une étape",
  removeStop: "Supprimer l'étape",
  stop: "Étape",
  car: "Voiture",
  bicycle: "Vélo",
  pedestrian: "Marche",
  departNow: "Partir maintenant",
  departAt: "Partir à",
  arriveAt: "Arriver à",
  fastest: "Plus rapide",
  shortest: "Plus court",
  eco: "Éco",
  alternatives: "Alternatives",
  traffic: "Trafic",
  trafficDelay: "Retard lié au trafic",
  trafficDelayLabel: "de retard lié au trafic",
  incidentsOnRoute: "incidents sur votre trajet",
  tolls: "Péages",
  tollsPresent: "Péages présents",
  noTollsDetected: "Aucun péage détecté",
  tollPriceUnavailable: "Prix exact non disponible",
  ferry: "Ferry",
  tunnel: "Tunnel",
  motorway: "Autoroute",
  lowEmissionZone: "Zone à faibles émissions",
  avoidTolls: "Éviter les péages",
  avoidMotorways: "Éviter les autoroutes",
  avoidFerries: "Éviter les ferries",
  avoidTunnels: "Éviter les tunnels",
  avoidUnpaved: "Éviter les routes non goudronnées",
  avoidLez: "Éviter les zones à faibles émissions",
  distance: "Distance",
  duration: "Durée",
  fuelEstimate: "Estimation carburant",
  energyEstimate: "Estimation énergie",
  consumption: "Consommation",
  fuelPrice: "Prix du carburant",
  electricityPrice: "Prix de l'électricité",
  petrol: "Essence",
  diesel: "Diesel",
  hybrid: "Hybride",
  electric: "Électrique",
  propulsion: "Propulsion",
  vehicleSettings: "Véhicule",
  options: "Options",
  instructions: "Instructions",
  noRouteFound: "Aucun itinéraire trouvé",
  outsideCoverage: "Hors de la zone couverte",
  routeLeavesCoverage:
    "Cet itinéraire quitte la zone européenne prise en charge",
  serviceUnavailable: "Service d'itinéraire temporairement indisponible",
  calculationAborted: "Calcul annulé",
  closureOnRoute: "Une fermeture routière est signalée sur cet itinéraire",
  roadworksOnRoute: "Des travaux sont signalés sur cet itinéraire",
  trafficMayBeDelayed:
    "Certaines informations trafic peuvent être retardées",
  originRequired: "Origine requise",
  destinationRequired: "Destination requise",
  routeToPlace: "Itinéraire vers ce lieu",
  routeFromHere: "Itinéraire depuis ici",
  routeToHere: "Itinéraire vers ici",
  calculating: "Calcul de l'itinéraire…",
  clearRoute: "Effacer l'itinéraire",
  close: "Fermer",
  shareLink: "Lien partageable mis à jour",
  preference: "Préférence",
  selectedRoute: "Itinéraire sélectionné",
  expandSheet: "Développer",
  collapseSheet: "Réduire",
  pickOrigin: "Choisir l'origine sur la carte",
  pickDestination: "Choisir la destination sur la carte",
  pickWaypoint: "Choisir une étape sur la carte",
  geolocationDenied: "Permission de localisation refusée",
  ferryDetected: "Section ferry détectée",
  tunnelDetected: "Section tunnel détectée",
  lezDetected: "Zone à faibles émissions sur le trajet",
  tollDetected: "Péage détecté — prix exact non disponible",
  searchAddressOrPlace: "Rechercher une adresse ou un lieu",
  calculateRoute: "Calculer l'itinéraire",
  calculatingRoute: "Calcul en cours…",
  recommendedRoute: "Itinéraire recommandé",
  alternativeRoute: "Alternative",
  noResults: "Aucun résultat",
  useMyLocationShort: "Utiliser ma position",
  resultTypeAddress: "Adresse",
  resultTypeStreet: "Rue",
  resultTypeIntersection: "Intersection",
  resultTypePoi: "Point d'intérêt",
  resultTypeCity: "Ville",
  providerNotEntitledDev:
    "L'API TomTom Routing n'est pas activée pour cette clé API",
  transitServiceUnavailable:
    "Les transports publics sont temporairement indisponibles",
  transitProviderNotConfiguredDev:
    "L'API Google Routes n'est pas configurée",
  transit: "Transports",
  transfers: "correspondances",
  transfer: "correspondance",
  fareUnavailable: "Tarif indisponible",
  fareEstimated: "Tarif estimé",
  transitModes: "Transports publics",
  allPublicTransport: "Tous les transports",
  preferBus: "Bus",
  preferMetro: "Métro",
  preferTram: "Tram",
  preferTrain: "Train",
  preferMetroTram: "Métro / Tram",
  fewerTransfers: "Moins de correspondances",
  lessWalking: "Moins de marche",
  transitDateOutOfRange:
    "Les horaires de transport ne sont pas disponibles pour cette date.",
  waiting: "Attente",
  walking: "Marche",
  board: "Monter",
  getOff: "Descendre",
  direction: "Direction",
  stops: "arrêts",
  stopSingular: "arrêt",
  coach: "Car",
  tram: "Tram",
  metro: "Métro",
  regionalTrain: "Train régional",
  train: "Train",
  highSpeedTrain: "Train à grande vitesse",
  longDistanceTrain: "Train longue distance",
  transferWalk: "Correspondance",
  flight: "Vol",
  direct: "Direct",
  oneStop: "1 escale",
  nStops: "{count} escales",
  layover: "Escale",
  departureAirport: "Aéroport de départ",
  arrivalAirport: "Aéroport d'arrivée",
  terminal: "Terminal",
  operatedBy: "Exploité par",
  searchPrice: "Prix indicatif",
  priceConfirmed: "Prix confirmé",
  airportTransfer: "Transfert aéroport",
  airportChangeRequired: "Changement d'aéroport nécessaire",
  groundConnectionUnavailable: "La correspondance terrestre n'a pas pu être calculée",
  cheapest: "Le moins cher",
  recommended: "Recommandé",
  passengers: "Passagers",
  directFlightsOnly: "Vols directs uniquement",
  departureDate: "Date de départ",
  cabin: "Cabine",
  flightServiceUnavailable: "La recherche de vols est temporairement indisponible",
  flightProviderNotConfiguredDev: "L'API Amadeus Flight Offers n'est pas configurée",
  confirmPrice: "Confirmer le prix",
  confirmingPrice: "Confirmation du prix…",
  airportTime: "Heure aéroport",
  noFlightsFound: "Aucun vol trouvé",
  flightDateRequired: "Date de départ requise",
};

const de: RoutePlannerMessages = {
  ...en,
  title: "Route",
  routes: "Routen",
  openPlanner: "Route",
  origin: "Start",
  destination: "Ziel",
  useMyLocation: "Meinen Standort verwenden",
  chooseOnMap: "Auf der Karte wählen",
  swap: "Tauschen",
  addStop: "Zwischenstopp hinzufügen",
  car: "Auto",
  bicycle: "Fahrrad",
  pedestrian: "Zu Fuß",
  departNow: "Jetzt losfahren",
  fastest: "Schnellste",
  shortest: "Kürzeste",
  instructions: "Anweisungen",
  noRouteFound: "Keine Route gefunden",
  outsideCoverage: "Außerhalb des abgedeckten Gebiets",
  routeToPlace: "Route zu diesem Ort",
  routeFromHere: "Route von hier",
  routeToHere: "Route hierher",
  calculating: "Route wird berechnet…",
  tollsPresent: "Maut erkannt",
  tollPriceUnavailable: "Exakter Preis nicht verfügbar",
  fuelEstimate: "Kraftstoffschätzung",
  energyEstimate: "Energieschätzung",
  transit: "ÖPNV",
  transitServiceUnavailable:
    "Öffentliche Verkehrsmittel sind vorübergehend nicht verfügbar",
  transitProviderNotConfiguredDev: "Google Routes API ist nicht konfiguriert",
  transfers: "Umstiege",
  transfer: "Umstieg",
  fareUnavailable: "Tarif nicht verfügbar",
  fareEstimated: "Geschätzter Tarif",
  transitModes: "Öffentliche Verkehrsmittel",
  allPublicTransport: "Alle öffentlichen Verkehrsmittel",
  preferBus: "Bus",
  preferMetro: "U-Bahn / Metro",
  preferTram: "Tram / Stadtbahn",
  preferTrain: "Zug / Bahn",
  preferMetroTram: "U-Bahn / Tram",
  fewerTransfers: "Weniger Umstiege",
  lessWalking: "Weniger zu Fuß",
  transitDateOutOfRange:
    "Fahrpläne sind für dieses Datum nicht verfügbar.",
  waiting: "Wartezeit",
  walking: "Zu Fuß",
  board: "Einsteigen",
  getOff: "Aussteigen",
  direction: "Richtung",
  stops: "Haltestellen",
  stopSingular: "Haltestelle",
  coach: "Fernbus",
  tram: "Tram",
  metro: "U-Bahn",
  regionalTrain: "Regionalzug",
  train: "Zug",
  highSpeedTrain: "Hochgeschwindigkeitszug",
  longDistanceTrain: "Fernzug",
  transferWalk: "Umstieg",
  flight: "Flug",
  direct: "Direkt",
  oneStop: "1 Zwischenstopp",
  nStops: "{count} Zwischenstopps",
  layover: "Zwischenstopp",
  departureAirport: "Abflughafen",
  arrivalAirport: "Zielflughafen",
  terminal: "Terminal",
  operatedBy: "Durchgeführt von",
  searchPrice: "Richtpreis",
  priceConfirmed: "Preis bestätigt",
  airportTransfer: "Flughafentransfer",
  airportChangeRequired: "Flughafenwechsel erforderlich",
  groundConnectionUnavailable: "Die Bodenverbindung konnte nicht berechnet werden",
  cheapest: "Günstigste",
  recommended: "Empfohlen",
  passengers: "Passagiere",
  directFlightsOnly: "Nur Direktflüge",
  departureDate: "Abflugdatum",
  cabin: "Kabine",
  flightServiceUnavailable: "Die Flugsuche ist vorübergehend nicht verfügbar",
  flightProviderNotConfiguredDev: "Die Amadeus Flight Offers API ist nicht konfiguriert",
  confirmPrice: "Preis bestätigen",
  confirmingPrice: "Preis wird bestätigt…",
  airportTime: "Flughafenzeit",
  noFlightsFound: "Keine Flüge gefunden",
  flightDateRequired: "Abflugdatum erforderlich",
};

const es: RoutePlannerMessages = {
  ...en,
  title: "Ruta",
  routes: "Rutas",
  openPlanner: "Ruta",
  origin: "Origen",
  destination: "Destino",
  useMyLocation: "Usar mi ubicación",
  chooseOnMap: "Elegir en el mapa",
  swap: "Invertir",
  addStop: "Añadir parada",
  car: "Coche",
  bicycle: "Bicicleta",
  pedestrian: "A pie",
  departNow: "Salir ahora",
  fastest: "Más rápido",
  shortest: "Más corto",
  instructions: "Indicaciones",
  noRouteFound: "No se encontró ninguna ruta",
  outsideCoverage: "Fuera de la zona cubierta",
  routeToPlace: "Ruta a este lugar",
  routeFromHere: "Ruta desde aquí",
  routeToHere: "Ruta hasta aquí",
  calculating: "Calculando ruta…",
  tollsPresent: "Peajes detectados",
  tollPriceUnavailable: "Precio exacto no disponible",
  fuelEstimate: "Estimación de combustible",
  energyEstimate: "Estimación de energía",
};

const it: RoutePlannerMessages = {
  ...en,
  title: "Itinerario",
  routes: "Itinerari",
  openPlanner: "Itinerario",
  origin: "Partenza",
  destination: "Destinazione",
  useMyLocation: "Usa la mia posizione",
  chooseOnMap: "Scegli sulla mappa",
  swap: "Inverti",
  addStop: "Aggiungi tappa",
  car: "Auto",
  bicycle: "Bici",
  pedestrian: "A piedi",
  departNow: "Parti ora",
  fastest: "Più veloce",
  shortest: "Più breve",
  instructions: "Istruzioni",
  noRouteFound: "Nessun itinerario trovato",
  outsideCoverage: "Fuori dall'area coperta",
  routeToPlace: "Itinerario verso questo luogo",
  routeFromHere: "Itinerario da qui",
  routeToHere: "Itinerario fino a qui",
  calculating: "Calcolo dell'itinerario…",
  tollsPresent: "Pedaggi rilevati",
  tollPriceUnavailable: "Prezzo esatto non disponibile",
  fuelEstimate: "Stima carburante",
  energyEstimate: "Stima energia",
};

const pt: RoutePlannerMessages = {
  ...en,
  title: "Itinerário",
  routes: "Itinerários",
  openPlanner: "Itinerário",
  origin: "Origem",
  destination: "Destino",
  useMyLocation: "Usar a minha localização",
  chooseOnMap: "Escolher no mapa",
  swap: "Inverter",
  addStop: "Adicionar paragem",
  car: "Carro",
  bicycle: "Bicicleta",
  pedestrian: "A pé",
  departNow: "Sair agora",
  fastest: "Mais rápido",
  shortest: "Mais curto",
  instructions: "Instruções",
  noRouteFound: "Nenhum itinerário encontrado",
  outsideCoverage: "Fora da área coberta",
  routeToPlace: "Itinerário para este local",
  calculating: "A calcular o itinerário…",
  tollsPresent: "Portagens detetadas",
  tollPriceUnavailable: "Preço exato indisponível",
  fuelEstimate: "Estimativa de combustível",
  energyEstimate: "Estimativa de energia",
};

const nl: RoutePlannerMessages = {
  ...en,
  title: "Route",
  routes: "Routes",
  openPlanner: "Route",
  origin: "Vertrek",
  destination: "Bestemming",
  useMyLocation: "Mijn locatie gebruiken",
  chooseOnMap: "Kies op de kaart",
  swap: "Omkeren",
  addStop: "Stop toevoegen",
  car: "Auto",
  bicycle: "Fiets",
  pedestrian: "Te voet",
  departNow: "Nu vertrekken",
  fastest: "Snelste",
  shortest: "Kortste",
  instructions: "Aanwijzingen",
  noRouteFound: "Geen route gevonden",
  outsideCoverage: "Buiten het gedekte gebied",
  routeToPlace: "Route naar deze plaats",
  calculating: "Route berekenen…",
  tollsPresent: "Tolwegen gedetecteerd",
  fuelEstimate: "Brandstofschatting",
  energyEstimate: "Energieschatting",
};

const pl: RoutePlannerMessages = {
  ...en,
  title: "Trasa",
  routes: "Trasy",
  openPlanner: "Trasa",
  origin: "Początek",
  destination: "Cel",
  useMyLocation: "Użyj mojej lokalizacji",
  chooseOnMap: "Wybierz na mapie",
  swap: "Zamień",
  addStop: "Dodaj przystanek",
  car: "Samochód",
  bicycle: "Rower",
  pedestrian: "Pieszo",
  departNow: "Wyjedź teraz",
  fastest: "Najszybsza",
  shortest: "Najkrótsza",
  instructions: "Wskazówki",
  noRouteFound: "Nie znaleziono trasy",
  outsideCoverage: "Poza obszarem objętym",
  routeToPlace: "Trasa do tego miejsca",
  calculating: "Obliczanie trasy…",
  tollsPresent: "Wykryto opłaty drogowe",
  fuelEstimate: "Szacunek paliwa",
  energyEstimate: "Szacunek energii",
};

const packs: Record<Locale, RoutePlannerMessages> = {
  en,
  fr,
  de,
  es,
  it,
  pt,
  nl,
  pl,
  bg: { ...en, title: "Маршрут", origin: "Начало", destination: "Дестинация", car: "Автомобил", bicycle: "Велосипед", pedestrian: "Пеша", openPlanner: "Маршрут", routeToPlace: "Маршрут до това място", calculating: "Изчисляване…", noRouteFound: "Няма намерен маршрут", outsideCoverage: "Извън покритата зона" },
  hr: { ...en, title: "Ruta", origin: "Polazište", destination: "Odredište", car: "Automobil", bicycle: "Bicikl", pedestrian: "Pješice", openPlanner: "Ruta", routeToPlace: "Ruta do ovog mjesta", calculating: "Izračunavanje…", noRouteFound: "Ruta nije pronađena", outsideCoverage: "Izvan pokrivenog područja" },
  cs: { ...en, title: "Trasa", origin: "Výchozí bod", destination: "Cíl", car: "Auto", bicycle: "Kolo", pedestrian: "Pěšky", openPlanner: "Trasa", routeToPlace: "Trasa na toto místo", calculating: "Výpočet trasy…", noRouteFound: "Trasa nenalezena", outsideCoverage: "Mimo pokrytou oblast" },
  da: { ...en, title: "Rute", origin: "Start", destination: "Destination", car: "Bil", bicycle: "Cykel", pedestrian: "Til fods", openPlanner: "Rute", routeToPlace: "Rute til dette sted", calculating: "Beregner rute…", noRouteFound: "Ingen rute fundet", outsideCoverage: "Uden for dækket område" },
  et: { ...en, title: "Marsruut", origin: "Algus", destination: "Sihtkoht", car: "Auto", bicycle: "Jalgratas", pedestrian: "Jalgsi", openPlanner: "Marsruut", routeToPlace: "Marsruut sellesse kohta", calculating: "Marsruudi arvutamine…", noRouteFound: "Marsruuti ei leitud", outsideCoverage: "Väljaspool kaetud ala" },
  fi: { ...en, title: "Reitti", origin: "Lähtö", destination: "Määränpää", car: "Auto", bicycle: "Pyörä", pedestrian: "Kävely", openPlanner: "Reitti", routeToPlace: "Reitti tähän paikkaan", calculating: "Lasketaan reittiä…", noRouteFound: "Reittiä ei löytynyt", outsideCoverage: "Katetun alueen ulkopuolella" },
  el: { ...en, title: "Διαδρομή", origin: "Αφετηρία", destination: "Προορισμός", car: "Αυτοκίνητο", bicycle: "Ποδήλατο", pedestrian: "Πεζή", openPlanner: "Διαδρομή", routeToPlace: "Διαδρομή προς αυτό το μέρος", calculating: "Υπολογισμός διαδρομής…", noRouteFound: "Δεν βρέθηκε διαδρομή", outsideCoverage: "Εκτός καλυπτόμενης περιοχής" },
  hu: { ...en, title: "Útvonal", origin: "Indulás", destination: "Cél", car: "Autó", bicycle: "Kerékpár", pedestrian: "Gyalog", openPlanner: "Útvonal", routeToPlace: "Útvonal ehhez a helyhez", calculating: "Útvonal számítása…", noRouteFound: "Nem található útvonal", outsideCoverage: "A lefedett területen kívül" },
  ga: { ...en, title: "Bealach", origin: "Tús", destination: "Ceann scríbe", car: "Carr", bicycle: "Rothar", pedestrian: "Siúlóid", openPlanner: "Bealach", routeToPlace: "Bealach chuig an áit seo", calculating: "Bealach á ríomh…", noRouteFound: "Níor aimsíodh bealach", outsideCoverage: "Lasmuigh den limistéar clúdaithe" },
  lv: { ...en, title: "Maršruts", origin: "Sākums", destination: "Galapunkts", car: "Automašīna", bicycle: "Velosipēds", pedestrian: "Kājām", openPlanner: "Maršruts", routeToPlace: "Maršruts uz šo vietu", calculating: "Aprēķina maršrutu…", noRouteFound: "Maršruts nav atrasts", outsideCoverage: "Ārpus pārklātās zonas" },
  lt: { ...en, title: "Maršrutas", origin: "Pradžia", destination: "Tikslas", car: "Automobilis", bicycle: "Dviratis", pedestrian: "Pėsčiomis", openPlanner: "Maršrutas", routeToPlace: "Maršrutas į šią vietą", calculating: "Skaičiuojamas maršrutas…", noRouteFound: "Maršrutas nerastas", outsideCoverage: "Už dengtos zonos ribų" },
  mt: { ...en, title: "Rotta", origin: "Oriġini", destination: "Destinazzjoni", car: "Karozza", bicycle: "Mutur", pedestrian: "Mixi", openPlanner: "Rotta", routeToPlace: "Rotta lejn dan il-post", calculating: "Qed jikkalkula r-rotta…", noRouteFound: "L-ebda rotta ma nstabet", outsideCoverage: "Barra miż-żona koperta" },
  ro: { ...en, title: "Traseu", origin: "Origine", destination: "Destinație", car: "Mașină", bicycle: "Bicicletă", pedestrian: "Pe jos", openPlanner: "Traseu", routeToPlace: "Traseu către acest loc", calculating: "Se calculează traseul…", noRouteFound: "Nu s-a găsit niciun traseu", outsideCoverage: "În afara zonei acoperite" },
  sk: { ...en, title: "Trasa", origin: "Začiatok", destination: "Cieľ", car: "Auto", bicycle: "Bicykel", pedestrian: "Pešo", openPlanner: "Trasa", routeToPlace: "Trasa na toto miesto", calculating: "Výpočet trasy…", noRouteFound: "Trasa sa nenašla", outsideCoverage: "Mimo pokrytej oblasti" },
  sl: { ...en, title: "Pot", origin: "Izhodišče", destination: "Cilj", car: "Avto", bicycle: "Kolo", pedestrian: "Peš", openPlanner: "Pot", routeToPlace: "Pot do tega kraja", calculating: "Izračun poti…", noRouteFound: "Pot ni bila najdena", outsideCoverage: "Zunaj pokritega območja" },
  sv: { ...en, title: "Rutt", origin: "Start", destination: "Destination", car: "Bil", bicycle: "Cykel", pedestrian: "Till fots", openPlanner: "Rutt", routeToPlace: "Rutt till denna plats", calculating: "Beräknar rutt…", noRouteFound: "Ingen rutt hittades", outsideCoverage: "Utanför täckt område" },
};

export const routePlannerTranslations = packs;
