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
    { label: "Bengaluru Whitefield", query: "Whitefield" },
    { label: "Ahmedabad GIFT City", query: "GIFT City" },
    { label: "Delhi Dwarka", query: "Dwarka" },
    { label: "Hyderabad HITEC", query: "HITEC" },
    { label: "Chennai OMR", query: "Chennai" },
    { label: "Kolkata New Town", query: "Kolkata" },
  ];

  return (
    <div className="relative w-full space-y-2.5">
      {/* Search Input Bar */}
      <div ref={dropdownRef} className="relative w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleExecuteSearch(query);
          }}
          className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden bg-black/40 backdrop-blur-xl border border-white/20 focus-within:border-white/40 focus-within:shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all"
        >
          <div className="absolute left-4 pointer-events-none text-[var(--color-mute)]">
            <Search className={`w-4 h-4 ${loading ? "animate-spin text-[var(--color-brand)]" : ""}`} />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search any place across India or globally (e.g. Pune Swargate, Lonavala, Koramangala, Jaipur, Taj Mahal, 18.52, 73.85)..."
            className="w-full bg-transparent py-3.5 pl-11 pr-24 text-[14px] text-white placeholder-[var(--color-mute)]/70 outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              className="p-1 rounded-full text-[var(--color-mute)] hover:text-white transition mr-1.5"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Dedicated Instant Locate Action Button */}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 mr-2 rounded-xl bg-[var(--color-brand)] hover:bg-[#4b8ef5] text-white text-[12.5px] font-semibold flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(47,123,240,0.4)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Locate this place on the 3D globe and acquire satellite imagery"
          >
            <Navigation className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Locating..." : "Locate"}</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
          <span className="mono text-[10px] text-[var(--color-mute)] uppercase tracking-wider shrink-0 px-1">
            Quick Cities:
          </span>
          {quickHubs.map((hub) => {
            const isMatch = selectedLocation?.name.toLowerCase().includes(hub.query.toLowerCase());
            return (
              <button
