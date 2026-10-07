/**
 * Universal Intelligent Geocoding & Geospatial Location Intelligence
 * Comprehensive Pan-India High-Precision City & Region Database with Instant Zero-Latency Lookup.
 */

import { API_BASE } from "@/lib/api";

export type LocationBriefing = {
  name: string;
  state: string;
  country?: string;
  regionCategory?: "North" | "South" | "West" | "East" | "Central" | "Himalayan & Islands";
  type: string;
  coords: [number, number]; // [lng, lat]
  bbox: number[]; // [west, south, east, north]
  zoom: number;
  pitch: number;
  climateZone: string;
  terrainType: string;
  landCoverSummary: string;
  recommendedSensor: "Sentinel-2 MSI (Optical)" | "Sentinel-1 (C-Band SAR)" | "Joint Optical + SAR";
  suggestedQuestions: string[];
  ecologicalSignificance: string;
  localHotspots?: string[];
};

// Comprehensive Pan-India Multi-Tier City & Strategic Environmental Database
export const INDEXED_INDIAN_LOCATIONS: LocationBriefing[] = [
  // ==================== WESTERN INDIA ====================
  {
    name: "Ahmedabad & Sabarmati Corridor",
    state: "Gujarat",
    country: "India",
    regionCategory: "West",
    type: "Megacity & Industrial Metropolis",
    coords: [72.5714, 23.0225],
    bbox: [72.48, 22.95, 72.65, 23.10],
    zoom: 12.5,
    pitch: 52,
    climateZone: "Hot Semi-Arid (BSh)",
    terrainType: "Alluvial Plain & Urban Riverfront",
    landCoverSummary: "Dense built-up infrastructure (54%), peri-urban bare soil (28%), sparse vegetation (14%), Sabarmati reservoir water (4%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Measure urban built-up expansion (pp) along the SG Highway and SP Ring Road.",
      "Calculate NDVI vegetation loss due to commercial development.",
      "Track water surface changes in the Sabarmati Riverfront development.",
    ],
    ecologicalSignificance: "Major industrial and urban growth corridor in Western India experiencing high-rate peripheral land conversion.",
    localHotspots: [
      "SG Highway Tech Corridor",
      "Sabarmati Riverfront Phase 2",
      "Sanand Industrial GIDC",
      "SP Ring Road Commercial Belt",
      "Bopal-Ambli High-Density Zone",
      "Chandkheda Growth Node",
    ],
  },
  {
    name: "GIFT City (Gandhinagar)",
    state: "Gujarat",
    country: "India",
    regionCategory: "West",
    type: "Global Financial Tec-City & Smart Hub",
    coords: [72.6842, 23.1606],
    bbox: [72.65, 23.13, 72.72, 23.19],
    zoom: 13.5,
    pitch: 55,
    climateZone: "Semi-Arid Subtropical",
    terrainType: "Planned Smart Grid on River Sabarmati",
    landCoverSummary: "High-density commercial towers and underground utility tunnels (65%), planned green buffer (25%), riverfront bank (10%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Quantify vertical high-rise construction density and concrete footprint changes.",
      "Monitor Sabarmati riverfront embankment greening and flood defenses.",
      "Analyze thermal radiance and impervious surface expansion in GIFT Phase 2.",
    ],
    ecologicalSignificance: "India's first operational smart city and international financial services centre with automated district cooling and waste infrastructure.",
    localHotspots: [
      "GIFT Tower SEZ Zone",
      "International Banking Cluster",
      "Sabarmati Barrage Embankment",
      "FinTech Processing Hub",
    ],
  },
  {
    name: "Mumbai Coastal Peninsula & MMR",
    state: "Maharashtra",
    country: "India",
    regionCategory: "West",
    type: "Coastal Megacity & Financial Capital",
    coords: [72.8777, 19.0760],
    bbox: [72.76, 18.88, 73.02, 19.25],
    zoom: 11.8,
    pitch: 54,
    climateZone: "Tropical Monsoon (Am)",
    terrainType: "Coastal Peninsula & Creek Estuaries",
    landCoverSummary: "High-density urban fabric (58%), Arabian Sea and Thane Creek water (32%), Sanjay Gandhi National Park forest (10%).",
    recommendedSensor: "Sentinel-1 (C-Band SAR)",
    suggestedQuestions: [
      "Detect coastal reclamation footprints for coastal road and harbor expansions.",
      "Assess monsoon flood inundation across Mithi River basin using SAR radar.",
      "Analyze forest canopy health in Sanjay Gandhi National Park.",
    ],
    ecologicalSignificance: "Densely populated coastal peninsula vulnerable to Arabian Sea sea-level rise, storm surges, and monsoon waterlogging.",
    localHotspots: [
      "Bandra-Kurla Complex (BKC)",
      "Navi Mumbai International Airport Site",
      "Worli-Marine Drive Coastal Reclamation",
      "Thane Ghodbunder Infrastructure Belt",
      "Powai Lake Catchment",
      "JNPT Nhava Sheva Terminal",
      "Sanjay Gandhi National Park Canopy",
    ],
  },
  {
    name: "Pune & Hinjawadi IT Corridor",
    state: "Maharashtra",
    country: "India",
    regionCategory: "West",
    type: "Technology & Automotive Industrial Hub",
    coords: [73.8567, 18.5204],
    bbox: [73.72, 18.42, 73.98, 18.64],
    zoom: 12.2,
    pitch: 50,
    climateZone: "Tropical Wet and Dry (Aw)",
    terrainType: "Deccan Plateau Foothills (560m)",
    landCoverSummary: "Built-up tech parks & residential (52%), Deccan scrub slopes (26%), Mutha river basin (8%), irrigated agricultural fringes (14%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Measure tech park expansion in Hinjawadi Phases 1, 2, and 3.",
      "Quantify vegetation canopy shifts along the Western Ghats foothills.",
      "Track industrial footprint growth in Chakan and Talegaon auto belts.",
    ],
    ecologicalSignificance: "Fast-growing urban conglomerate nestled against the biodiversity-rich Western Ghats escarpment.",
    localHotspots: [
      "Swargate Multimodal Transit Hub & Saras Baug",
      "Hinjawadi Rajiv Gandhi Infotech Park",
      "Magarpatta City & Kharadi EON SEZ",
      "Chakan Automotive Cluster",
      "Viman Nagar & Nagar Road IT Belt",
      "Baner-Balewadi High Street",
      "Kothrud & Chandani Chowk",
      "Hadapsar Industrial Zone",
    ],
  },
  {
    name: "Swargate & Saras Baug (Pune)",
    state: "Maharashtra",
    country: "India",
    regionCategory: "West",
    type: "Transit Hub, Metro Junction & Urban Center",
    coords: [73.8575, 18.5005],
    bbox: [73.84, 18.485, 73.875, 18.515],
    zoom: 13.8,
    pitch: 52,
    climateZone: "Tropical Wet and Dry (Aw)",
    terrainType: "Urban Basin at Foothills of Parvati Hill",
    landCoverSummary: "High-density commercial fabric, underground Pune Metro station, bus transit terminal (72%), Saras Baug gardens & Peshwa lake (18%), Mutha canal buffer (10%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Analyze urban impervious surface and building density around Swargate Metro Station.",
      "Monitor green cover and lake water levels in Saras Baug and Peshwe Park.",
      "Track traffic corridor and commercial expansion along Shivaji Road and Satara Road.",
    ],
    ecologicalSignificance: "Crucial commercial gateway connecting Central Pune to Southern Maharashtra, bordered by the ecological Parvati Hill ridge.",
    localHotspots: [
      "Swargate Underground Metro Station",
      "Saras Baug & Peshwa Lake Park",
      "PMPML & MSRTC Central Bus Depot",
      "Parvati Hill Forest Reserve",
      "Shivaji Market Commercial Zone",
    ],
  },
  {
    name: "Surat Diamond City & Hazira",
    state: "Gujarat",
    country: "India",
    regionCategory: "West",
    type: "Diamond & Heavy Industry Hub",
    coords: [72.8311, 21.1702],
    bbox: [72.68, 21.05, 72.95, 21.28],
    zoom: 12.0,
    pitch: 48,
    climateZone: "Tropical Savanna (Aw)",
    terrainType: "Tapi Estuary & Coastal Alluvial Plain",
    landCoverSummary: "Dense urban fabric & industrial complexes (60%), Tapi river and tidal creeks (22%), coastal salt pans & bare soil (18%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Assess construction progress in the DREAM City Diamond Bourse zone.",
      "Monitor port and petrochemical expansion at Hazira Industrial Belt.",
      "Track tidal water dynamics along the Tapi river estuary.",
    ],
    ecologicalSignificance: "Critical economic hub on the Gulf of Khambhat with dynamic estuarine hydrology and massive industrial development.",
    localHotspots: [
      "Surat DREAM City Diamond Bourse",
      "Hazira Port & Industrial Belt",
      "Vesu-Dumas Urban Corridor",
      "Sachin GIDC Industrial Hub",
      "Tapi Riverfront Embankment",
    ],
  },
  {
    name: "Jaisalmer & Thar Desert Dunes",
    state: "Rajasthan",
    country: "India",
    regionCategory: "West",
    type: "Hyper-Arid Desert & Solar Energy Basin",
    coords: [70.9167, 26.9157],
    bbox: [70.75, 26.80, 71.05, 27.05],
    zoom: 11.8,
    pitch: 48,
    climateZone: "Hyper-Arid Hot Desert (BWh)",
    terrainType: "Aeolian Sand Dunes & Rocky Reg",
    landCoverSummary: "Bare sand and desert reg (76%), photovoltaic solar installations (14%), sparse xerophytic scrub (10%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Map newly installed ultra-mega solar park photovoltaic arrays.",
      "Detect sand dune migration and shifting ridge geometry.",
      "Quantify vegetation greening along Indira Gandhi Canal distributaries.",
    ],
    ecologicalSignificance: "Heart of the Great Indian Desert, undergoing rapid transformation via massive solar installations and canal irrigation.",
    localHotspots: [
      "Bhadla Ultra Mega Solar Park Area",
      "Sam Sand Dunes Tourism Corridor",
      "Pokhran Field Perimeter",
      "Indira Gandhi Feeder Canal Buffer",
    ],
  },
  {
    name: "Jaipur Pink City & SEZ",
    state: "Rajasthan",
    country: "India",
    regionCategory: "West",
    type: "Heritage Capital & Tech SEZ Hub",
    coords: [75.7873, 26.9124],
    bbox: [75.65, 26.78, 75.92, 27.02],
    zoom: 12.0,
    pitch: 50,
    climateZone: "Semi-Arid (BSh)",
    terrainType: "Aravalli Range Foothills & Alluvial Basin",
    landCoverSummary: "Dense settlement & historic core (52%), Aravalli hill forests (24%), dry agricultural lands (24%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Analyze urban sprawl along Ajmer Road and Mahindra World City SEZ.",
      "Assess Aravalli ridge forest conservation and quarrying encroachment.",
      "Map seasonal water levels in Ramgarh Lake catchment.",
    ],
    ecologicalSignificance: "Flanked by the ancient Aravalli range which acts as a barrier preventing desertification of the Indo-Gangetic Plains.",
    localHotspots: [
      "Mahindra World City SEZ",
      "Sitapura Industrial Area",
      "Jagatpura-Tonk Road Corridor",
      "Mansarovar Extension",
      "Aravalli Nahargarh Forest Ridge",
    ],
  },

  // ==================== SOUTHERN INDIA ====================
  {
    name: "Bengaluru Technology Corridor",
    state: "Karnataka",
    country: "India",
    regionCategory: "South",
    type: "High-Tech Urban Metropolitan Region",
    coords: [77.5946, 12.9716],
    bbox: [77.48, 12.85, 77.72, 13.08],
    zoom: 12.0,
    pitch: 48,
    climateZone: "Tropical Savanna (Aw)",
    terrainType: "Deccan Plateau (920m elevation)",
    landCoverSummary: "Impervious urban surface (62%), peri-urban green canopy (24%), urban lake cascades (Bellandur/Varthur 6%), bare ground (8%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Calculate lake surface area shrinkage and weed eutrophication (MNDWI).",
      "Assess tree canopy loss in Whitefield and Electronic City tech zones.",
      "Map new high-density residential developments between 2021 and 2024.",
    ],
    ecologicalSignificance: "Known as the Silicon Valley of India, situated on the Mysore Plateau with a fragile cascading lake catchment system.",
    localHotspots: [
      "Whitefield IT Expressway & EPIP Zone",
      "Electronic City Phases 1 & 2",
      "Bellandur & Varthur Lake Catchments",
      "Manyata Tech Park & Hebbal Corridor",
      "Outer Ring Road (Marathahalli-Sarjapur)",
      "Kempegowda Airport Aerotropolis (Devanahalli)",
    ],
  },
  {
    name: "Hyderabad Cyberabad & Outer Ring",
    state: "Telangana",
    country: "India",
    regionCategory: "South",
    type: "Pharma & IT Mega-Conglomerate",
    coords: [78.4867, 17.3850],
    bbox: [78.30, 17.25, 78.62, 17.55],
    zoom: 12.0,
    pitch: 50,
    climateZone: "Tropical Wet and Dry (Aw)",
    terrainType: "Granitic Deccan Plateau (542m)",
    landCoverSummary: "Built-up tech towers & residential layouts (56%), granitic rock outcrops (20%), urban water bodies & Musi river (10%), scrub (14%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Measure high-rise expansion in the Financial District & Kokapet Neopolis.",
      "Track urban water spread across Osman Sagar, Himayat Sagar, and Hussain Sagar.",
      "Analyze Pharma City and Genome Valley land conversion footprints.",
    ],
    ecologicalSignificance: "Prominent biotech and IT capital characterized by historic Deccan lake systems and dramatic rocky terrain.",
    localHotspots: [
      "HITEC City & Madhapur IT Cluster",
      "Gachibowli Financial District & Kokapet",
      "Hussain Sagar & Tank Bund Basin",
      "Genome Valley Biotech SEZ",
      "Shamshabad Airport City Corridor",
      "Uppal-Pocharam IT Hub",
    ],
  },
  {
    name: "Chennai OMR & Coastal Corridor",
    state: "Tamil Nadu",
    country: "India",
    regionCategory: "South",
    type: "Automotive, Hardware & Port Megacity",
    coords: [80.2707, 13.0827],
    bbox: [80.12, 12.85, 80.32, 13.20],
    zoom: 12.0,
    pitch: 48,
    climateZone: "Tropical Wet and Dry (Aw)",
    terrainType: "Coromandel Coastal Plain & Estuaries",
    landCoverSummary: "Urban built-up & manufacturing corridors (58%), Bay of Bengal coastal waters & Adyar/Cooum rivers (24%), Pallikaranai marshlands (18%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Monitor Pallikaranai marshland shrinkage and seasonal waterlogging.",
      "Analyze industrial and tech park sprawl along Old Mahabalipuram Road (OMR).",
      "Assess coastal harbor expansion at Chennai Port and Ennore Kamarajar Port.",
    ],
    ecologicalSignificance: "Coastal metropolis on the Coromandel coast featuring critical wetland buffers that mitigate cyclonic flooding.",
    localHotspots: [
      "Old Mahabalipuram Road (OMR) IT Expressway",
      "Sriperumbudur & Oragadam Automotive Hub",
      "Pallikaranai Wetland Sanctuary",
      "Ennore Port & Coastal Industrial Belt",
      "Guindy Industrial Estate & Ekkattuthangal",
      "Marina & ECR Coastal Strip",
    ],
  },
  {
    name: "Kochi Port & Vembanad Wetlands",
    state: "Kerala",
    country: "India",
    regionCategory: "South",
    type: "Ramsar Wetland & Deepwater Port",
    coords: [76.2673, 9.9312],
    bbox: [76.18, 9.85, 76.35, 10.02],
    zoom: 12.2,
    pitch: 50,
    climateZone: "Tropical Monsoon (Am)",
    terrainType: "Backwater Lagoon & Coastal Barrier Islands",
    landCoverSummary: "Open brackish water & Vembanad Lake (42%), dense tropical coconut canopy (38%), urban port infrastructure (20%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Monitor Vembanad Ramsar wetland shrinkage and aquatic weed spread.",
      "Track container terminal expansion on Vallarpadam Island.",
      "Assess post-monsoon flood siltation along Periyar River mouth.",
    ],
    ecologicalSignificance: "Longest lake in India and vital Ramsar wetland supporting commercial fisheries and maritime trade.",
    localHotspots: [
      "Infopark Kakkanad Phase 1 & 2",
      "Vallarpadam ICTT Container Transshipment Port",
      "SmartCity Kochi Tech Zone",
      "Willingdon Island Naval & Port Base",
      "Vembanad Lake Estuarine Channel",
    ],
  },
  {
    name: "Coimbatore & Western Ghats Pass",
    state: "Tamil Nadu",
    country: "India",
    regionCategory: "South",
    type: "Textile, Foundry & Tech Center",
    coords: [76.9558, 11.0168],
    bbox: [76.85, 10.92, 77.08, 11.12],
    zoom: 12.0,
    pitch: 46,
    climateZone: "Semi-Arid (BSh)",
    terrainType: "Palakkad Gap Basin & Western Ghats Foothills",
    landCoverSummary: "Industrial & urban infrastructure (48%), agrarian coconut/cotton groves (34%), montane forest buffer (18%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Track tech expansion along Avinashi Road and TIDEL Park Coimbatore.",
      "Analyze forest edge degradation in the Palakkad Gap wildlife corridor.",
      "Measure lake replenishment in the Noyyal river tank system.",
    ],
    ecologicalSignificance: "Located at the historic Palakkad Gap pass, regulating climatic flow between Kerala and Tamil Nadu.",
    localHotspots: [
      "TIDEL Park & Avinashi Road Tech Belt",
      "Saravanampatti IT Corridor",
      "Peelamedu Industrial Zone",
      "Noyyal River Catchment Tanks",
    ],
  },
  {
    name: "Visakhapatnam (Vizag) Port & Coastal Ridge",
    state: "Andhra Pradesh",
    country: "India",
    regionCategory: "South",
    type: "Port City & Eastern Naval Command",
    coords: [83.2185, 17.6868],
    bbox: [83.10, 17.58, 83.35, 17.82],
    zoom: 12.0,
    pitch: 52,
    climateZone: "Tropical Wet and Dry (Aw)",
    terrainType: "Coastal Hills (Eastern Ghats) & Natural Harbor",
    landCoverSummary: "Port & heavy manufacturing infrastructure (50%), Bay of Bengal coastline (30%), Eastern Ghats hill reserve (20%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Assess industrial footprints around Visakhapatnam Steel Plant and Gangavaram Port.",
      "Track IT SEZ expansion on Rushikonda Hills.",
      "Monitor coastal erosion and beach replenishment along RK Beach.",
    ],
    ecologicalSignificance: "Natural harbor flanked by the Dolphin's Nose and Eastern Ghats hills, facing Bay of Bengal tropical storms.",
    localHotspots: [
      "Rushikonda IT SEZ & Millennium Tower",
      "Gangavaram Deepwater Port",
      "Visakhapatnam Steel Plant (RINL) Complex",
      "Madhurawada Coastal Urban Growth Corridor",
      "Dolphin's Nose Promontory",
    ],
  },

  // ==================== NORTHERN INDIA ====================
  {
    name: "Delhi NCR Mega-Urban Agglomeration",
    state: "Delhi NCR",
    country: "India",
    regionCategory: "North",
    type: "National Capital Region & Megacity",
    coords: [77.2090, 28.6139],
    bbox: [76.95, 28.40, 77.45, 28.85],
    zoom: 11.5,
    pitch: 50,
    climateZone: "Semi-Arid (BSh)",
    terrainType: "Indo-Gangetic Floodplain & Aravalli Ridge",
    landCoverSummary: "High-density urban fabric (68%), Yamuna river floodplain (12%), Aravalli Delhi Ridge green forest (10%), peri-urban agriculture (10%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Detect encroachment and construction along the Yamuna active floodplain.",
      "Measure high-density urban expansion across Dwarka Expressway and New Gurgaon.",
      "Calculate forest canopy changes across the Southern Delhi Ridge reserve.",
    ],
    ecologicalSignificance: "Political and economic centre of Northern India, facing critical urban heat island, air quality, and Yamuna hydrological challenges.",
    localHotspots: [
      "Gurgaon DLF Cyber City & Golf Course Road",
      "Noida Sector 62 & Expressway Tech Corridor",
      "Dwarka Expressway Infrastructure Corridor",
      "Yamuna River Floodplain & Biodiversity Park",
      "Okhla Industrial & Waste-to-Energy Area",
      "IGI Airport Aero City & Aerotropolis",
      "Central Vista & Diplomatic Enclave",
    ],
  },
  {
    name: "Chandigarh, Mohali & Panchkula (Tricity)",
    state: "Punjab / Haryana",
    country: "India",
    regionCategory: "North",
    type: "Planned Modern Metropolis & IT Hub",
    coords: [76.7794, 30.7333],
    bbox: [76.65, 30.62, 76.90, 30.82],
    zoom: 12.2,
    pitch: 46,
    climateZone: "Subtropical Monsoon (Cwa)",
    terrainType: "Shivalik Range Foothills & Alluvial Grid",
    landCoverSummary: "Planned urban sectors & green boulevards (58%), agricultural fields (28%), Sukhna lake & forest buffer (14%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Track IT and commercial growth in Mohali Sectors 82 & 83.",
      "Monitor water surface area and siltation in Sukhna Lake (MNDWI).",
      "Analyze highway urbanization along the Zirakpur-Derabassi corridor.",
    ],
    ecologicalSignificance: "Iconic planned city designed by Le Corbusier, positioned at the foothills of the Himalayan Shivalik barrier.",
    localHotspots: [
      "Mohali IT City (Sector 82 & 83)",
      "Sukhna Lake & Wildlife Sanctuary",
      "Chandigarh Technology Park (Kishangarh)",
      "Aerocity & Airport Road Corridor",
      "Zirakpur Commercial Highway Junction",
    ],
  },
  {
    name: "Ludhiana Agricultural & Industrial Basin",
    state: "Punjab",
    country: "India",
    regionCategory: "North",
    type: "Agrarian Heart & Textile/Engineering City",
    coords: [75.8573, 30.9010],
    bbox: [75.75, 30.82, 75.95, 30.98],
    zoom: 12.0,
    pitch: 45,
    climateZone: "Semi-Arid (BSh)",
    terrainType: "Intensively Irrigated Indo-Gangetic Alluvium",
    landCoverSummary: "Wheat/paddy intensive agricultural fields (68%), industrial & urban fabric (28%), canal networks (4%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Track crop rotation cycles and NDVI peak vitality across wheat/rice seasons.",
      "Detect post-harvest stubble burning thermal signatures and field clearing.",
      "Measure urban expansion onto prime agricultural land.",
    ],
    ecologicalSignificance: "Primary grain basket of India, characterized by high-density tube-well and canal irrigation.",
    localHotspots: [
      "Focal Point Industrial Estate",
      "South City Canal Road Corridor",
      "Budha Nullah Drainage Basin",
      "Sutlej River Floodplain Agricultural Belt",
    ],
  },
  {
    name: "Varanasi & Middle Ganga Basin",
    state: "Uttar Pradesh",
    country: "India",
    regionCategory: "North",
    type: "Sacred City & Fertile Alluvial Plain",
    coords: [83.0064, 25.3176],
    bbox: [82.92, 25.24, 83.08, 25.38],
    zoom: 12.4,
    pitch: 45,
    climateZone: "Humid Subtropical (Cwa)",
    terrainType: "Indo-Gangetic Alluvial Floodplain",
    landCoverSummary: "Intensive agricultural farmland (52%), urban ghats & settlement (36%), Ganga river channel (12%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Track seasonal Ganga riverbank sandbar migration and meander shifts.",
      "Calculate crop NDVI vitality across the fertile alluvial floodplain.",
      "Detect urban sprawl along the Ring Road and Sarnath corridors.",
    ],
    ecologicalSignificance: "Cultural and ecological heart of the sacred Ganga river basin with intensive agrarian double-cropping.",
    localHotspots: [
      "Varanasi Ring Road Expansion Corridor",
      "Kashi Ghats & Ganga River Channel",
      "Sarnath Cultural & Green Perimeter",
      "Ramnagar Industrial Area",
    ],
  },
  {
    name: "Lucknow Gomti Basin & IT City",
    state: "Uttar Pradesh",
    country: "India",
    regionCategory: "North",
    type: "State Capital & Emerging Technology Hub",
    coords: [80.9462, 26.8467],
    bbox: [80.82, 26.72, 81.08, 26.96],
    zoom: 12.0,
    pitch: 48,
    climateZone: "Humid Subtropical (Cwa)",
    terrainType: "Gomti River Alluvial Basin",
    landCoverSummary: "Urban settlements and modern extensions (54%), agrarian belt (34%), Gomti river and wetlands (12%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Measure urban expansion in Gomti Nagar Extension and Shaheed Path.",
      "Analyze land conversion around the IT City on Sultanpur Road.",
      "Track Gomti riverbed water levels and riparian vegetative buffer.",
    ],
    ecologicalSignificance: "Central Awadh administrative hub undergoing rapid suburban and IT park infrastructure growth.",
    localHotspots: [
      "Gomti Nagar Extension & Shaheed Path",
      "HCL IT City Sultanpur Road Corridor",
      "Gomti Riverfront Eco-Park",
      "Amausi Airport Logistics Hub",
    ],
  },
  {
    name: "Dehradun Valley & Rishikesh Foothills",
    state: "Uttarakhand",
    country: "India",
    regionCategory: "North",
    type: "Sub-Himalayan Valley & Ganga River Basin",
    coords: [78.0322, 30.3165],
    bbox: [77.92, 30.18, 78.35, 30.42],
    zoom: 11.8,
    pitch: 55,
    climateZone: "Subtropical Montane (Cwa)",
    terrainType: "Doon Valley between Shivaliks & Lesser Himalayas",
    landCoverSummary: "Sal & broadleaf mountain forests (52%), urban Doon valley settlements (32%), seasonal riverbeds (Rispana/Ganga 16%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Detect forest fragmentation and construction along Sahastradhara and Rajpur Road.",
      "Assess seasonal flood dynamics along the Ganga riverbed in Rishikesh.",
      "Track urban density growth in Dehradun Valley.",
    ],
    ecologicalSignificance: "Ecologically sensitive Doon Valley bounded by Rajaji National Park and the Mussoorie Himalayan ridge.",
    localHotspots: [
      "Sahastradhara IT Park Corridor",
      "Rajpur Road Montane Suburbs",
      "Rishikesh Ganga Riverfront",
      "Jolly Grant Airport Corridor",
    ],
  },

  // ==================== EASTERN & NORTH-EASTERN INDIA ====================
  {
    name: "Kolkata & New Town Smart Corridor",
    state: "West Bengal",
    country: "India",
    regionCategory: "East",
    type: "Megacity, Port & Tech City",
    coords: [88.3639, 22.5726],
    bbox: [88.22, 22.42, 88.52, 22.70],
    zoom: 12.0,
    pitch: 50,
    climateZone: "Tropical Wet-and-Dry (Aw)",
    terrainType: "Lower Gangetic Delta & Tidal Estuary",
    landCoverSummary: "High-density urban core (56%), East Kolkata Ramsar Wetlands (24%), Hooghly river water (12%), peri-urban aquaculture ponds (8%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Map construction and commercial footprints in New Town Action Areas 1, 2, and 3.",
      "Assess conservation and water spread of the East Kolkata Ramsar Wetlands.",
      "Track sediment and shoreline changes along the Hooghly River.",
    ],
    ecologicalSignificance: "Home to the East Kolkata Wetlands, the world's largest natural wastewater treatment ecosystem using sun and algae ponds.",
    localHotspots: [
      "New Town Action Area 1-3 & Smart City",
      "Salt Lake Sector V IT Hub",
      "East Kolkata Ramsar Wetlands (Bheris)",
      "Rajarhat Expansion Corridor",
      "Howrah Hooghly Riverfront",
    ],
  },
  {
    name: "Sundarbans Mangrove Delta",
    state: "West Bengal",
    country: "India",
    regionCategory: "East",
    type: "Tidal Mangrove & Biosphere Reserve",
    coords: [88.8535, 21.9497],
    bbox: [88.65, 21.80, 89.05, 22.10],
    zoom: 11.2,
    pitch: 45,
    climateZone: "Tropical Wet & Mangrove Tidal",
    terrainType: "Estuarine Delta & Mangrove Swamps",
    landCoverSummary: "Dense halophytic mangrove canopy (48%), dynamic tidal waterways (38%), and coastal mudflats (14%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Quantify mangrove shoreline retreat and tidal water ingress between 2022 and 2024.",
      "Identify sediment deposition dynamics across the estuarine channels.",
      "Detect cyclone damage or inundation in the peripheral forest zones.",
    ],
    ecologicalSignificance: "UNESCO World Heritage site and the largest continuous mangrove forest on Earth, serving as India's primary storm buffer against Bay of Bengal cyclones.",
    localHotspots: [
      "Gosaba Mangrove Estuary",
      "Sagar Island Coastal Buffer",
      "Matla River Tidal Ingress Zone",
      "Jharkhali Tiger Reserve Perimeter",
    ],
  },
  {
    name: "Bhubaneswar Smart City & Info Valley",
    state: "Odisha",
    country: "India",
    regionCategory: "East",
    type: "Planned Capital & IT Hub",
    coords: [85.8245, 20.2961],
    bbox: [85.70, 20.18, 85.92, 20.38],
    zoom: 12.2,
    pitch: 48,
    climateZone: "Tropical Wet and Dry (Aw)",
    terrainType: "Coastal Alluvial Plain & Chandaka Forest Buffer",
    landCoverSummary: "Planned urban sectors & IT parks (50%), Chandaka elephant sanctuary forest (28%), Daya river agrarian belt (22%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Measure industrial and tech development in Info Valley II (Khordha).",
      "Assess forest cover health in the Chandaka Wildlife Sanctuary.",
      "Track Daya river flood water management during monsoon peaks.",
    ],
    ecologicalSignificance: "Top-ranking smart city surrounded by elephant sanctuary forests and the coastal Daya river catchment.",
    localHotspots: [
      "Info Valley II & Infocity IT Parks",
      "Chandaka Forest Eco-Buffer",
      "Daya River Basin Corridor",
      "Patia-Khandagiri Urban Axis",
    ],
  },
  {
    name: "Patna Ganga Corridor & Bihta",
    state: "Bihar",
    country: "India",
    regionCategory: "East",
    type: "Historic Riverine Capital & Expansion Zone",
    coords: [85.1376, 25.5941],
    bbox: [85.00, 25.50, 85.25, 25.68],
    zoom: 12.0,
    pitch: 45,
    climateZone: "Humid Subtropical (Cwa)",
    terrainType: "Ganga, Son and Punpun River Confluence Floodplain",
    landCoverSummary: "High-density riverfront settlement (54%), intensive agrarian fertile land (36%), Ganga braided sand channels (10%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Track construction along the Ganga Marine Drive (JP Ganga Path).",
      "Measure industrial and IT park growth in the Bihta expansion corridor.",
      "Analyze sandbar (diara) shifts and seasonal inundation in the Ganga.",
    ],
    ecologicalSignificance: "Situated at the unique confluence of four major Himalayan rivers (Ganga, Son, Gandak, Punpun).",
    localHotspots: [
      "Ganga Marine Drive (JP Ganga Path)",
      "Bihta IT Park & Industrial Corridor",
      "Digha Ghat Riverfront",
      "Fatuha Logistics Hub",
    ],
  },
  {
    name: "Kaziranga Floodplains & Brahmaputra",
    state: "Assam",
    country: "India",
    regionCategory: "East",
    type: "National Park & Wildlife Corridor",
    coords: [93.1711, 26.6638],
    bbox: [93.00, 26.55, 93.35, 26.78],
    zoom: 11.5,
    pitch: 46,
    climateZone: "Humid Subtropical & Heavy Monsoon (Cwa)",
    terrainType: "Braided River Island & Tall Elephant Grassland",
    landCoverSummary: "Dense wet alluvial grassland (46%), semi-evergreen forest (28%), Brahmaputra braided sandbars and beels (26%).",
    recommendedSensor: "Sentinel-1 (C-Band SAR)",
    suggestedQuestions: [
      "Map annual Brahmaputra monsoon inundation extent across wildlife highland refuges.",
      "Analyze river island (char) erosion and deposition dynamics.",
      "Monitor elephant grass biophysical density changes.",
    ],
    ecologicalSignificance: "Home to the world's largest population of great one-horned rhinos, shaped by annual flood cycles of the Brahmaputra.",
    localHotspots: [
      "Brahmaputra Braided River Channels",
      "Bagori & Kohora Range Grasslands",
      "Karbi Anglong Highland Animal Corridors",
    ],
  },
  {
    name: "Guwahati & Deepor Beel Basin",
    state: "Assam",
    country: "India",
    regionCategory: "East",
    type: "North-East Gateway & Ramsar Wetland",
    coords: [91.7362, 26.1445],
    bbox: [91.58, 26.04, 91.88, 26.24],
    zoom: 12.0,
    pitch: 52,
    climateZone: "Humid Subtropical (Cwa)",
    terrainType: "Brahmaputra River Valley & Montane Hills",
    landCoverSummary: "Urban built-up fabric (50%), Deepor Beel wetland (18%), dense hill forests (20%), Brahmaputra riverbed (12%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Monitor Deepor Beel Ramsar wetland shrinkage and encroaching urban developments.",
      "Track bridge and logistics construction across the Brahmaputra at North Guwahati.",
      "Assess forest canopy health on the Kamakhya and surrounding hill ridges.",
    ],
    ecologicalSignificance: "Primary metropolitan hub of Northeast India, harboring the vital Deepor Beel wetland for migratory bird flyways.",
    localHotspots: [
      "Deepor Beel Ramsar Wetland Reserve",
      "North Guwahati IIT Tech Corridor",
      "Brahmaputra Riverfront Promenade",
      "Dispur Capital Complex",
    ],
  },

  // ==================== CENTRAL & HIMALAYAN INDIA ====================
  {
    name: "Indore Super Corridor & Pithampur",
    state: "Madhya Pradesh",
    country: "India",
    regionCategory: "Central",
    type: "Commercial Capital & Cleanest City",
    coords: [75.8577, 22.7196],
    bbox: [75.72, 22.60, 75.98, 22.84],
    zoom: 12.0,
    pitch: 48,
    climateZone: "Tropical Savanna (Aw)",
    terrainType: "Malwa Plateau (550m)",
    landCoverSummary: "Urban built-up & planned corridors (54%), fertile black cotton soil farmland (38%), water tanks (8%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Track tech campus development along the Indore Super Corridor.",
      "Analyze industrial expansion in the Pithampur Auto Cluster (SEZ).",
      "Measure lake revival and green cover in Bilawali and Sirpur lakes.",
    ],
    ecologicalSignificance: "Commercial hub of the Malwa plateau renowned for high-rate urban infrastructure and environmental clean initiatives.",
    localHotspots: [
      "Super Corridor IT & Educational Belt (TCS/Infosys)",
      "Pithampur Industrial Auto SEZ",
      "Vijay Nagar & Ring Road Commercial Hub",
      "Sirpur Lake Ramsar Wetland",
    ],
  },
  {
    name: "Bhopal & Bhoj Wetland (Upper Lake)",
    state: "Madhya Pradesh",
    country: "India",
    regionCategory: "Central",
    type: "City of Lakes & State Capital",
    coords: [77.4126, 23.2599],
    bbox: [77.30, 23.16, 77.52, 23.34],
    zoom: 12.2,
    pitch: 48,
    climateZone: "Humid Subtropical (Cwa)",
    terrainType: "Malwa Plateau Undulating Hills & Lakes",
    landCoverSummary: "Urban fabric (52%), Bhojtal Upper Lake water body (26%), Van Vihar National Park forest (22%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Monitor Bhojtal (Upper Lake) water levels and catchment vegetation.",
      "Assess industrial growth in Mandideep and Govindpura estates.",
      "Analyze forest canopy integrity in Van Vihar National Park.",
    ],
    ecologicalSignificance: "Home to the historic Bhoj Wetland, an essential Ramsar wetland constructed in the 11th century.",
    localHotspots: [
      "Bhojtal (Upper Lake) Catchment",
      "Van Vihar National Park Forest",
      "Mandideep Industrial Corridor",
      "Hoshangabad Road Growth Corridor",
    ],
  },
  {
    name: "Shimla Himalayan Ridge",
    state: "Himachal Pradesh",
    country: "India",
    regionCategory: "Himalayan & Islands",
    type: "Montane Hill Station & Pine Forest",
    coords: [77.1734, 31.1048],
    bbox: [77.08, 31.02, 77.25, 31.18],
    zoom: 12.4,
    pitch: 62,
    climateZone: "Subtropical Highland (Cwb)",
    terrainType: "Steep Himalayan Ridges & Valleys (2,200m)",
    landCoverSummary: "Coniferous pine/deodar forest (56%), montane slopes & bare rock (26%), high-slope urban settlements (18%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Analyze forest canopy health and deforestation along ridge roads.",
      "Assess slope stability and landslide susceptibility zones.",
      "Track seasonal snowfall coverage on higher Shivalik peaks.",
    ],
    ecologicalSignificance: "Key catchment for the Sutlej and Yamuna river systems with critical Himalayan biodiversity.",
    localHotspots: [
      "Mall Road & Ridge Montane Axis",
      "Sanjauli-Dhalli Highway Corridor",
      "Kufri Snow & Pine Ridge",
      "Jutogh Forest Catchment",
    ],
  },
  {
    name: "Ladakh High-Altitude Cold Desert (Leh)",
    state: "Ladakh",
    country: "India",
    regionCategory: "Himalayan & Islands",
    type: "Trans-Himalayan Cold Desert Plateau",
    coords: [77.5771, 34.1526],
    bbox: [77.45, 34.05, 77.70, 34.25],
    zoom: 11.8,
    pitch: 58,
    climateZone: "Cold Arid Alpine (BWk)",
    terrainType: "High-Altitude Glaciated Valley (3,500m+)",
    landCoverSummary: "Bare scree, rock & glacial moraine (74%), snow/ice caps (16%), river valley oasis agriculture (10%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Calculate snow cover retreat and glacial melt lake formation.",
      "Map Indus River oasis agricultural greening (NDVI).",
      "Monitor military and civilian infrastructure along mountain highways.",
    ],
    ecologicalSignificance: "Fragile high-altitude trans-Himalayan ecosystem dependent on glacial meltwater for perennial survival.",
    localHotspots: [
      "Indus River Oasis Agriculture Strip",
      "Leh Kushok Bakula Airport & Defense Base",
      "Khardung La High Mountain Pass Foot",
      "Spituk Monastery Valley Basin",
    ],
  },
];

