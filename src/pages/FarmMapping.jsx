import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ── Leaflet marker icon fix (webpack/vite asset path issue) ─────────── */
function fixLeafletIcons() {
  if (!window.L) return;
  delete window.L.Icon.Default.prototype._getIconUrl;
  window.L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

/* ── colour tokens ──────────────────────────────────────────────────── */
const C = {
  bg:     'var(--color-bg-card,  #0e1117)',
  border: 'var(--color-border,   rgba(0,229,255,0.12))',
  accent: 'var(--color-accent-cyan,  #00e5ff)',
  green:  'var(--color-accent-green, #00ff88)',
  red:    '#ff3864',
  orange: 'var(--color-accent-orange,#ff9500)',
  text:   'var(--color-text,  #e2e8f0)',
  muted:  'var(--color-text-muted, #64748b)',
  mono:   'var(--font-mono, "JetBrains Mono", monospace)',
  deep:   'var(--color-bg-deep, #060810)',
};

const label = (txt) => ({
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: '5px',
  fontFamily: C.mono,
});

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${C.border}`,
  borderRadius: '7px',
  color: C.text,
  fontSize: '0.88rem',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const CROP_TYPES     = ['Wheat','Rice','Cotton','Sugarcane','Maize','Soybean','Groundnut','Onion','Tomato','Other'];
const IRRIGATION     = ['Drip','Sprinkler','Flood','Furrow','Rainfed','Other'];
const SOIL_TYPES     = ['Black (Vertisol)','Red (Alfisol)','Alluvial','Laterite','Sandy','Loamy','Clay','Other'];

const EMPTY_FORM = {
  farmName:      '',
  cropType:      '',
  sowingDate:    '',
  irrigationType:'',
  soilType:      '',
};

/* ── centroid of a GeoJSON Polygon ──────────────────────────────────── */
function geojsonCentroid(gj) {
  const coords = gj?.geometry?.coordinates?.[0] || [];
  if (!coords.length) return null;
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return { lat, lng };
}

/* ── fetch Open-Meteo + Nominatim for a field centroid ─────────────── */
async function fetchFarmAnalysis(lat, lng) {
  const [wxRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,surface_pressure` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,uv_index_max,soil_moisture_0_to_10cm_mean` +
      `&hourly=soil_temperature_0cm,soil_moisture_0_to_1cm,vapour_pressure_deficit` +
      `&timezone=auto&forecast_days=7`
    ),
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`),
  ]);
  const wx  = await wxRes.json();
  const geo = await geoRes.json();
  return { wx, geo, lat, lng };
}

