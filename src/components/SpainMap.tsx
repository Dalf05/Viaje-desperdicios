import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as d3 from 'd3';
import { geoConicConformalSpain } from 'd3-composite-projections';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SpainMapProps {
  selectedProvince: string | null;
  onSelect: (id: string) => void;
  votes: Record<string, number>;
  canVote?: boolean;
}

interface ProvinceData {
  id: string;
  name: string;
  path: string;
  centroid: [number, number];
}

// Mapping from GeoJSON names to our IDs
const NAME_TO_ID: Record<string, string> = {
  'A Coruña': 'coruna',
  'Lugo': 'lugo',
  'Ourense': 'ourense',
  'Pontevedra': 'pontevedra',
  'Asturias': 'asturias',
  'Cantabria': 'cantabria',
  'Álava': 'alava',
  'Bizkaia': 'bizkaia',
  'Gipuzkoa': 'gipuzkoa',
  'Navarra': 'navarra',
  'La Rioja': 'la-rioja',
  'Huesca': 'huesca',
  'Zaragoza': 'zaragoza',
  'Teruel': 'teruel',
  'Barcelona': 'barcelona',
  'Girona': 'girona',
  'Lleida': 'lleida',
  'Tarragona': 'tarragona',
  'Ávila': 'avila',
  'Burgos': 'burgos',
  'León': 'leon',
  'Palencia': 'palencia',
  'Salamanca': 'salamanca',
  'Segovia': 'segovia',
  'Soria': 'soria',
  'Valladolid': 'valladolid',
  'Zamora': 'zamora',
  'Madrid': 'madrid',
  'Albacete': 'albacete',
  'Ciudad Real': 'ciudad-real',
  'Cuenca': 'cuenca',
  'Guadalajara': 'guadalajara',
  'Toledo': 'toledo',
  'Alicante': 'alicante',
  'Castellón': 'castellon',
  'Valencia': 'valencia',
  'Murcia': 'murcia',
  'Badajoz': 'badajoz',
  'Cáceres': 'caceres',
  'Almería': 'almeria',
  'Cádiz': 'cadiz',
  'Córdoba': 'cordoba',
  'Granada': 'granada',
  'Huelva': 'huelva',
  'Jaén': 'jaen',
  'Málaga': 'malaga',
  'Sevilla': 'sevilla',
  'Baleares': 'baleares',
  'Las Palmas': 'las-palmas',
  'Santa Cruz de Tenerife': 'santa-cruz',
  'Ceuta': 'ceuta',
  'Melilla': 'melilla'
};