/**
 * Reverse Geocode: Generate instant briefing for ANY clicked coordinate on the 3D Globe
 */
export async function reverseGeocodeLocation(lat: number, lon: number): Promise<LocationBriefing> {
  const normLat = Number(lat.toFixed(5));
  const normLon = Number(lon.toFixed(5));

  // Check if near any pre-indexed location
  const nearMatch = INDEXED_INDIAN_LOCATIONS.find(
    (loc) =>
      Math.abs(loc.coords[1] - normLat) < 0.15 &&
      Math.abs(loc.coords[0] - normLon) < 0.15
  );

  if (nearMatch) {
    return {
      ...nearMatch,
      coords: [normLon, normLat],
    };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${normLat}&lon=${normLon}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "SatQuery-AI-Geospatial-Console/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const name =
        data.name ||
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        addr.municipality ||
        addr.state_district ||
        addr.state ||
        `Target Location [${normLat}, ${normLon}]`;

      const state = addr.state || addr.region || addr.province || "Regional Area";
      const country = addr.country || "Earth";
      const placeType = data.type || data.class || "Geographical Coordinates";

      const west = Number((normLon - 0.05).toFixed(5));
      const south = Number((normLat - 0.05).toFixed(5));
      const east = Number((normLon + 0.05).toFixed(5));
      const north = Number((normLat + 0.05).toFixed(5));

      return {
        name,
        state,
        country,
        type: `${placeType.toUpperCase()} · ${country}`,
        coords: [normLon, normLat],
        bbox: [west, south, east, north],
        zoom: 12.0,
        pitch: 50,
        climateZone: inferClimateZone(normLat, normLon, state),
        terrainType: `${placeType} in ${state}, ${country}`,
        landCoverSummary: `Regional surface profile at coordinates ${normLat}°N, ${normLon}°E. Surface reflectance computed from Sentinel bands upon acquisition.`,
        recommendedSensor: Math.abs(normLat) < 22 && normLon > 80 ? "Sentinel-1 (C-Band SAR)" : "Sentinel-2 MSI (Optical)",
        suggestedQuestions: [
          `Describe the land-cover classification and natural features visible at ${name}.`,
          `Analyze changes in built-up infrastructure and vegetation cover over recent seasons.`,
          `Compute NDVI vegetation vigour and water boundaries (MNDWI) for this AOI.`,
        ],
        ecologicalSignificance: `Geographical position located in ${state}, ${country} (${normLat}°N, ${normLon}°E).`,
        localHotspots: [
          `${name} Central Grid`,
          `${name} Growth Corridor`,
          `${name} Environmental Perimeter`,
        ],
      };
    }
  } catch {
    // fallback
  }

  // Fallback for offline or fast coordinate click
  const west = Number((normLon - 0.05).toFixed(5));
  const south = Number((normLat - 0.05).toFixed(5));
  const east = Number((normLon + 0.05).toFixed(5));
  const north = Number((normLat + 0.05).toFixed(5));

  return {
    name: `Target Coordinates [${normLat}° N, ${normLon}° E]`,
    state: "Earth Coordinates",
    country: "Global",
    type: "Target Acquisition AOI",
    coords: [normLon, normLat],
    bbox: [west, south, east, north],
    zoom: 12.0,
    pitch: 50,
    climateZone: inferClimateZone(normLat, normLon, ""),
    terrainType: `Surface Area at ${normLat}°N, ${normLon}°E`,
    landCoverSummary: "Multi-spectral optical surface reflectance and SAR microwave backscatter available via Copernicus constellation.",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      `Describe the land cover and major objects visible in this satellite scene.`,
      `Has the built-up area increased, decreased, or remained unchanged?`,
      `Calculate the NDVI vegetation index for this locked area of interest.`,
    ],
    ecologicalSignificance: `Target area centered at coordinates ${normLat}°N, ${normLon}°E.`,
    localHotspots: [
      `Coordinate Sector Alpha`,
      `Coordinate Sector Beta`,
    ],
  };
}