/* ── derive all health metrics from raw API data ───────────────────── */
function deriveMetrics(raw, cropType) {
  const cur    = raw.wx?.current   || {};
  const daily  = raw.wx?.daily     || {};
  const hourly = raw.wx?.hourly    || {};

  const temp     = cur.temperature_2m     ?? 25;
  const humidity = cur.relative_humidity_2m ?? 50;
  const precip   = cur.precipitation      ?? 0;
  const soilT    = hourly.soil_temperature_0cm?.[0]   ?? temp - 2;
  const soilM    = hourly.soil_moisture_0_to_1cm?.[0] ?? 0.25;
  const vpd      = hourly.vapour_pressure_deficit?.[0] ?? 1.0;
  const uvMax    = daily.uv_index_max?.[0] ?? 5;

  // ── health score (0-100) ──────────────────────────────────────────
  let health = 100;

  // temp penalty — ideal 18-30°C
  if (temp < 10)       health -= 30;
  else if (temp < 18)  health -= (18 - temp) * 2;
  else if (temp > 38)  health -= (temp - 38) * 4;
  else if (temp > 32)  health -= (temp - 32) * 2;

  // humidity penalty — ideal 50-80%
  if (humidity < 30)       health -= 15;
  else if (humidity < 50)  health -= (50 - humidity) * 0.5;
  else if (humidity > 90)  health -= 10;

  // VPD penalty > 2 kPa = stress
  if (vpd > 3.5)  health -= 20;
  else if (vpd > 2) health -= (vpd - 2) * 8;

  // UV penalty
  if (uvMax > 9) health -= 10;
  else if (uvMax > 7) health -= 5;

  // soil moisture bonus
  if (soilM > 0.3)     health += 5;
  else if (soilM < 0.1) health -= 15;

  health = Math.max(0, Math.min(100, Math.round(health)));
  const stressPct = 100 - health;

  // ── stress level ─────────────────────────────────────────────────
  const stressLevel = health >= 75 ? 'HEALTHY' : health >= 50 ? 'MODERATE' : health >= 30 ? 'HIGH' : 'CRITICAL';
  const stressColor = health >= 75 ? '#00ff88' : health >= 50 ? '#ffd60a' : health >= 30 ? '#ff6b2b' : '#ff3864';

  // ── irrigation recommendation ─────────────────────────────────────
  const et0 = daily.et0_fao_evapotranspiration?.[0] ?? 4;
  const precipWeek = (daily.precipitation_sum || []).reduce((a, b) => a + (b || 0), 0);
  const deficit = Math.max(0, et0 * 7 - precipWeek);
  let irrigRec, irrigUrgency;
  if (soilM < 0.1 || deficit > 30) {
    irrigRec     = `Apply ${Math.round(deficit + 15)} mm within 24h. Soil critically dry.`;
    irrigUrgency = 'URGENT';
  } else if (soilM < 0.2 || deficit > 15) {
    irrigRec     = `Schedule ${Math.round(deficit + 8)} mm irrigation within 3 days.`;
    irrigUrgency = 'SOON';
  } else {
    irrigRec     = `Sufficient moisture. Next irrigation in ~${Math.round(7 - precipWeek/3)} days.`;
    irrigUrgency = 'OK';
  }

  // ── nutrient suggestion ───────────────────────────────────────────
  // Simulate N/P/K deficiency from soil temp, moisture, VPD
  const nScore  = Math.round(Math.max(0, Math.min(100, 100 - (soilT > 30 ? 20 : 0) - (soilM < 0.15 ? 30 : 0) - (vpd > 2 ? 15 : 0) - (temp > 35 ? 10 : 0))));
  const pScore  = Math.round(Math.max(0, Math.min(100, 100 - (soilT < 10 ? 25 : 0) - (humidity < 40 ? 20 : 0) - (precip > 10 ? 10 : 0))));
  const kScore  = Math.round(Math.max(0, Math.min(100, 100 - (vpd > 2.5 ? 25 : 0) - (humidity > 85 ? 15 : 0) - (soilM > 0.4 ? 10 : 0))));

  const nutrientAlerts = [];
  if (nScore < 60) nutrientAlerts.push(`Apply 30–60 kg/ha urea (N deficit: ${100 - nScore}%)`);
  if (pScore < 60) nutrientAlerts.push(`Apply DAP/SSP (P deficit: ${100 - pScore}%)`);
  if (kScore < 60) nutrientAlerts.push(`Apply MOP/SOP (K deficit: ${100 - kScore}%)`);
  if (!nutrientAlerts.length) nutrientAlerts.push('Nutrient levels appear adequate for current conditions.');

  // ── temperature alert ─────────────────────────────────────────────
  const tMax  = daily.temperature_2m_max?.[0] ?? temp;
  const tMin  = daily.temperature_2m_min?.[0] ?? temp - 8;
  let tempAlert, tempAlertLevel;
  if (tMax > 42)       { tempAlert = `🔥 Severe heat (${tMax}°C) — risk of crop wilting & protein denaturation.`; tempAlertLevel = 'CRITICAL'; }
  else if (tMax > 36)  { tempAlert = `⚠️ Heat stress (${tMax}°C) — apply foliar cooling; avoid midday irrigation.`; tempAlertLevel = 'HIGH'; }
  else if (tMin < 4)   { tempAlert = `❄️ Near-frost risk (${tMin}°C night) — protect vulnerable seedlings.`; tempAlertLevel = 'HIGH'; }
  else if (tMin < 10)  { tempAlert = `🌡️ Cool nights (${tMin}°C) — may slow growth in tropical crops.`; tempAlertLevel = 'MODERATE'; }
  else                 { tempAlert = `✅ Temperature range ${tMin}°C – ${tMax}°C is within optimal crop bounds.`; tempAlertLevel = 'OK'; }

  // ── 7-day health trend ────────────────────────────────────────────
  const trend = (daily.temperature_2m_max || Array(7).fill(temp)).map((tmax, i) => {
    const sm   = daily.soil_moisture_0_to_10cm_mean?.[i] ?? soilM;
    const pr   = daily.precipitation_sum?.[i] ?? 0;
    const uv   = daily.uv_index_max?.[i] ?? uvMax;
    let h = 100;
    if (tmax > 38) h -= (tmax - 38) * 4;
    if (tmax < 18) h -= (18 - tmax) * 2;
    if (sm  < 0.1) h -= 15;
    if (uv  > 9)   h -= 10;
    if (pr  > 20)  h -= 5;
    return { day: i, h: Math.max(0, Math.min(100, Math.round(h))), tmax: tmax?.toFixed(1) ?? '—', pr: pr?.toFixed(1) ?? '0' };
  });

  // ── soil health ──────────────────────────────────────────────────
  const soilMoisturePct = parseFloat((soilM * 100).toFixed(1));
  // Moisture score: ideal 20–40%, drops off outside
  let mScore = 100;
  if      (soilMoisturePct < 5)   mScore = 10;
  else if (soilMoisturePct < 15)  mScore = 40;
  else if (soilMoisturePct < 20)  mScore = 70;
  else if (soilMoisturePct > 60)  mScore = 50;
  else if (soilMoisturePct > 45)  mScore = 75;
  // Soil temp score: ideal 15–28°C
  let stScore = 100;
  if      (soilT < 5)   stScore = 20;
  else if (soilT < 10)  stScore = 55;
  else if (soilT < 15)  stScore = 80;
  else if (soilT > 35)  stScore = 40;
  else if (soilT > 28)  stScore = 75;
  // Aeration: waterlogged or bone-dry both hurt structure
  const aerationScore = soilMoisturePct > 50 ? Math.max(20, 100 - (soilMoisturePct - 50) * 3) : soilMoisturePct < 10 ? 40 : 90;
  // Organic matter proxy: warm moist soil = active OM breakdown
  const organicScore  = Math.round(Math.max(20, Math.min(100, 50 + (soilMoisturePct > 20 && soilMoisturePct < 45 ? 25 : 0) + (soilT > 12 && soilT < 30 ? 20 : 0) + (humidity > 55 ? 5 : -10))));
  // Microbial activity: needs warmth + moisture, hurt by extremes
  const microbialScore= Math.round(Math.max(10, Math.min(100, 100 - (soilT < 10 ? 40 : soilT > 35 ? 30 : 0) - (soilMoisturePct < 15 ? 35 : soilMoisturePct > 55 ? 20 : 0) - (vpd > 3 ? 15 : 0))));
  // Structure: balance of moisture + temperature
  const structureScore= Math.round(Math.max(20, Math.min(100, (mScore * 0.4 + aerationScore * 0.3 + stScore * 0.3))));
  const soilHealth    = Math.round((mScore + stScore + aerationScore + organicScore + microbialScore + structureScore) / 6);
  const soilStatus    = soilHealth >= 80 ? 'EXCELLENT' : soilHealth >= 60 ? 'GOOD' : soilHealth >= 40 ? 'FAIR' : 'POOR';
  const soilStatusColor = soilHealth >= 80 ? '#00ff88' : soilHealth >= 60 ? '#39ff14' : soilHealth >= 40 ? '#ffd60a' : '#ff3864';
  const soilIssues    = [];
  if (mScore      < 60) soilIssues.push(soilMoisturePct < 20 ? '💧 Low soil moisture — risk of drought stress' : '🌊 Excess moisture — risk of root rot & anaerobic conditions');
  if (stScore     < 60) soilIssues.push(soilT < 12 ? '❄️ Cold soil — slows nutrient uptake & microbial activity' : '🔥 Overly warm soil — accelerated evaporation & OM loss');
  if (aerationScore < 60) soilIssues.push('🪨 Poor aeration — consider drainage or tillage improvements');
  if (microbialScore < 60) soilIssues.push('🦠 Low microbial activity — apply organic amendments or compost');
  if (organicScore < 60) soilIssues.push('🌿 Low organic matter — add crop residues or green manure');
  if (!soilIssues.length) soilIssues.push('✅ Soil conditions are healthy and well-balanced');

  return { health, stressPct, stressLevel, stressColor, temp, humidity, precip, soilT, soilM: soilMoisturePct.toFixed(1), vpd: vpd?.toFixed(2), uvMax, tMax, tMin, irrigRec, irrigUrgency, nScore, pScore, kScore, nutrientAlerts, tempAlert, tempAlertLevel, trend, et0: et0?.toFixed(1), deficit: deficit.toFixed(1), soilHealth, soilStatus, soilStatusColor, soilIssues, mScore, stScore, aerationScore, organicScore, microbialScore, structureScore };
}

