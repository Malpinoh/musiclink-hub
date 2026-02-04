import { memo, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { motion } from "framer-motion";
import { Map } from "lucide-react";

// TopoJSON world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country name to ISO mapping for common variations
const countryNameToISO: Record<string, string> = {
  "United States": "USA",
  "United Kingdom": "GBR",
  "South Korea": "KOR",
  "North Korea": "PRK",
  "Russia": "RUS",
  "China": "CHN",
  "Japan": "JPN",
  "Germany": "DEU",
  "France": "FRA",
  "Italy": "ITA",
  "Spain": "ESP",
  "Canada": "CAN",
  "Australia": "AUS",
  "Brazil": "BRA",
  "India": "IND",
  "Mexico": "MEX",
  "Nigeria": "NGA",
  "South Africa": "ZAF",
  "Egypt": "EGY",
  "Kenya": "KEN",
  "Ghana": "GHA",
  "Netherlands": "NLD",
  "Belgium": "BEL",
  "Sweden": "SWE",
  "Norway": "NOR",
  "Denmark": "DNK",
  "Finland": "FIN",
  "Poland": "POL",
  "Turkey": "TUR",
  "Saudi Arabia": "SAU",
  "United Arab Emirates": "ARE",
  "Indonesia": "IDN",
  "Philippines": "PHL",
  "Thailand": "THA",
  "Vietnam": "VNM",
  "Malaysia": "MYS",
  "Singapore": "SGP",
  "Argentina": "ARG",
  "Colombia": "COL",
  "Chile": "CHL",
  "Peru": "PER",
  "Venezuela": "VEN",
  "Ireland": "IRL",
  "Portugal": "PRT",
  "Austria": "AUT",
  "Switzerland": "CHE",
  "Greece": "GRC",
  "Czech Republic": "CZE",
  "Romania": "ROU",
  "Ukraine": "UKR",
  "New Zealand": "NZL",
  "Pakistan": "PAK",
  "Bangladesh": "BGD",
  "Morocco": "MAR",
  "Tanzania": "TZA",
  "Ethiopia": "ETH",
  "Uganda": "UGA",
};

interface GeoData {
  name: string;
  count: number;
}

interface FanLocationMapProps {
  countryData: GeoData[];
  title?: string;
}

const FanLocationMap = memo(({ countryData, title = "Fan Locations" }: FanLocationMapProps) => {
  // Create a map of country names to counts
  const countryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    countryData.forEach((country) => {
      map[country.name] = country.count;
      // Also map by ISO code if available
      const iso = countryNameToISO[country.name];
      if (iso) {
        map[iso] = country.count;
      }
    });
    return map;
  }, [countryData]);

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(...countryData.map((c) => c.count), 1);
  }, [countryData]);

  // Get color based on count
  const getCountryColor = (countryName: string, isoCode: string) => {
    const count = countryCountMap[countryName] || countryCountMap[isoCode] || 0;
    if (count === 0) return "hsl(var(--secondary))";
    
    // Scale from accent-light to primary based on count
    const intensity = Math.min(count / maxCount, 1);
    const lightness = 60 - (intensity * 35); // 60% to 25% lightness
    const saturation = 60 + (intensity * 20); // 60% to 80% saturation
    
    return `hsl(var(--primary) / ${0.3 + intensity * 0.7})`;
  };

  const hasData = countryData.length > 0;

  return (
    <motion.div
      className="glass-card p-4 sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h3 className="font-display text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
        <Map className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        {title}
      </h3>
      
      {hasData ? (
        <div className="relative">
          <div className="w-full aspect-[2/1] min-h-[200px] sm:min-h-[280px]">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 120,
                center: [0, 30],
              }}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomableGroup zoom={1} center={[0, 20]}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const countryName = geo.properties.name;
                      const isoCode = geo.id;
                      const count = countryCountMap[countryName] || countryCountMap[isoCode] || 0;
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getCountryColor(countryName, isoCode)}
                          stroke="hsl(var(--border))"
                          strokeWidth={0.5}
                          style={{
                            default: {
                              outline: "none",
                            },
                            hover: {
                              fill: count > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))",
                              outline: "none",
                              cursor: count > 0 ? "pointer" : "default",
                            },
                            pressed: {
                              outline: "none",
                            },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded bg-secondary" />
              <span className="text-muted-foreground">No fans</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-3 rounded" 
                style={{ backgroundColor: "hsl(var(--primary) / 0.4)" }}
              />
              <span className="text-muted-foreground">Few fans</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-3 rounded" 
                style={{ backgroundColor: "hsl(var(--primary))" }}
              />
              <span className="text-muted-foreground">Many fans</span>
            </div>
          </div>
          
          {/* Top countries summary */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {countryData.slice(0, 5).map((country, index) => (
                <span
                  key={country.name}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs sm:text-sm"
                >
                  <span className="font-semibold text-primary">#{index + 1}</span>
                  <span className="truncate max-w-[100px]">{country.name}</span>
                  <span className="text-muted-foreground">({country.count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[2/1] min-h-[200px] sm:min-h-[280px] flex items-center justify-center text-muted-foreground text-sm">
          <div className="text-center">
            <Map className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No geographic data yet</p>
            <p className="text-xs mt-1">Fan locations will appear here</p>
          </div>
        </div>
      )}
    </motion.div>
  );
});

FanLocationMap.displayName = "FanLocationMap";

export default FanLocationMap;