/**
 * Universal Search: Searches across Indian cities, precise hotspots, and worldwide geocoding
 */
export async function searchAnyLocation(query: string): Promise<LocationBriefing[]> {
  const q = query.trim();
  if (!q) return INDEXED_INDIAN_LOCATIONS.slice(0, 8);

  // Check direct coordinate input
  const coordMatch = q.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
  if (coordMatch) {
    const p1 = parseFloat(coordMatch[1]);
    const p2 = parseFloat(coordMatch[2]);
    let lat = p1;
    let lon = p2;
    if (Math.abs(p1) > 90 && Math.abs(p2) <= 90) {
      lon = p1;
      lat = p2;
    }
    const briefing = await reverseGeocodeLocation(lat, lon);
    return [briefing];
  }

  // 1. Check local pre-indexed high-precision database
  const qLow = q.toLowerCase();
  const localMatches = INDEXED_INDIAN_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(qLow) ||
      loc.state.toLowerCase().includes(qLow) ||
      loc.type.toLowerCase().includes(qLow) ||
      loc.climateZone.toLowerCase().includes(qLow) ||
      (loc.localHotspots && loc.localHotspots.some((h) => h.toLowerCase().includes(qLow)))
  );

  // 2. Fetch server-side geocoding endpoint (${API_BASE}/geocode or /api/geocode)
  let serverData: any[] = [];
  try {
    const endpoints = [
      `${API_BASE}/geocode?q=${encodeURIComponent(q)}&limit=8`,
      `/api/geocode?q=${encodeURIComponent(q)}&limit=8`,
    ];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d) && d.length > 0) {
            serverData = d;
            break;
          }
        }
      } catch {
        // try next endpoint
      }
    }

    // 3. Fallback to direct OpenStreetMap Nominatim for any town, village, or global place
    if (serverData.length === 0) {
      const osmUrls = [
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&addressdetails=1&limit=8`,
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=8`,
      ];
      for (const url of osmUrls) {
        try {
          const res = await fetch(url, { headers: { "Accept-Language": "en" } });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              serverData = data.map((item: any) => {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                const bb = item.boundingbox ? [
                  parseFloat(item.boundingbox[2]),
                  parseFloat(item.boundingbox[0]),
                  parseFloat(item.boundingbox[3]),
                  parseFloat(item.boundingbox[1]),
                ] : [lon - 0.03, lat - 0.03, lon + 0.03, lat + 0.03];
                const parts = (item.display_name || "").split(",").map((p: string) => p.trim());
                return {
                  name: parts[0] || q,
                  state: item.address?.state || parts[parts.length - 2] || "India",
                  country: item.address?.country || "India",
                  type: (item.type || "Geographical Region").replace(/_/g, " "),
                  coords: [lon, lat],
                  bbox: bb,
                };
              });
              break;
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn("Geocode lookup notice:", err);
  }

  const mappedServer: LocationBriefing[] = serverData.map((item: any) => {
    const lat = item.coords[1];
    const lon = item.coords[0];
    const name = item.name || q;
    const state = item.state || "India";
    const country = item.country || "India";
    const type = item.type || "Geographical Region";
    return {
      name,
      state,
      country,
      type,
      coords: [lon, lat],
      bbox: item.bbox || [
        Number((lon - 0.03).toFixed(5)),
        Number((lat - 0.03).toFixed(5)),
        Number((lon + 0.03).toFixed(5)),
        Number((lat + 0.03).toFixed(5)),
      ],
      zoom: 13.0,
      pitch: 48,
      climateZone: inferClimateZone(lat, lon, state),
      terrainType: `${type} in ${state}, ${country}`,
      landCoverSummary: `Regional surface profile over ${name} within ${state}, ${country}. Multispectral reflectance computed upon acquisition.`,
      recommendedSensor: "Sentinel-2 MSI (Optical)",
      suggestedQuestions: [
        `What is the detailed land-cover breakdown (built-up, vegetation, water, bare) across ${name}?`,
        `Identify major urban infrastructure, transportation corridors, and structural density in ${name}.`,
        `Detect surface water bodies, canals, and vegetation canopy vitality in ${name}.`,
      ],
      ecologicalSignificance: `Geographical zone situated in ${state}, ${country} at ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E.`,
      localHotspots: [`${name} Central Sector`, `${name} Commercial Corridor`],
    };
  });

  const combined = [...localMatches];
  for (const r of mappedServer) {
    if (!combined.some((c) => Math.abs(c.coords[0] - r.coords[0]) < 0.02 && Math.abs(c.coords[1] - r.coords[1]) < 0.02)) {
      combined.push(r);
    }
  }

  return combined;
}

function inferClimateZone(lat: number, lon: number, state: string): string {
  const s = (state || "").toLowerCase();
  if (s.includes("rajasthan") || (s.includes("gujarat") && lon < 71)) return "Arid Desert (BWh)";
  if (s.includes("kerala") || s.includes("goa") || s.includes("coastal karnataka")) return "Tropical Monsoon (Am)";
  if (s.includes("himachal") || s.includes("uttarakhand") || s.includes("jammu") || s.includes("ladakh")) return "Montane / Alpine";
  if (s.includes("assam") || s.includes("meghalaya") || s.includes("bengal")) return "Humid Subtropical (Cwa)";
  if (Math.abs(lat) > 55) return "Subpolar / Tundra";
  if (Math.abs(lat) > 35) return "Temperate Continental";
  if (Math.abs(lat) < 15) return "Equatorial Tropical";
  return "Tropical Savanna / Subtropical";
}