/* ── tiny SVG bar chart for health trend ────────────────────────────── */
function HealthTrendChart({ trend }) {
  if (!trend?.length) return null;
  const W = 560, H = 120, PAD = 32, BAR_W = 28;
  const days = ['Today', 'D+1', 'D+2', 'D+3', 'D+4', 'D+5', 'D+6'];
  return (
    <svg viewBox={`0 0 ${W} ${H + 50}`} width="100%" style={{ display: 'block' }}>
      {/* grid lines */}
      {[25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={PAD} x2={W - PAD} y1={H - v * (H - 10) / 100} y2={H - v * (H - 10) / 100}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
          <text x={PAD - 4} y={H - v * (H - 10) / 100 + 4} textAnchor="end"
            fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">{v}</text>
        </g>
      ))}
      {/* bars */}
      {trend.map((d, i) => {
        const x   = PAD + i * ((W - PAD * 2) / 7) + 6;
        const barH = Math.max(4, d.h * (H - 10) / 100);
        const y   = H - barH;
        const col = d.h >= 75 ? '#00ff88' : d.h >= 50 ? '#ffd60a' : d.h >= 30 ? '#ff6b2b' : '#ff3864';
        return (
          <g key={i}>
            {/* shadow */}
            <rect x={x + 1} y={y + 2} width={BAR_W} height={barH} rx="4" fill={col} opacity="0.12" />
            {/* bar */}
            <rect x={x} y={y} width={BAR_W} height={barH} rx="4"
              fill={`url(#grad${i})`} />
            <defs>
              <linearGradient id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity="0.9" />
                <stop offset="100%" stopColor={col} stopOpacity="0.35" />
              </linearGradient>
            </defs>
            {/* value label */}
            <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle" fill={col}
              fontSize="10" fontWeight="700" fontFamily="monospace">{d.h}%</text>
            {/* day label */}
            <text x={x + BAR_W / 2} y={H + 16} textAnchor="middle"
              fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace">{days[i]}</text>
            {/* tmax */}
            <text x={x + BAR_W / 2} y={H + 28} textAnchor="middle"
              fill="rgba(255,107,43,0.7)" fontSize="8" fontFamily="monospace">{d.tmax}°</text>
          </g>
        );
      })}
      {/* axis line */}
      <line x1={PAD} x2={W - PAD} y1={H} y2={H} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    </svg>
  );
}

/* ── circular health gauge ───────────────────────────────────────────── */
function HealthGauge({ health, color }) {
  const r    = 54;
  const circ = 2 * Math.PI * r;
  const dash = (health / 100) * circ;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform="rotate(-90 65 65)"
        style={{ filter: `drop-shadow(0 0 8px ${color}99)`, transition: 'stroke-dasharray 1.2s ease' }} />
      <text x="65" y="60" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="900"
        fontFamily="var(--font-primary)">{health}%</text>
      <text x="65" y="76" textAnchor="middle" fill={color} fontSize="8" fontWeight="700"
        fontFamily="monospace" letterSpacing="1">HEALTH</text>
    </svg>
  );
}

