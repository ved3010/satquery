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
      }
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePick = (loc: LocationBriefing) => {
    onSelectLocation(loc);
    setIsOpen(false);
    setQuery(loc.name);
  };

  const handleExecuteSearch = async (targetQuery?: string) => {
    const q = (targetQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    try {
      const found = await searchAnyLocation(q);
      if (found && found.length > 0) {
        setResults(found);
        handlePick(found[0]);
      } else {
        setResults([]);
        setIsOpen(true);
      }
    } catch (err) {
      console.warn("Execute search notice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0 && highlightedIndex > 0 && highlightedIndex < results.length) {
        handlePick(results[highlightedIndex]);
      } else {
        void handleExecuteSearch(query);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Quick primary Indian hubs for one-click instant selection
  const quickHubs = [
    { label: "Pune Swargate", query: "Pune Swargate" },
    { label: "Mumbai BKC", query: "Mumbai" },
