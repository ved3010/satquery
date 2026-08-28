"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchAnyLocation,
  INDEXED_INDIAN_LOCATIONS,
  type LocationBriefing,
} from "@/lib/geocoding";
import {
  Search,
  MapPin,
  X,
  ChevronRight,
  Sparkles,
  Navigation,
} from "lucide-react";

interface LocationSearchProps {
  onSelectLocation: (location: LocationBriefing) => void;
  selectedLocation: LocationBriefing | null;
  onSetQueryPrompt?: (query: string) => void;
}

export function LocationSearch({
  onSelectLocation,
  selectedLocation,
  onSetQueryPrompt,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationBriefing[]>(INDEXED_INDIAN_LOCATIONS.slice(0, 8));
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search across pan-India cities, states, and coordinates
  useEffect(() => {
    let active = true;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(INDEXED_INDIAN_LOCATIONS.slice(0, 8));
      setLoading(false);
      setHighlightedIndex(0);
      return;
    }

    // Instant local pre-filter (0ms latency for smooth typing)
    const qLow = trimmed.toLowerCase();
    const immediate = INDEXED_INDIAN_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(qLow) ||
        loc.state.toLowerCase().includes(qLow) ||
        loc.type.toLowerCase().includes(qLow) ||
        (loc.localHotspots && loc.localHotspots.some((h) => h.toLowerCase().includes(qLow)))
    );
    // Immediately set filtered matches (or empty if no local matches yet)
    setResults(immediate);

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchAnyLocation(trimmed);
        if (active) {
          setResults(res);
          setHighlightedIndex(0);
        }
      } catch (err) {
        console.warn("Geocoding lookup error:", err);
      } finally {
        if (active) setLoading(false);