/* ── nutrient bar ────────────────────────────────────────────────────── */
function NutrientBar({ label: lbl, score, color }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: C.mono, fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>{lbl}</span>
        <span style={{ fontFamily: C.mono, fontSize: '0.72rem', fontWeight: 700, color }}>{score}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '100px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${score}%`, borderRadius: '100px',
          background: `linear-gradient(90deg, ${color}66, ${color})`,
          transition: 'width 1s ease',
          boxShadow: `0 0 8px ${color}55`,
        }} />
      </div>
    </div>
  );
}

export default function FarmMapping() {
  const mapRef      = useRef(null);   // DOM node
  const leafletRef  = useRef(null);   // L.Map instance
  const drawnRef    = useRef(null);   // L.FeatureGroup
  const polygonRef  = useRef(null);   // current polygon layer

  const [geojson,   setGeojson]   = useState(null);
  const [areaHa,    setAreaHa]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [status,    setStatus]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [metrics,   setMetrics]   = useState(null);   // derived health metrics
  const [analyzing, setAnalyzing] = useState(false);
  const [stressOverlay, setStressOverlay] = useState(true);

  /* ── run field analysis for a geojson polygon ──────────────────── */
  const runAnalysis = useCallback(async (gj) => {
    const c = geojsonCentroid(gj);
    if (!c) return;
    setAnalyzing(true);
    setMetrics(null);
    try {
      const raw  = await fetchFarmAnalysis(c.lat, c.lng);
      const form_crop = (document.querySelector('[name=cropType]')?.value) || '';
      const m    = deriveMetrics(raw, form_crop);
      setMetrics(m);
      /* update polygon fill to reflect stress */
      if (polygonRef.current) {
        polygonRef.current.setStyle({
          color:       m.stressColor,
          fillColor:   m.stressColor,
          fillOpacity: 0.22,
          weight:      2,
        });
      }
    } catch (_) {
      setMetrics(null);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  /* ── init map once ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!window.L || leafletRef.current) return;

    fixLeafletIcons();
    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],   // centre of India
      zoom:   5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    /* drawn items container */
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current = drawnItems;

    /* draw control – polygon only */
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon:   { shapeOptions: { color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 0.15, weight: 2 } },
        polyline:  false,
        rectangle: false,
        circle:    false,
        marker:    false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    /* created */
    map.on(L.Draw.Event.CREATED, (e) => {
      /* remove any previous polygon */
      drawnItems.clearLayers();
      polygonRef.current = null;

      const layer = e.layer;
      drawnItems.addLayer(layer);
      polygonRef.current = layer;

      const gj = layer.toGeoJSON();
      setGeojson(gj);

      const areaSqM = window.turf ? window.turf.area(gj) : 0;
      setAreaHa(areaSqM / 10000);
      runAnalysis(gj);
    });

    /* edited */
    map.on(L.Draw.Event.EDITED, (e) => {
      e.layers.eachLayer((layer) => {
        const gj = layer.toGeoJSON();
        setGeojson(gj);
        const areaSqM = window.turf ? window.turf.area(gj) : 0;
        setAreaHa(areaSqM / 10000);
        polygonRef.current = layer;
        runAnalysis(gj);
      });
    });

    /* deleted */
    map.on(L.Draw.Event.DELETED, () => {
      setGeojson(null);
      setAreaHa(null);
      setMetrics(null);
      polygonRef.current = null;
    });

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, [runAnalysis]);

  /* ── form helpers ──────────────────────────────────────────────────── */
  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!geojson) {
      setStatus({ type: 'error', msg: 'Please draw your farm boundary on the map first.' });
      return;
    }
    if (!form.farmName.trim()) {
      setStatus({ type: 'error', msg: 'Farm name is required.' });
      return;
    }

    setSaving(true);
    setStatus(null);

    const payload = {
      ...form,
      geometry: geojson,
      area_ha:  areaHa ? parseFloat(areaHa.toFixed(4)) : null,
    };

    try {
      const res = await fetch('/api/farms/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Server responded ${res.status}: ${err}`);
      }

      const data = await res.json();
      setStatus({ type: 'success', msg: `Farm "${form.farmName}" saved successfully!${data.id ? ` (ID: ${data.id})` : ''}` });
      setForm(EMPTY_FORM);
      setGeojson(null);
      setAreaHa(null);
      drawnRef.current?.clearLayers();
      polygonRef.current = null;

    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  }

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.6rem' }}>🗺️</span>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: C.text }}>
            Farm Mapping
          </h1>
          <span style={{
            marginLeft: 'auto', fontFamily: C.mono, fontSize: '0.68rem',
            color: C.green, border: `1px solid ${C.green}`, borderRadius: '20px',
            padding: '2px 10px', letterSpacing: '0.08em',
          }}>
            OSM · Leaflet · Turf
          </span>
        </div>
        <p style={{ margin: 0, color: C.muted, fontSize: '0.88rem' }}>
          Draw your farm boundary, fill in the details, then save to the platform.
        </p>
      </div>

      {/* instructions bar */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px',
      }}>
        {[
          { icon: '🔍', text: 'Search or zoom to your farm location' },
          { icon: '✏️', text: 'Click the polygon tool (top-right of map)' },
          { icon: '📐', text: 'Click to draw vertices, double-click to finish' },
          { icon: '💾', text: 'Fill the form below and click Save Farm' },
        ].map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: '8px', padding: '6px 12px',
            fontSize: '0.78rem', color: C.muted,
          }}>
            <span>{s.icon}</span><span>{s.text}</span>
          </div>
        ))}
      </div>

      {/* map */}
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: '12px',
        overflow: 'hidden', marginBottom: '16px',
        boxShadow: '0 0 24px rgba(0,229,255,0.06)',
      }}>
        <div ref={mapRef} style={{ height: '480px', width: '100%', background: '#111' }} />
      </div>

      {/* area badge */}
      {areaHa !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: C.bg, border: `1px solid ${C.green}`,
          borderRadius: '10px', padding: '12px 20px', marginBottom: '20px',
        }}>
          <span style={{ fontSize: '1.4rem' }}>📐</span>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: '1.4rem', fontWeight: 800, color: C.green }}>
              {areaHa.toFixed(4)} ha
            </div>
            <div style={{ fontSize: '0.75rem', color: C.muted }}>
              Calculated field area &nbsp;·&nbsp; {(areaHa * 2.471).toFixed(3)} acres &nbsp;·&nbsp; {(areaHa * 10000).toFixed(0)} m²
            </div>
          </div>
          {geojson && (
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a'); a.href = url;
                a.download = 'farm_boundary.geojson'; a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                marginLeft: 'auto', padding: '7px 16px', borderRadius: '7px',
                border: `1px solid ${C.accent}`, background: 'rgba(0,229,255,0.08)',
                color: C.accent, fontFamily: C.mono, fontSize: '0.75rem',
                cursor: 'pointer', fontWeight: 700,
              }}
            >
              ⬇ GeoJSON
            </button>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
           FIELD ANALYSIS PANELS (appear after polygon is drawn)
      ══════════════════════════════════════════════════════════ */}
      {(analyzing || metrics) && (
        <div style={{ marginBottom: '20px' }}>

          {/* loading banner */}
          {analyzing && (
            <div style={{
              padding: '14px 20px', borderRadius: '12px', marginBottom: '14px',
              background: 'rgba(0,229,255,0.06)', border: `1px solid ${C.accent}33`,
              fontFamily: C.mono, fontSize: '0.8rem', color: C.accent,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '1.1rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              Analysing field location — fetching live weather, soil &amp; health data…
            </div>
          )}

          {metrics && (
            <>
              {/* ── Row 1: Health Gauge + Stress Map Overlay ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

                {/* 🟢 Overall Health % */}
                <div style={{
                  background: C.bg, border: `1.5px solid ${metrics.stressColor}44`,
                  borderRadius: '14px', padding: '20px 22px',
                  display: 'flex', alignItems: 'center', gap: '20px',
                }}>
                  <HealthGauge health={metrics.health} color={metrics.stressColor} />
                  <div>
                    <div style={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>🟢 Overall Field Health</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: metrics.stressColor, fontFamily: 'var(--font-primary)', lineHeight: 1 }}>
                      {metrics.health}%
                    </div>
                    <div style={{
                      marginTop: '8px', display: 'inline-block',
                      padding: '3px 12px', borderRadius: '20px', fontSize: '0.72rem',
                      fontFamily: C.mono, fontWeight: 700,
                      background: `${metrics.stressColor}15`,
                      border: `1px solid ${metrics.stressColor}44`,
                      color: metrics.stressColor,
                    }}>
                      {metrics.stressLevel}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '0.72rem', color: C.muted, fontFamily: C.mono, lineHeight: 1.6 }}>
                      Stress: <span style={{ color: metrics.stressColor }}>{metrics.stressPct}%</span><br />
                      Temp: <span style={{ color: '#ff6b2b' }}>{metrics.temp}°C</span><br />
                      Humidity: <span style={{ color: C.accent }}>{metrics.humidity}%</span><br />
                      Soil Moist: <span style={{ color: C.green }}>{metrics.soilM}%</span>
                    </div>
                  </div>
                </div>

                {/* 🔴 Stress Map Overlay */}
                <div style={{
                  background: C.bg, border: `1.5px solid ${metrics.stressColor}44`,
                  borderRadius: '14px', padding: '20px 22px',
                }}>
                  <div style={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>🔴 Stress Map Overlay</div>
                  {/* Stress zone visual */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    {['HEALTHY', 'MODERATE', 'HIGH', 'CRITICAL'].map(lvl => {
                      const col = lvl === 'HEALTHY' ? '#00ff88' : lvl === 'MODERATE' ? '#ffd60a' : lvl === 'HIGH' ? '#ff6b2b' : '#ff3864';
                      const active = metrics.stressLevel === lvl;
                      return (
                        <div key={lvl} style={{
                          flex: 1, padding: '10px 4px', borderRadius: '8px', textAlign: 'center',
                          background: active ? `${col}18` : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${active ? col : 'rgba(255,255,255,0.07)'}`,
                          transform: active ? 'scale(1.04)' : 'scale(1)',
                          transition: 'all 0.3s',
                        }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: col, margin: '0 auto 5px', boxShadow: active ? `0 0 8px ${col}` : 'none' }} />
                          <div style={{ fontFamily: C.mono, fontSize: '0.58rem', color: active ? col : C.muted, fontWeight: active ? 700 : 400 }}>{lvl}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontFamily: C.mono, fontSize: '0.72rem', color: C.muted, lineHeight: 1.7 }}>
                    <div>VPD: <span style={{ color: parseFloat(metrics.vpd) > 2 ? '#ff6b2b' : C.green }}>{metrics.vpd} kPa</span></div>
                    <div>UV Index: <span style={{ color: metrics.uvMax > 7 ? '#ff3864' : C.green }}>{metrics.uvMax}</span></div>
                    <div>Soil Temp: <span style={{ color: '#ffd60a' }}>{metrics.soilT}°C</span></div>
                    <div>Precipitation: <span style={{ color: C.accent }}>{metrics.precip} mm</span></div>
                  </div>
                  <div style={{
                    marginTop: '10px', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                    fontFamily: C.mono, background: `${metrics.stressColor}10`,
                    border: `1px solid ${metrics.stressColor}33`, color: metrics.stressColor,
                  }}>
                    Polygon overlay updated to <strong>{metrics.stressLevel}</strong> colour on map
                  </div>
                </div>
              </div>

              {/* ── Row 2: Irrigation + Nutrients ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

                {/* 💧 Irrigation Recommendation */}
                <div style={{
                  background: C.bg, border: `1.5px solid rgba(0,229,255,0.2)`,
                  borderLeft: `3px solid ${metrics.irrigUrgency === 'URGENT' ? '#ff3864' : metrics.irrigUrgency === 'SOON' ? '#ffd60a' : C.green}`,
                  borderRadius: '14px', padding: '18px 20px',
                }}>
                  <div style={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>💧 Irrigation Recommendation</div>
                  <div style={{
                    display: 'inline-block', padding: '3px 12px', borderRadius: '20px', fontSize: '0.7rem',
                    fontFamily: C.mono, fontWeight: 700, marginBottom: '10px',
                    background: metrics.irrigUrgency === 'URGENT' ? 'rgba(255,56,100,0.12)' : metrics.irrigUrgency === 'SOON' ? 'rgba(255,214,10,0.12)' : 'rgba(0,255,136,0.12)',
                    border: `1px solid ${metrics.irrigUrgency === 'URGENT' ? 'rgba(255,56,100,0.4)' : metrics.irrigUrgency === 'SOON' ? 'rgba(255,214,10,0.4)' : 'rgba(0,255,136,0.4)'}`,
                    color: metrics.irrigUrgency === 'URGENT' ? '#ff3864' : metrics.irrigUrgency === 'SOON' ? '#ffd60a' : C.green,
                  }}>
                    {metrics.irrigUrgency === 'URGENT' ? '🚨 URGENT' : metrics.irrigUrgency === 'SOON' ? '⚠️ SOON' : '✅ OK'}
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{metrics.irrigRec}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'ET₀ today', val: `${metrics.et0} mm`, color: '#ff6b2b' },
                      { label: 'Week deficit', val: `${metrics.deficit} mm`, color: '#ffd60a' },
                      { label: 'Soil moisture', val: `${metrics.soilM}%`, color: C.accent },
                      { label: 'Precipitation', val: `${metrics.precip} mm`, color: C.green },
                    ].map(m => (
                      <div key={m.label} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: `1px solid ${m.color}22` }}>
                        <div style={{ fontSize: '0.6rem', color: C.muted, fontFamily: C.mono }}>{m.label}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: m.color, fontFamily: 'var(--font-primary)' }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🧪 Nutrient Suggestion */}
                <div style={{
                  background: C.bg, border: '1.5px solid rgba(57,255,20,0.2)',
                  borderLeft: '3px solid #39ff14',
                  borderRadius: '14px', padding: '18px 20px',
                }}>
                  <div style={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>🧪 Nutrient Suggestion</div>
                  <NutrientBar label="Nitrogen (N)" score={metrics.nScore} color={metrics.nScore < 60 ? '#ff6b2b' : '#39ff14'} />
                  <NutrientBar label="Phosphorus (P)" score={metrics.pScore} color={metrics.pScore < 60 ? '#ffd60a' : '#39ff14'} />
                  <NutrientBar label="Potassium (K)" score={metrics.kScore} color={metrics.kScore < 60 ? '#ff3864' : '#39ff14'} />
                  <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px' }}>
                    {metrics.nutrientAlerts.map((a, i) => (
                      <div key={i} style={{ fontSize: '0.75rem', color: a.startsWith('Nutrient') ? C.green : '#ffd60a', fontFamily: C.mono, marginBottom: '4px', lineHeight: 1.5 }}>
                        {a.startsWith('Nutrient') ? '✅' : '⚠️'} {a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Row 3: Temperature Alert + Health Trend ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '4px' }}>

                {/* 🌡 Temperature Alert */}
                <div style={{
                  background: C.bg,
                  border: `1.5px solid ${metrics.tempAlertLevel === 'CRITICAL' ? 'rgba(255,56,100,0.35)' : metrics.tempAlertLevel === 'HIGH' ? 'rgba(255,107,43,0.35)' : metrics.tempAlertLevel === 'MODERATE' ? 'rgba(255,214,10,0.25)' : 'rgba(0,255,136,0.2)'}`,
                  borderLeft: `3px solid ${metrics.tempAlertLevel === 'CRITICAL' ? '#ff3864' : metrics.tempAlertLevel === 'HIGH' ? '#ff6b2b' : metrics.tempAlertLevel === 'MODERATE' ? '#ffd60a' : C.green}`,
                  borderRadius: '14px', padding: '18px 20px',
                }}>
                  <div style={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>🌡️ Temperature Alert</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '2rem' }}>
                      {metrics.tempAlertLevel === 'CRITICAL' ? '🔥' : metrics.tempAlertLevel === 'HIGH' ? '🌡️' : metrics.tempAlertLevel === 'MODERATE' ? '⚠️' : '✅'}
                    </span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.3rem', fontWeight: 900, color: metrics.tempAlertLevel === 'CRITICAL' ? '#ff3864' : metrics.tempAlertLevel === 'HIGH' ? '#ff6b2b' : metrics.tempAlertLevel === 'MODERATE' ? '#ffd60a' : C.green }}>
                        {metrics.tempAlertLevel}
                      </div>
                      <div style={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.muted }}>Alert level</div>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: '0.78rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>{metrics.tempAlert}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(255,107,43,0.08)', border: '1px solid rgba(255,107,43,0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: C.muted, fontFamily: C.mono }}>Max</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ff6b2b' }}>{metrics.tMax}°C</div>
                    </div>
                    <div style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: C.muted, fontFamily: C.mono }}>Min</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: C.accent }}>{metrics.tMin}°C</div>
                    </div>
                    <div style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: C.muted, fontFamily: C.mono }}>Now</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd60a' }}>{metrics.temp}°C</div>
                    </div>
                  </div>
                </div>

                {/* 📊 Health Trend Graph */}
                <div style={{
                  background: C.bg, border: '1.5px solid rgba(0,229,255,0.18)',
                  borderRadius: '14px', padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>📊 7-Day Health Trend</div>
                    <div style={{ fontSize: '0.65rem', fontFamily: C.mono, color: C.muted }}>
                      <span style={{ color: '#00ff88' }}>■</span> Healthy &nbsp;
                      <span style={{ color: '#ffd60a' }}>■</span> Moderate &nbsp;
                      <span style={{ color: '#ff6b2b' }}>■</span> High &nbsp;
                      <span style={{ color: '#ff3864' }}>■</span> Critical
                    </div>
                  </div>
                  <HealthTrendChart trend={metrics.trend} />
                  <div style={{ marginTop: '6px', fontFamily: C.mono, fontSize: '0.65rem', color: C.muted, textAlign: 'center' }}>
                    Bars = predicted health % · Orange labels = forecast max temp (°C)
                  </div>
                </div>
              </div>

              {/* ── Row 4: Soil Health (full width) ── */}
              <div style={{ marginTop: '14px' }}>
                <div style={{
                  background: C.bg,
                  border: `1.5px solid ${metrics.soilStatusColor}44`,
                  borderLeft: `3px solid ${metrics.soilStatusColor}`,
                  borderRadius: '14px', padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🌱 Soil Health Index</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-primary)', fontSize: '1.8rem', fontWeight: 900, color: metrics.soilStatusColor, lineHeight: 1 }}>
                        {metrics.soilHealth}<span style={{ fontSize: '1rem', fontWeight: 400, color: C.muted }}>/100</span>
                      </span>
                      <div style={{
                        padding: '4px 14px', borderRadius: '20px', fontSize: '0.7rem',
                        fontFamily: C.mono, fontWeight: 700,
                        background: `${metrics.soilStatusColor}15`, border: `1px solid ${metrics.soilStatusColor}55`,
                        color: metrics.soilStatusColor,
                      }}>{metrics.soilStatus}</div>
                    </div>
                  </div>

                  {/* 6 sub-indicator bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { label: 'Moisture',          score: metrics.mScore,        icon: '💧', hint: `${metrics.soilM}%` },
                      { label: 'Soil Temp',          score: metrics.stScore,       icon: '🌡️', hint: `${metrics.soilT}°C` },
                      { label: 'Aeration',           score: metrics.aerationScore, icon: '💨', hint: metrics.aerationScore >= 75 ? 'Good' : metrics.aerationScore >= 50 ? 'Fair' : 'Poor' },
                      { label: 'Organic Matter',     score: metrics.organicScore,  icon: '🌿', hint: metrics.organicScore >= 75 ? 'High' : metrics.organicScore >= 50 ? 'Med' : 'Low' },
                      { label: 'Microbial Activity', score: metrics.microbialScore,icon: '🦠', hint: metrics.microbialScore >= 75 ? 'Active' : metrics.microbialScore >= 50 ? 'Moderate' : 'Low' },
                      { label: 'Structure',          score: metrics.structureScore,icon: '🪨', hint: metrics.structureScore >= 75 ? 'Stable' : metrics.structureScore >= 50 ? 'Fair' : 'Fragile' },
                    ].map(({ label, score, icon, hint }) => {
                      const col = score >= 75 ? '#00ff88' : score >= 50 ? '#ffd60a' : score >= 30 ? '#ff6b2b' : '#ff3864';
                      return (
                        <div key={label} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: `1px solid ${col}22` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', fontFamily: C.mono }}>{icon} {label}</div>
                            <div style={{ fontSize: '0.68rem', color: col, fontFamily: C.mono, fontWeight: 700 }}>{hint}</div>
                          </div>
                          <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${score}%`, borderRadius: '3px', background: `linear-gradient(90deg, ${col}88, ${col})`, transition: 'width 0.8s ease' }} />
                          </div>
                          <div style={{ marginTop: '4px', fontFamily: C.mono, fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>{score}/100</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* composite bar */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontFamily: C.mono, fontSize: '0.65rem', color: C.muted }}>Composite Soil Health Score</span>
                      <span style={{ fontFamily: C.mono, fontSize: '0.65rem', color: metrics.soilStatusColor, fontWeight: 700 }}>{metrics.soilHealth}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.soilHealth}%`, borderRadius: '4px', background: `linear-gradient(90deg, ${metrics.soilStatusColor}66, ${metrics.soilStatusColor})`, transition: 'width 1s ease', boxShadow: `0 0 8px ${metrics.soilStatusColor}55` }} />
                    </div>
                  </div>

                  {/* issues / recommendations */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {metrics.soilIssues.map((issue, i) => (
                      <div key={i} style={{ fontSize: '0.76rem', fontFamily: C.mono, color: issue.startsWith('✅') ? C.green : '#ffd60a', lineHeight: 1.5 }}>{issue}</div>
                    ))}
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      )}

      {/* form */}
      <div style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: '12px', padding: '24px', marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🌾</span>
          <span style={{ fontFamily: C.mono, fontSize: '0.8rem', fontWeight: 700,
            color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Farm Details
          </span>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* Farm name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label('Farm Name')}>Farm Name *</label>
              <input
                name="farmName" value={form.farmName} onChange={handleChange}
                placeholder="e.g. North Block – Wheat 2026"
                required
                style={inputStyle}
                onFocus={e  => e.target.style.borderColor = C.accent}
                onBlur={e   => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Crop type */}
            <div>
              <label style={label('Crop Type')}>Crop Type</label>
              <select
                name="cropType" value={form.cropType} onChange={handleChange}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e  => e.target.style.borderColor = C.border}
              >
                <option value="">— Select —</option>
                {CROP_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Sowing date */}
            <div>
              <label style={label('Sowing Date')}>Sowing Date</label>
              <input
                type="date" name="sowingDate" value={form.sowingDate} onChange={handleChange}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e  => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Irrigation type */}
            <div>
              <label style={label('Irrigation Type')}>Irrigation Type</label>
              <select
                name="irrigationType" value={form.irrigationType} onChange={handleChange}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e  => e.target.style.borderColor = C.border}
              >
                <option value="">— Select —</option>
                {IRRIGATION.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>

            {/* Soil type */}
            <div>
              <label style={label('Soil Type')}>Soil Type</label>
              <select
                name="soilType" value={form.soilType} onChange={handleChange}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e  => e.target.style.borderColor = C.border}
              >
                <option value="">— Select —</option>
                {SOIL_TYPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

          </div>

          {/* GeoJSON preview */}
          {geojson && (
            <div style={{ marginTop: '16px' }}>
              <label style={label('Boundary GeoJSON')}>Boundary GeoJSON</label>
              <pre style={{
                background: 'rgba(0,0,0,0.4)', border: `1px solid ${C.border}`,
                borderRadius: '7px', padding: '10px 14px', fontSize: '0.72rem',
                color: C.green, fontFamily: C.mono, maxHeight: '120px',
                overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {JSON.stringify(geojson, null, 2)}
              </pre>
            </div>
          )}

          {/* status */}
          {status && (
            <div style={{
              marginTop: '14px', padding: '10px 14px', borderRadius: '8px',
              fontSize: '0.84rem', fontFamily: C.mono,
              color:   status.type === 'success' ? C.green : C.red,
              background: status.type === 'success' ? 'rgba(0,255,136,0.07)' : 'rgba(255,56,100,0.07)',
              border: `1px solid ${status.type === 'success' ? 'rgba(0,255,136,0.25)' : 'rgba(255,56,100,0.25)'}`,
            }}>
              {status.type === 'success' ? '✅ ' : '⚠ '}{status.msg}
            </div>
          )}

          {/* submit */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '11px 32px', borderRadius: '8px',
                background: saving ? 'rgba(0,229,255,0.05)' : 'rgba(0,229,255,0.12)',
                border: `1px solid ${C.accent}`,
                color: saving ? C.muted : C.accent,
                fontFamily: C.mono, fontSize: '0.88rem', fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                letterSpacing: '0.06em', transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (!saving) e.target.style.background = 'rgba(0,229,255,0.22)'; }}
              onMouseLeave={e => { if (!saving) e.target.style.background = 'rgba(0,229,255,0.12)'; }}
            >
              {saving ? '⏳ Saving…' : '💾 Save Farm'}
            </button>

            {(geojson || form.farmName) && (
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM); setStatus(null);
                  setGeojson(null); setAreaHa(null);
                  setMetrics(null);
                  drawnRef.current?.clearLayers();
                  polygonRef.current = null;
                }}
                style={{
                  padding: '11px 20px', borderRadius: '8px',
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.muted, fontFamily: C.mono, fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}

            {areaHa !== null && (
              <span style={{ marginLeft: 'auto', fontFamily: C.mono,
                fontSize: '0.8rem', color: C.muted }}>
                Area: <strong style={{ color: C.green }}>{areaHa.toFixed(4)} ha</strong>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* info footer */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px',
      }}>
        {[
          { icon: '🗺️', title: 'OpenStreetMap tiles', desc: 'High-res base map — zoom to field level for precision' },
          { icon: '✏️', title: 'Leaflet.draw',         desc: 'Draw, edit, or delete your polygon boundary at any time' },
          { icon: '📐', title: 'Turf.js area calc',    desc: 'Geodesic area computed on the WGS-84 ellipsoid (accurate)' },
        ].map(card => (
          <div key={card.title} style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '14px 16px',
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{card.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: C.text,
              marginBottom: '4px' }}>{card.title}</div>
            <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.5 }}>{card.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
