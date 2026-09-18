/**
 * Real-Time Municipal & Urban Traffic CCTV Surveillance Feeds Registry
 * High-precision ground street camera streams synchronized with spaceborne satellite observation coordinates.
 * Designed for ISRO / Smart India Hackathon PS 26167: Multimodal Remote Sensing & Cross-Modal Intelligence.
 */

export type CctvCameraAngle = {
  id: string;
  name: string;
  videoUrl: string;
  posterUrl: string;
  description: string;
  tacticalSector: string;
  fieldOfView: string;
  focalLength: string;
  detectionCount: { vehicles: number; buses: number; pedestrians: number };
};

export type GroundCctvFeed = {
  id: string;
  locationName: string;
  district: string;
  landmark: string;
  coords: [number, number]; // [lon, lat]
  cameraId: string;
  junctionType: string;
  resolution: string;
  fps: number;
  angles: CctvCameraAngle[];
  description: string;
  surveillanceContext: string;
  securityTier: string;
  opticalCrossReference: string;
  spectralSignature: string;
  telemetrySource: string;
};

export const PUNE_CCTV_FEEDS: Record<string, GroundCctvFeed> = {
  "pune-swargate": {
    id: "pune-swargate",
    locationName: "Pune Swargate",
    district: "Pune Central, Maharashtra",
    landmark: "Swargate Multimodal Transit Hub & Flyover Interchange",
    coords: [73.8567, 18.5018],
    cameraId: "PUN-CCTV-041-SWG",
    junctionType: "Major Arterial Bus & Metro Transit Chowk",
    resolution: "1920x1080 FHD",
    fps: 25,
    description: "Primary multimodal transportation nexus of South-Central Pune, integrating underground Pune Metro Line 1, PMPML intercity bus concourse, and the bi-level Jedhe Chowk flyover. Observes high-volume passenger transitions between Southern Maharashtra corridors and central business zones.",
    surveillanceContext: "Critical urban transit choke point subject to multi-directional vehicular loads (approx. 14,000 PCU/hr peak), BRTS designated busways, and pedestrian transfer nodes toward Sarasbaug and Parvati Hills.",
    securityTier: "Tier-1 Critical Multimodal Infrastructure",
    opticalCrossReference: "Sentinel-2 MSI 10m GSD (Bands 4/3/2 True Color RGB · Band 8 NIR Canal Buffer)",
    spectralSignature: "Dense asphalt, structural concrete, and riparian Mutha canal banks (NDBI: +0.28, MNDWI: -0.14)",
    telemetrySource: "Pune Smart City Development Corp (PSCDCL) Optical Video Network",
    angles: [
      {
        id: "swg-cam-01",
        name: "CAM 01: Swargate Flyover & Shivaji Road",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-busy-intersection-at-night-42862-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&q=80",
        description: "Primary north-south transit corridor overlooking PMPML bus terminals, Jedhe Chowk elevated bridge, and Shivaji Road approach.",
        tacticalSector: "North-West Elevated Quadrant",
        fieldOfView: "92° Wide Optical Angle",
        focalLength: "4.8mm Varifocal HD",
        detectionCount: { vehicles: 42, buses: 8, pedestrians: 19 },
      },
      {
        id: "swg-cam-02",
        name: "CAM 02: PMPML Intercity Bus Concourse",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-daytime-traffic-on-a-busy-city-avenue-42858-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80",
        description: "Dedicated bus rapid transit lanes, heavy passenger boarding concourses, and southern Satara Road regional bus departure terminals.",
        tacticalSector: "South Concourse Bus Terminal",
        fieldOfView: "78° Focused Transit Corridor",
        focalLength: "6.0mm Telephoto Optical",
        detectionCount: { vehicles: 28, buses: 14, pedestrians: 34 },
      },
      {
        id: "swg-cam-03",
        name: "CAM 03: Sarasbaug & Canal Approach Circle",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cars-crossing-a-busy-avenue-in-the-city-42861-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80",
        description: "Peripheral perimeter monitoring near Mutha Right Bank Canal, pedestrian parkland entrances, and Sanas Ground vehicular loop.",
        tacticalSector: "South-West Riparian Buffer",
        fieldOfView: "105° Panoramic Perimeter",
        focalLength: "3.6mm Ultra-Wide Optical",
        detectionCount: { vehicles: 35, buses: 4, pedestrians: 12 },
      },
    ],
  },
  "pune-hinjawadi": {
    id: "pune-hinjawadi",
    locationName: "Pune Hinjawadi",
    district: "Rajiv Gandhi Infotech Park, Pune",
    landmark: "Hinjawadi Phase 1 Shivaji Chowk Tech Corridor",
    coords: [73.7280, 18.5912],
    cameraId: "PUN-CCTV-108-HJW",
    junctionType: "IT Corridor Arterial Circle",
    resolution: "1920x1080 FHD",
    fps: 30,
    description: "Flagship technological SEZ corridor spanning 2,800 acres across three development phases. Focal point for over 400,000 daily IT professionals, private corporate shuttle fleets, and Bangalore-Mumbai National Expressway access.",
    surveillanceContext: "Key arterial junction subject to extreme peak-hour tidal surges, multi-axle freight movement on Wakad link, and ongoing elevated Pune Metro Line 3 viaduct infrastructure.",
    securityTier: "Tier-1 High-Value Technology Corridor",
    opticalCrossReference: "Sentinel-2 MSI 10m GSD + Sentinel-1 C-Band SAR Dual Polarization (VV/VH)",
    spectralSignature: "High-albedo glass/metal corporate roofs, paved employee parking, and suburban perimeter (NDBI: +0.34, NDVI: +0.12)",
    telemetrySource: "MIDC / Hinjawadi Industries Association Integrated Command Grid",
    angles: [
      {
        id: "hjw-cam-01",
        name: "CAM 01: Shivaji Chowk Hinjawadi Phase 1",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-daytime-traffic-on-a-busy-city-avenue-42858-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
        description: "Main rotary intersection connecting Bangalore-Mumbai Highway feeder ramps through Wakad into Phase 1 corporate campuses.",
        tacticalSector: "East Highway Feeder Axis",
        fieldOfView: "88° Traffic Flow Vector",
        focalLength: "5.2mm Varifocal Optical",
        detectionCount: { vehicles: 64, buses: 12, pedestrians: 22 },
      },
      {
        id: "hjw-cam-02",
        name: "CAM 02: Wipro Circle & Phase 2 Link",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-busy-intersection-at-night-42862-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=800&q=80",
        description: "Commercial IT tower access road, employee shuttle staging bays, and Western bypass expressway queue monitoring.",
        tacticalSector: "Phase 2 Inter-Campus Spine",
        fieldOfView: "75° Mid-Range Surveillance",
        focalLength: "6.5mm Precision Lens",
        detectionCount: { vehicles: 48, buses: 16, pedestrians: 15 },
      },
    ],
  },
  "pune-fc-road": {
    id: "pune-fc-road",
    locationName: "Pune FC Road",
    district: "Shivajinagar / Deccan, Pune",
    landmark: "Fergusson College Road & Goodluck Chowk",
    coords: [73.8415, 18.5196],
    cameraId: "PUN-CCTV-029-FCR",
    junctionType: "High-Density Commercial High-Street",
    resolution: "1920x1080 FHD",
    fps: 25,
    description: "Historic commercial and educational boulevard lined with heritage colonial academic campuses, retail storefronts, and cafe concourses. Serves as a major north-south student and retail transit artery.",
    surveillanceContext: "Dense non-motorized and two-wheeler traffic patterns, high footfall commercial zones, and urban canopy shading along the Fergusson College hill slope.",
    securityTier: "Tier-2 Heritage & High-Street Retail District",
    opticalCrossReference: "Sentinel-2 MSI Multispectral (Bands 2/3/4 + Band 8 NDVI Vegetation Vigour)",
    spectralSignature: "Dense deciduous roadside tree canopy overlying continuous asphalt pavement (NDVI: +0.26, NDBI: +0.19)",
    telemetrySource: "Pune Traffic Police Traffic Automation Management Center (TMC)",
    angles: [
      {
        id: "fcr-cam-01",
        name: "CAM 01: Goodluck Cafe Chowk & FC Road",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cars-crossing-a-busy-avenue-in-the-city-42861-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&q=80",
        description: "Heritage cafe cross-junction, retail storefront concourse, and one-way two-wheeler transit flow towards Deccan Gymkhana.",
        tacticalSector: "Central Commercial Crossing",
        fieldOfView: "96° High-Street Wide",
        focalLength: "4.0mm High-Sensitivity Fixed",
        detectionCount: { vehicles: 55, buses: 3, pedestrians: 48 },
      },
    ],
  },
  "pune-shivajinagar": {
    id: "pune-shivajinagar",
    locationName: "Pune Shivajinagar",
    district: "Shivajinagar, Pune",
    landmark: "Sancheti Chowk & Metro Multi-Modal Interchange",
    coords: [73.8446, 18.5314],
    cameraId: "PUN-CCTV-015-SHV",
    junctionType: "Multi-Modal Rail & Metro Hub",
    resolution: "1920x1080 FHD",
    fps: 30,
    description: "Tri-modal metropolitan interchange converging Shivajinagar Railway Station, underground/elevated Metro hubs, and the Old Mumbai-Pune National Highway (NH-48) arterial feeder.",
    surveillanceContext: "Major hospital emergency corridor (Sancheti Orthopedic), University Road arterial approach, and COEP technological institute flyover convergence.",
    securityTier: "Tier-1 Intercity Transit Interchange",
    opticalCrossReference: "Sentinel-2 MSI Optical Bands + Sentinel-1 SAR Interferometric Coherence",
    spectralSignature: "Extensive steel rail yard corridors, elevated concrete decks, and asphalt flyovers (NDBI: +0.31, MNDWI: -0.08)",
    telemetrySource: "Pune Smart City Integrated Command and Control Center (ICCC)",
    angles: [
      {
        id: "shv-cam-01",
        name: "CAM 01: Sancheti Hospital Flyover Junction",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-daytime-traffic-on-a-busy-city-avenue-42858-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80",
        description: "Crucial intersection linking Old Mumbai-Pune Highway, University Road, and College of Engineering Pune (COEP) flyover.",
        tacticalSector: "North-East Flyover Feeder",
        fieldOfView: "84° Multi-Lane Flyover Focus",
        focalLength: "5.5mm Optical Lens",
        detectionCount: { vehicles: 58, buses: 9, pedestrians: 31 },
      },
    ],
  },
  "pune-koregaon": {
    id: "pune-koregaon",
    locationName: "Pune Koregaon Park",
    district: "Koregaon Park, Pune",
    landmark: "North Main Road & Burning Ghat Lane Junction",
    coords: [73.8940, 18.5362],
    cameraId: "PUN-CCTV-072-KGP",
    junctionType: "Urban Tree-Canopy Avenue",
    resolution: "1920x1080 FHD",
    fps: 25,
    description: "Prestigious urban residential and diplomatic sector situated along the southern banks of the Mula-Mutha River, characterized by dense heritage tree canopies and luxury residential properties.",
    surveillanceContext: "Environmental urban canopy protection zone, diplomatic presence corridors, and mixed commercial dining nightlife transit flows.",
    securityTier: "Tier-2 Ecological & Diplomatic Sector",
    opticalCrossReference: "Sentinel-2 NDVI Canopy Density Index (10m Resolution L2A)",
    spectralSignature: "Dense biomass canopy with shaded asphalt and low thermal reflectance (NDVI: +0.44, NDBI: -0.05)",
    telemetrySource: "Pune Cantonment / PMC Smart City Urban Surveillance Unit",
    angles: [
      {
        id: "kgp-cam-01",
        name: "CAM 01: North Main Road Canopy",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cars-crossing-a-busy-avenue-in-the-city-42861-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80",
        description: "Dense vegetative canopy avenue, boutique commercial retail frontage, and residential cross-street access.",
        tacticalSector: "East Riverfront Green Belt",
        fieldOfView: "90° Canopy Filtration",
        focalLength: "4.2mm HDR Day/Night",
        detectionCount: { vehicles: 24, buses: 2, pedestrians: 18 },
      },
    ],
  },
  "mumbai-bkc": {
