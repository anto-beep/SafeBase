import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "@phosphor-icons/react";

/**
 * AddressAutocomplete — Australian-biased Google Places address picker.
 *
 * Loads the Google Places JS API on first mount (idempotent across the app)
 * using REACT_APP_GOOGLE_PLACES_API_KEY. Falls back to a plain text input if
 * the key is missing or the API fails to load — the field still works.
 *
 * Value contract: a string (the formatted_address). For callers that need
 * lat/lng later, listen to onSelect (receives the full place payload).
 */

const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;
let _loaderPromise = null;

function loadGooglePlaces() {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (!GOOGLE_KEY) return Promise.reject(new Error("no-key"));
  if (_loaderPromise) return _loaderPromise;
  _loaderPromise = new Promise((resolve, reject) => {
    const cb = `__safebase_gmaps_${Math.random().toString(36).slice(2)}`;
    window[cb] = () => {
      resolve(window.google);
      try { delete window[cb]; } catch { /* */ }
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&callback=${cb}`;
    s.async = true;
    s.onerror = () => reject(new Error("script-load"));
    document.head.appendChild(s);
  });
  return _loaderPromise;
}


export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing address…",
  testId = "address-autocomplete",
  required,
  disabled,
}) {
  const inputRef = useRef(null);
  const acRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadGooglePlaces()
      .then((g) => {
        if (cancelled || !inputRef.current) return;
        try {
          const ac = new g.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: ["au"] },
            fields: ["formatted_address", "geometry", "address_components", "place_id"],
            types: ["address"],
          });
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            const formatted = place?.formatted_address || inputRef.current?.value || "";
            onChange?.(formatted);
            onSelect?.(place);
          });
          acRef.current = ac;
          setLoaded(true);
        } catch (e) {
          setError(e?.message || "ac-init");
        }
      })
      .catch((e) => setError(e?.message || "no-key"));
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative" data-testid={testId}>
      <MapPin
        size={14}
        weight="bold"
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <Input
        ref={inputRef}
        type="text"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="pl-7 h-10 rounded-none border-ink"
        data-testid={`${testId}-input`}
        autoComplete="off"
      />
      {!loaded && !error && GOOGLE_KEY && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-widest text-muted-foreground">
          loading…
        </div>
      )}
      {error && (
        <div
          className="text-[10px] text-amber-700 mt-1"
          data-testid={`${testId}-fallback`}
          title={`Autocomplete unavailable: ${error}`}
        >
          Manual entry (autocomplete unavailable)
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