export const SpainMap: React.FC<SpainMapProps> = ({ selectedProvince, onSelect, votes, canVote = true }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetching a working GeoJSON for Spain provinces
    const url = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/spain-provinces.geojson';
    
    d3.json(url).then((data: any) => {
      const projection = geoConicConformalSpain()
        .scale(3500)
        .translate([375, 400]);
      
      const pathGenerator = d3.geoPath().projection(projection);
      
      // Data is already GeoJSON
      const features = data.features;
      
      const processedProvinces: ProvinceData[] = features.map((feature: any) => {
        const name = feature.properties.name;
        const id = NAME_TO_ID[name] || name.toLowerCase().replace(/\s+/g, '-');
        const path = pathGenerator(feature) || '';
        const centroid = pathGenerator.centroid(feature) as [number, number];
        
        return { id, name, path, centroid };
      });
      
      // Sort alphabetically for the list
      processedProvinces.sort((a, b) => a.name.localeCompare(b.name));
      
      setProvinces(processedProvinces);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading map data:', err);
      setLoading(false);
    });
  }, []);

  const hoveredName = useMemo(() => {
    if (!hovered) return null;
    return provinces.find(p => p.id === hovered)?.name;
  }, [hovered, provinces]);

  const selectedName = useMemo(() => {
    if (!selectedProvince) return null;
    return provinces.find(p => p.id === selectedProvince)?.name;
  }, [selectedProvince, provinces]);

  if (loading) {
    return (
      <div className="w-full aspect-[4/5] bg-[#f0f4f8] rounded-[40px] flex items-center justify-center border border-[#5A5A40]/10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin" />
          <p className="serif text-[#5A5A40] font-medium">Cargando mapa real...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative w-full aspect-[4/5] bg-[#f0f4f8] rounded-[40px] p-8 shadow-sm overflow-hidden border border-[#5A5A40]/10 transition-opacity",
      !canVote && "opacity-60 grayscale-[0.5]"
    )}>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className="serif text-2xl font-bold text-[#5A5A40]">¿A dónde vamos?</h3>
          {!canVote && (
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1 bg-red-50 px-2 py-0.5 rounded-full inline-block">
              Votación deshabilitada
            </p>
          )}
          <p className="text-xs text-[#5A5A40]/60 uppercase tracking-widest font-bold mt-1">
            {hoveredName || 'Selecciona una provincia'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {selectedProvince && (
            <button 
              onClick={() => onSelect('')}
              className="text-[9px] font-bold text-[#5A5A40]/60 hover:text-[#5A5A40] uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              <span>✕</span> Limpiar selección
            </button>
          )}
          {selectedProvince && (
            <div className="bg-[#5A5A40] text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Votado: {selectedName}
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full h-[calc(100%-10rem)] flex items-center justify-center">
        <svg 
          viewBox="0 0 750 820" 
          className="w-full h-full"
        >
          {/* Canary Islands Box (Automatically handled by geoConicConformalSpain, but we add the visual box) */}
          <g>
            <rect x="20" y="620" width="220" height="180" fill="white" fillOpacity="0.5" stroke="#5A5A40" strokeWidth="1" strokeDasharray="4 4" rx="15" />
            <text x="130" y="640" textAnchor="middle" className="text-[10px] fill-[#5A5A40]/40 font-bold uppercase tracking-widest">Canarias</text>
          </g>

          {provinces.map((province) => {
            const isSelected = selectedProvince === province.id;
            const isHovered = hovered === province.id;
            const voteCount = votes[province.id] || 0;
            
            return (
              <g 
                key={province.id} 
                className={cn(
                  "group",
                  canVote ? "cursor-pointer" : "cursor-not-allowed"
                )}
                onMouseEnter={() => canVote && setHovered(province.id)}
                onMouseLeave={() => canVote && setHovered(null)}
                onClick={() => canVote && onSelect(province.id)}
              >
                <motion.path
                  d={province.path}
                  initial={false}
                  animate={{
                    fill: isSelected ? '#5A5A40' : isHovered ? '#E4E3E0' : voteCount > 0 ? '#7A7A60' : '#ffffff',
                    stroke: isSelected ? '#fff' : '#5A5A40',
                    strokeWidth: isSelected ? 2 : 0.5,
                    scale: isSelected || isHovered ? 1.01 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="transition-colors duration-200"
                />
                {voteCount > 0 && (
                  <g className="pointer-events-none">
                    <circle 
                      cx={province.centroid[0]} 
                      cy={province.centroid[1]} 
                      r="10" 
                      fill={isSelected ? '#fff' : '#5A5A40'} 
                      className="shadow-sm" 
                    />
                    <text
                      x={province.centroid[0]}
                      y={province.centroid[1] + 3.5}
                      textAnchor="middle"
                      className={cn(
                        "text-[9px] font-bold select-none",
                        isSelected ? "fill-[#5A5A40]" : "fill-white"
                      )}
                    >
                      {voteCount}
                    </text>
                  </g>
                )}
                <title>{province.name} ({voteCount} votos)</title>
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="absolute bottom-6 left-8 right-8 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-[#5A5A40]/10 shadow-sm">
        {provinces.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
              selectedProvince === p.id 
                ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm" 
                : "bg-white/50 text-[#5A5A40] border-[#5A5A40]/10 hover:border-[#5A5A40]/30 hover:bg-[#f5f5f0]"
            )}
          >
            {p.name} {votes[p.id] > 0 && <span className="ml-1 opacity-60">({votes[p.id]})</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
