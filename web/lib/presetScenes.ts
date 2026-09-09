import type { ImageRef, Scene } from "./api";

export type PresetScene = {
  id: string;
  name: string;
  locationName: string;
  state: string;
  coords: [number, number]; // [lon, lat]
  bbox: number[]; // [west, south, east, north]
  images: ImageRef[];
  scenes: Scene[];
  description: string;
  defaultPrompt: string;
  badge?: string;
};

export const PRESET_SATELLITE_SCENES: PresetScene[] = [
  {
    id: "pune-swargate",
    name: "Pune Swargate & Parvati Valley",
    locationName: "Pune",
    state: "Maharashtra",
    coords: [73.8567, 18.5018],
    bbox: [73.82, 18.47, 73.89, 18.54],
    badge: "10m Optical",
    description: "High-density urban transit junction, residential fabric, and Mutha River canal basin.",
    defaultPrompt: "What is the detailed land-cover breakdown (built-up, vegetation, water, bare) across Pune Swargate?",
    images: [
      {
        path: "data/aoi_fetch/20260908T121031-3235_s2.tif",
        modality: "optical",
        date: "2024-04-10",
        role: "Optical (T1 Recent)",
        preview: "/preview?path=data/aoi_fetch/20260908T121031-3235_s2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240410_PUNE_SWARGATE",
        collection: "sentinel-2-l2a",
        date: "2024-04-10",
        cloud: 1.2,
      },
    ],
  },
  {
    id: "pune-hinjawadi-bitemporal",
    name: "Pune Hinjawadi Tech SEZ (Bi-Temporal)",
    locationName: "Pune",
    state: "Maharashtra",
    coords: [73.728, 18.591],
    bbox: [73.68, 18.55, 73.77, 18.63],
    badge: "Before vs After",
    description: "Multi-year urban infrastructure transition and commercial IT tower construction.",
    defaultPrompt: "What changes in built-up area and vegetation occurred between the baseline and recent observation dates in Hinjawadi?",
    images: [
      {
        path: "data/aoi_fetch/20260908T090455-0636_s2.tif",
        modality: "optical",
        date: "2024-03-15",
        role: "Optical (T1 2024)",
        preview: "/preview?path=data/aoi_fetch/20260908T090455-0636_s2.tif",
      },
      {
        path: "data/aoi_fetch/20260908T090455-0636_s2t2.tif",
        modality: "optical",
        date: "2022-01-20",
        role: "Baseline (T0 2022)",
        preview: "/preview?path=data/aoi_fetch/20260908T090455-0636_s2t2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240315_PUNE_HINJAWADI",
        collection: "sentinel-2-l2a",
        date: "2024-03-15",
        cloud: 2.1,
      },
      {
        id: "S2B_MSIL2A_20220120_PUNE_HINJAWADI",
        collection: "sentinel-2-l2a",
        date: "2022-01-20",
        cloud: 0.8,
      },
    ],
  },
  {
    id: "ahmedabad-gift-city",
    name: "Ahmedabad Sabarmati & GIFT City",
    locationName: "Ahmedabad / Gandhinagar",
    state: "Gujarat",
    coords: [72.684, 23.161],
    bbox: [72.63, 23.11, 72.73, 23.21],
    badge: "Before vs After",
    description: "International financial district expansion, riverfront development, and urban density growth.",
    defaultPrompt: "Describe the land-cover change and commercial tower expansion along GIFT City corridor.",
    images: [
      {
        path: "data/aoi_fetch/20260908T091215-0636_s2.tif",
        modality: "optical",
        date: "2024-02-28",
        role: "Optical (T1 2024)",
        preview: "/preview?path=data/aoi_fetch/20260908T091215-0636_s2.tif",
      },
      {
        path: "data/aoi_fetch/20260908T091215-0636_s2t2.tif",
        modality: "optical",
        date: "2021-12-14",
        role: "Baseline (T0 2021)",
        preview: "/preview?path=data/aoi_fetch/20260908T091215-0636_s2t2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240228_AHMEDABAD_GIFT",
        collection: "sentinel-2-l2a",
        date: "2024-02-28",
        cloud: 1.4,
      },
      {
        id: "S2B_MSIL2A_20211214_AHMEDABAD_GIFT",
        collection: "sentinel-2-l2a",
        date: "2021-12-14",
        cloud: 0.6,
      },
    ],
  },
  {
    id: "mumbai-bkc",
    name: "Mumbai Bandra-Kurla Complex (BKC)",
    locationName: "Mumbai",
    state: "Maharashtra",
    coords: [72.868, 19.065],
    bbox: [72.83, 19.03, 72.90, 19.10],
    badge: "10m Optical",
    description: "Premier financial district, Mithi River basin, and high-rise commercial structures.",
    defaultPrompt: "Analyze the proportion of built-up infrastructure and Mithi river wetlands in BKC.",
    images: [
      {
        path: "data/aoi_fetch/20260908_mumbai_bkc_s2.tif",
        modality: "optical",
        date: "2024-03-22",
        role: "Optical (T1 Recent)",
        preview: "/preview?path=data/aoi_fetch/20260908_mumbai_bkc_s2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240322_MUMBAI_BKC",
        collection: "sentinel-2-l2a",
        date: "2024-03-22",
        cloud: 3.2,
      },
    ],
  },
  {
    id: "bengaluru-whitefield",
    name: "Bengaluru Whitefield IT Corridor",
    locationName: "Bengaluru",
    state: "Karnataka",
    coords: [77.75, 12.97],
    bbox: [77.71, 12.93, 77.79, 13.01],
    badge: "10m Optical",
    description: "Major software tech park zone, residential developments, and lake catchments.",
    defaultPrompt: "Detect urban growth, lake water bodies, and vegetation loss across Whitefield Bengaluru.",
    images: [
      {
        path: "data/aoi_fetch/20260908_bengaluru_whitefield_s2.tif",
        modality: "optical",
        date: "2024-03-05",
        role: "Optical (T1 Recent)",
        preview: "/preview?path=data/aoi_fetch/20260908_bengaluru_whitefield_s2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240305_BLR_WHITEFIELD",
        collection: "sentinel-2-l2a",
        date: "2024-03-05",
        cloud: 2.0,
      },
    ],
  },
  {
    id: "delhi-dwarka",
    name: "Delhi Dwarka Expressway & IGI Aerocity",
    locationName: "Delhi NCR",
    state: "Delhi",
    coords: [77.05, 28.56],
    bbox: [77.01, 28.52, 77.09, 28.60],
    badge: "10m Optical",
    description: "Mega transportation expressway corridor, airport logistics hubs, and urban expansion.",
    defaultPrompt: "Measure the built-up density and infrastructure expansion along the Dwarka Expressway.",
    images: [
      {
        path: "data/aoi_fetch/20260908_delhi_dwarka_s2.tif",
        modality: "optical",
        date: "2024-04-02",
        role: "Optical (T1 Recent)",
        preview: "/preview?path=data/aoi_fetch/20260908_delhi_dwarka_s2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240402_DELHI_DWARKA",
        collection: "sentinel-2-l2a",
        date: "2024-04-02",
        cloud: 1.8,
      },
    ],
  },
  {
    id: "hyderabad-hitec",
    name: "Hyderabad HITEC City & Gachibowli",
    locationName: "Hyderabad",
    state: "Telangana",
    coords: [78.38, 17.44],
    bbox: [78.34, 17.40, 78.42, 17.48],
    badge: "10m Optical",
    description: "Financial district, high-rise tech towers, and rocky granitic terrain.",
    defaultPrompt: "Analyze the proportion of built-up area and granite rocky outcrops in HITEC City.",
    images: [
      {
        path: "data/aoi_fetch/20260908_hyderabad_hitec_s2.tif",
        modality: "optical",
        date: "2024-03-18",
        role: "Optical (T1 Recent)",
        preview: "/preview?path=data/aoi_fetch/20260908_hyderabad_hitec_s2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240318_HYD_HITEC",
        collection: "sentinel-2-l2a",
        date: "2024-03-18",
        cloud: 1.5,
      },
    ],
  },
  {
    id: "chennai-omr",
    name: "Chennai OMR IT Expressway",
    locationName: "Chennai",
    state: "Tamil Nadu",
    coords: [80.23, 12.93],
    bbox: [80.19, 12.89, 80.27, 12.97],
    badge: "10m Optical",
    description: "Coastal IT corridor, Pallikaranai marshlands buffer, and suburban growth.",
    defaultPrompt: "Identify water bodies, marshland buffers, and built-up corridors along OMR Chennai.",
    images: [
      {
        path: "data/aoi_fetch/20260908_chennai_omr_s2.tif",
        modality: "optical",
        date: "2024-02-19",
        role: "Optical (T1 Recent)",
        preview: "/preview?path=data/aoi_fetch/20260908_chennai_omr_s2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240219_CHN_OMR",
        collection: "sentinel-2-l2a",
        date: "2024-02-19",
        cloud: 2.8,
      },
    ],
  },
  {
    id: "kolkata-newtown",
    name: "Kolkata New Town Action Area",
    locationName: "Kolkata",
    state: "West Bengal",
    coords: [88.46, 22.58],
    bbox: [88.42, 22.54, 88.50, 22.62],
    badge: "10m Optical",
    description: "Planned smart city, IT parks, and East Kolkata Ramsar wetland proximity.",
    defaultPrompt: "Measure the wetland water fraction and new built-up construction in Kolkata New Town.",
    images: [
      {
        path: "data/aoi_fetch/20260908_kolkata_newtown_s2.tif",
        modality: "optical",
        date: "2024-03-12",
        role: "Optical (T1 Recent)",
        preview: "/preview?path=data/aoi_fetch/20260908_kolkata_newtown_s2.tif",
      },
    ],
    scenes: [
      {
        id: "S2A_MSIL2A_20240312_KOL_NEWTOWN",
        collection: "sentinel-2-l2a",
        date: "2024-03-12",
        cloud: 2.2,
      },
    ],
  },
];

/**
 * Finds matching preset scenes for a searched city or query.
 */
export function findPresetScene(queryOrName: string): PresetScene | null {
  const q = queryOrName.toLowerCase().trim();
  if (!q) return null;

  for (const scene of PRESET_SATELLITE_SCENES) {
    if (
      scene.id.toLowerCase().includes(q) ||
      scene.name.toLowerCase().includes(q) ||
      scene.locationName.toLowerCase().includes(q) ||
      scene.state.toLowerCase().includes(q) ||
      q.includes(scene.locationName.toLowerCase())
    ) {
      return scene;
    }
  }
  return null;
}
