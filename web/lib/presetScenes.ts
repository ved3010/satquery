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
