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
