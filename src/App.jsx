import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const C = {
  bg: "#eff2f7",
  bg2: "#f7f9fc",
  panel: "#ffffff",
  panelHi: "#edf1f7",
  border: "#cbd8e6",
  borderHi: "#94adc4",
  blue: "#0557b8",
  teal: "#007870",
  orange: "#c96a00",
  red: "#c02828",
  amber: "#c88800",
  green: "#1e8a4a",
  dim: "#546878",
  dimmer: "#b8c8d8",
  white: "#111e2c",
  grid: "#dce8f4",
};

const M = "'Azeret Mono','Courier New',monospace";
const U = "'DM Sans','Segoe UI',sans-serif";

const TT = {
  background: "#ffffff",
  border: `1px solid ${C.borderHi}`,
  borderRadius: 6,
  fontSize: 10,
  color: C.white,
  fontFamily: M,
  padding: "6px 10px",
  boxShadow: "0 4px 14px rgba(5,40,80,0.10)",
};

const LIM = {
  vib: { w: 0.30, c: 0.50 },
  temp: { w: 80, c: 85 },
};

const DATA_SOURCE = "api";
const API_BASE_URL = "http://127.0.0.1:8000";
const API_POLL_MS = 3000;

const defaultAlerts = [
  { id: "sys-1", type: "SYS", msg: "SmartMotor v2 — painel operacional iniciado", t: new Date().toLocaleTimeString("pt-BR"), c: C.blue },
  { id: "sys-2", type: "SYS", msg: "PT100 (temperatura) + ADXL345 (vibração) — ativos", t: new Date().toLocaleTimeString("pt-BR"), c: C.teal },
  { id: "sys-3", type: "SYS", msg: `Fonte de dados: ${DATA_SOURCE.toUpperCase()} — ${API_BASE_URL}`, t: new Date().toLocaleTimeString("pt-BR"), c: C.blue },
];

function mapApiResponse(raw) {
  const t = raw.timestamp
    ? new Date(raw.timestamp).toLocaleTimeString("pt-BR")
    : new Date().toLocaleTimeString("pt-BR");

  const temp = Number(raw.temperature ?? raw.temperatura ?? raw.temp ?? 0);
  const ax = Number(raw.vibration_x ?? raw.ax ?? 0);
  const ay = Number(raw.vibration_y ?? raw.ay ?? 0);
  const az = Number(raw.vibration_z ?? raw.az ?? 0);
  const vibRMS = Number(
    raw.vibration_rms ??
    raw.vibracao_rms ??
    Math.sqrt((ax ** 2 + ay ** 2 + az ** 2) / 3)
  );
  const rpm = Number(raw.rpm ?? 0);
  const freq = Number(raw.frequency_hz ?? raw.frequencia_hz ?? raw.freq ?? 0);
  const hours = Number(raw.hours_operation ?? raw.horas_operacao ?? raw.hours ?? 0);
  const score = Number(raw.health_score ?? raw.saude_score ?? raw.score ?? 0);
  const bat = Number(raw.bat ?? 100);

  return { temp, ax, ay, az, vibRMS, rpm, freq, hours, bat, score, t };
}

function motorStatus(d) {
  if (!d || d.rpm === 0) return "PARADO";
  if (d.temp >= LIM.temp.c || d.vibRMS >= LIM.vib.c) return "CRÍTICO";
  if (d.temp >= LIM.temp.w || d.vibRMS >= LIM.vib.w) return "ALERTA";
  return "NORMAL";
}

const gc = (v, lim) => v >= lim.c ? C.red : v >= lim.w ? C.amber : C.teal;

function exportAlertsToCSV(alerts) {
  const csv = [["tipo", "horario", "mensagem"], ...alerts.map((a) => [a.type, a.t, a.msg])]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `smartmotor-${Date.now()}.csv` });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function Fonts() {
  useEffect(() => {
    if (!document.getElementById("sm-fonts")) {
      const l = document.createElement("link");
      l.id = "sm-fonts";
      l.rel = "stylesheet";
      l.href =
        "https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@300;400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
    Object.assign(document.body.style, { margin: 0, padding: 0, background: C.bg });
  }, []);
  return null;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TT}>
      <div style={{ fontSize: 9, color: C.dim, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color, display: "inline-block" }} />
          <span style={{ fontFamily: M, fontSize: 9 }}>
            {p.name}: {Number(p.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function TileKPI({ label, value, unit, color, sub }) {
  return (
    <div
      style={{
        background: C.panel,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color || C.blue}`,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontFamily: U, fontSize: 8, color: C.dim, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: M, fontSize: 22, fontWeight: 700, color: color || C.white, lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 9, color: C.dim, marginLeft: 4 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ label, color, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 3, height: 16, background: color || C.blue, borderRadius: 2 }} />
      <span style={{ fontFamily: U, fontSize: 10, fontWeight: 700, color: C.white, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {icon && <span style={{ marginRight: 5 }}>{icon}</span>}
        {label}
      </span>
    </div>
  );
}

function ConnBadge({ ok }) {
  const color = ok ? C.teal : C.red;
  return (
    <span
      style={{
        fontFamily: M,
        fontSize: 8,
        fontWeight: 700,
        color,
        background: color + "18",
        border: `1px solid ${color}55`,
        borderRadius: 3,
        padding: "2px 8px",
      }}
    >
      MODBUS {ok ? "ON" : "OFF"}
    </span>
  );
}

function PersistentAlarm({ alarm }) {
  if (!alarm) return null;
  const isCrit = alarm.level === "CRIT";
  const bg = isCrit ? "#fff1f1" : "#fff8e8";
  const border = isCrit ? C.red : C.amber;
  const titleColor = isCrit ? C.red : C.amber;

  return (
    <div
      style={{
        position: "fixed",
        top: 76,
        right: 18,
        zIndex: 2000,
        width: 360,
        maxWidth: "calc(100vw - 24px)",
        background: bg,
        border: `2px solid ${border}`,
        borderLeft: `6px solid ${border}`,
        borderRadius: 8,
        boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
        padding: "12px 14px",
      }}
    >
      <div style={{ fontFamily: U, fontSize: 11, fontWeight: 700, color: titleColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {alarm.title}
      </div>
      <div style={{ fontFamily: U, fontSize: 12, lineHeight: 1.45, color: C.white, marginBottom: 8 }}>{alarm.message}</div>
      <div style={{ fontFamily: M, fontSize: 8, color: C.dim }}>Permanece ativo até retorno à faixa normal.</div>
    </div>
  );
}

function MotorSVG({ status, running, onClick }) {
  const col = status === "CRÍTICO" ? C.red : status === "ALERTA" ? C.amber : status === "NORMAL" ? C.teal : C.dim;
  const bodyC = running ? "#dde7f2" : "#e8eef5";

  return (
    <svg viewBox="0 0 440 205" style={{ width: "100%", maxWidth: 480, cursor: "pointer", display: "block" }} onClick={onClick}>
      <rect x="74" y="36" width="278" height="128" rx="14" fill={bodyC} stroke={C.borderHi} strokeWidth="1.5" />
      <rect x="46" y="46" width="30" height="108" rx="8" fill="#c8d8ea" stroke={C.borderHi} strokeWidth="1.2" />
      <rect x="350" y="46" width="30" height="108" rx="8" fill="#c8d8ea" stroke={C.borderHi} strokeWidth="1.2" />
      <rect x="380" y="94" width="52" height="12" rx="5" fill="#a4bad0" stroke={C.borderHi} strokeWidth="1" />
      <rect x="112" y="76" width="202" height="48" rx="4" fill={C.panel} stroke={col} strokeWidth="1" />
      <text x="213" y="92" textAnchor="middle" fill={col} fontSize="10" fontFamily={U} fontWeight="700">MOTOR WEG 3HP · IE3</text>
      <text x="213" y="105" textAnchor="middle" fill={C.dim} fontSize="8" fontFamily={M}>220/380V · 60Hz · 3475rpm</text>
      <rect x="80" y="40" width="70" height="22" rx="4" fill={C.blue + "1a"} stroke={C.blue} strokeWidth="1.2" />
      <text x="115" y="51" textAnchor="middle" fill={C.blue} fontSize="8" fontFamily={U} fontWeight="700">ADXL345</text>
      <rect x="286" y="40" width="64" height="22" rx="4" fill={C.orange + "1a"} stroke={C.orange} strokeWidth="1.2" />
      <text x="318" y="51" textAnchor="middle" fill={C.orange} fontSize="8" fontFamily={U} fontWeight="700">PT100</text>
      <circle cx="366" cy="46" r="7.5" fill={col} />
      <text x="213" y="190" textAnchor="middle" fill={running ? col : C.dim} fontSize="9" fontFamily={U} fontWeight={running ? "600" : "400"}>
        {running ? `● EM OPERAÇÃO · ${status}` : "○ PARADO"}
      </text>
      <text x="213" y="202" textAnchor="middle" fill={C.dimmer} fontSize="7.5" fontFamily={M}>clique para abrir painel de controle</text>
    </svg>
  );
}

function TelemetryPanel({ d, hist }) {
  const vibC = d ? gc(d.vibRMS, LIM.vib) : C.dim;
  const tempC = d ? gc(d.temp, LIM.temp) : C.dim;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionLabel label="Telemetria Operacional" color={C.teal} icon="◈" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <TileKPI label="Temperatura" value={d?.temp?.toFixed(1) || "--"} unit="°C" color={tempC} sub={`Atenção ${LIM.temp.w} / Crítico ${LIM.temp.c}`} />
        <TileKPI label="Vibração Global" value={d?.vibRMS?.toFixed(2) || "--"} unit="g" color={vibC} sub={`Atenção ${LIM.vib.w} / Crítico ${LIM.vib.c}`} />
        <TileKPI label="Condição do Ativo" value={d?.score || "--"} unit="/100" color={d ? (d.score > 70 ? C.green : d.score > 40 ? C.amber : C.red) : C.dim} />
        <TileKPI label="Frequência" value={d?.freq?.toFixed(1) || "--"} unit="Hz" color={C.blue} sub="inversor CFW500" />
      </div>

      <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tendência Térmica · PT100</div>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={hist.slice(-30)}>
            <defs>
              <linearGradient id="gtemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.orange} stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
            <XAxis dataKey="t" tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} width={24} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={LIM.temp.w} stroke={C.amber} strokeDasharray="3 2" strokeWidth={0.8} />
            <ReferenceLine y={LIM.temp.c} stroke={C.red} strokeDasharray="3 2" strokeWidth={0.8} />
            <Area type="monotone" dataKey="temp" name="Temperatura" stroke={C.orange} fill="url(#gtemp)" dot={false} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tendência Vibracional · ADXL345</div>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={hist.slice(-30)}>
            <defs>
              <linearGradient id="gvib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.blue} stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
            <XAxis dataKey="t" tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} width={24} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={LIM.vib.w} stroke={C.amber} strokeDasharray="3 2" strokeWidth={0.8} />
            <ReferenceLine y={LIM.vib.c} stroke={C.red} strokeDasharray="3 2" strokeWidth={0.8} />
            <Area type="monotone" dataKey="vibRMS" name="Vibração" stroke={C.blue} fill="url(#gvib)" dot={false} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AlertPanel({ alerts, d, onExport, onResolve }) {
  const sC = d ? (d.score > 70 ? C.green : d.score > 40 ? C.amber : C.red) : C.dim;
  const crits = alerts.filter((a) => a.type === "CRIT").length;
  const warns = alerts.filter((a) => a.type === "WARN").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionLabel label="Diagnóstico Técnico" color={C.red} icon="▲" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {[["Críticos", crits, C.red], ["Alertas", warns, C.amber], ["Saúde", d?.score || "--", sC]].map(([lbl, val, col]) => (
          <div key={lbl} style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `3px solid ${col}`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: M, fontSize: 16, fontWeight: 700, color: col }}>{val}</div>
            <div style={{ fontFamily: U, fontSize: 8, color: C.dim, textTransform: "uppercase", marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.panel, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.borderHi}`, borderLeft: `3px solid ${sC}` }}>
        <div style={{ fontFamily: U, fontSize: 9, fontWeight: 700, color: sC, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Diagnóstico Operacional</div>
        {d ? [
          ["Térmico", d.temp < LIM.temp.w ? "Faixa nominal" : d.temp < LIM.temp.c ? "Elevação térmica" : "SOBREAQUECIMENTO", d.temp < LIM.temp.w ? C.green : d.temp < LIM.temp.c ? C.amber : C.red],
          ["Mecânico", d.vibRMS < 2.8 ? "Estável" : d.vibRMS < LIM.vib.w ? "Vibração crescente" : "VIBRAÇÃO CRÍTICA", d.vibRMS < 2.8 ? C.green : d.vibRMS < LIM.vib.w ? C.amber : C.red],
          ["Tendência", d.score > 70 ? "Operação confiável" : d.score > 40 ? "Requer observação" : "Intervenção necessária", sC],
          ["Previsão", `~${d.score > 70 ? ">180" : d.score > 40 ? "30–60" : "<15"} dias`, sC],
        ].map(([lbl, val, col]) => (
          <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${C.grid}` }}>
            <span style={{ fontFamily: U, fontSize: 8, color: C.dim }}>{lbl}</span>
            <span style={{ fontFamily: M, fontSize: 8, fontWeight: 600, color: col }}>{val}</span>
          </div>
        )) : <div style={{ fontFamily: M, fontSize: 9, color: C.dim }}>Ativo offline</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onExport} style={{ padding: "7px 14px", borderRadius: 6, background: C.blue + "12", color: C.blue, border: `1px solid ${C.blue}55`, cursor: "pointer", fontFamily: M, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em" }}>EXPORTAR CSV</button>
      </div>

      <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}`, flex: 1, minHeight: 180 }}>
        <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Registro de Eventos</div>
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
          {alerts.slice(0, 20).map((a, i) => (
            <div key={a.id ?? i} style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "space-between", padding: "6px 8px", borderRadius: 4, background: a.type === "CRIT" ? "#fff2f2" : "#fff8e6", borderLeft: `2.5px solid ${a.c}` }}>
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                <span style={{ fontFamily: M, fontSize: 7.5, color: C.dim, minWidth: 54, flexShrink: 0, marginTop: 1 }}>{a.t}</span>
                <span style={{ fontFamily: M, fontSize: 7.5, color: C.white, lineHeight: 1.4 }}>{a.msg}</span>
              </div>
              {a.id && <button onClick={() => onResolve?.(a.id)} style={{ border: `1px solid ${a.c}55`, background: "#ffffff", color: a.c, borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontFamily: M, fontSize: 7, fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>RESOLVER</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ d, running, motorMode, connStatus, modbusOnline }) {
  const st = running ? motorStatus(d) : "PARADO";
  const col = st === "CRÍTICO" ? C.red : st === "ALERTA" ? C.amber : st === "NORMAL" ? C.green : C.dim;
  return (
    <div style={{ background: C.panel, borderTop: `1px solid ${C.border}`, padding: "6px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: M, fontSize: 9, color: col, fontWeight: 700 }}>● {st}</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.freq?.toFixed(1) || "0.0"} Hz</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.rpm?.toFixed(0) || "0"} RPM</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.temp?.toFixed(1) || "–"}°C</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.vibRMS?.toFixed(2) || "–"} g</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.hours?.toFixed(1) || "–"}h</span>
        <span style={{ fontFamily: M, fontSize: 9, color: motorMode === "MANUTENÇÃO" ? C.orange : C.dimmer }}>MODO: {motorMode}</span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <ConnBadge ok={modbusOnline} />
        <span style={{ fontFamily: M, fontSize: 8, color: C.dim }}>BAT {d?.bat?.toFixed(0) || "–"}%</span>
        <span style={{ fontFamily: M, fontSize: 8, color: C.dim }}>{connStatus}</span>
      </div>
    </div>
  );
}

function useMotorData({ running, onAlert }) {
  const [live, setLive] = useState(null);
  const [hist, setHist] = useState([]);
  const [connStatus, setConnStatus] = useState("API");
  const prevAlertRef = useRef("");

  useEffect(() => {
    let active = true;

    const cycle = async () => {
      try {
        const collectResponse = await fetch(`${API_BASE_URL}/modbus/collect`, { method: "POST" });
        if (!collectResponse.ok) throw new Error(`Collect HTTP ${collectResponse.status}`);

        const machineResponse = await fetch(`${API_BASE_URL}/machines/1/latest`);
        if (!machineResponse.ok) throw new Error(`Machine HTTP ${machineResponse.status}`);

        const raw = await machineResponse.json();
        if (!active) return;

        const d = mapApiResponse(raw);
        setLive(d);
        setHist((h) => [...h, d].slice(-80));
        setConnStatus("API ✓");

        const newAlerts = [];
        if (d.temp >= LIM.temp.c) newAlerts.push({ type: "CRIT", msg: `Temperatura crítica ${d.temp.toFixed(1)}°C`, t: d.t, c: C.red });
        else if (d.temp >= LIM.temp.w) newAlerts.push({ type: "WARN", msg: `Elevação térmica ${d.temp.toFixed(1)}°C`, t: d.t, c: C.amber });

        if (d.vibRMS >= LIM.vib.c) newAlerts.push({ type: "CRIT", msg: `Vibração crítica ${d.vibRMS.toFixed(2)} g`, t: d.t, c: C.red });
        else if (d.vibRMS >= LIM.vib.w) newAlerts.push({ type: "WARN", msg: `Vibração elevada ${d.vibRMS.toFixed(2)} g`, t: d.t, c: C.amber });

        const signature = JSON.stringify(newAlerts.map((a) => `${a.type}-${a.msg}`));
        if (newAlerts.length && prevAlertRef.current !== signature) {
          prevAlertRef.current = signature;
          onAlert(newAlerts);
        }
        if (!newAlerts.length) prevAlertRef.current = "";
      } catch (err) {
        if (active) setConnStatus("API ERR");
        console.error("Erro no ciclo de dados:", err);
      }
    };

    cycle();
    const id = setInterval(cycle, API_POLL_MS);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [running, onAlert]);

  return { live, hist, connStatus };
}

function MotorControlModal({ d, motorMode, setMotorMode, running, setRunning, freqSP, setFreqSP, ramp, setRamp, degrad, setDegrad, onClose }) {
  const status = motorMode === "MANUTENÇÃO" ? "MANUTENÇÃO" : motorStatus(d);
  const statusCol = status === "CRÍTICO" ? C.red : status === "ALERTA" ? C.amber : status === "NORMAL" ? C.green : C.orange;
  const checklist = [
    "Verificar lubrificação dos rolamentos",
    "Medir temperatura da carcaça (PT100)",
    "Testar vibração em bancada (ADXL345)",
    "Verificar alinhamento eixo/acoplamento",
    "Limpar aletas e filtros de resfriamento",
    "Checar aperto dos bornes elétricos R·S·T",
    "Testar isolação do enrolamento (megôhmetro)",
    "Calibrar sensores ESP32 + firmware",
  ];
  const [checked, setChecked] = useState(() => Array(checklist.length).fill(false));
  const toggleCheck = (idx) => setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,20,40,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.bg2, border: `1px solid ${C.borderHi}`, borderTop: `3px solid ${statusCol}`, borderRadius: 10, width: "100%", maxWidth: 760, boxShadow: "0 16px 40px rgba(5,30,70,0.14)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: C.panel, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: C.white }}>PAINEL DE CONTROLE OPERACIONAL</div>
            <div style={{ fontFamily: M, fontSize: 8, color: C.dim }}>MOTOR WEG 3HP · CFW500 · TM221 · ESP32 · SM-001</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: statusCol, background: statusCol + "18", border: `1px solid ${statusCol}55`, borderRadius: 4, padding: "3px 10px" }}>{status}</span>
            <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.dim, cursor: "pointer", fontFamily: M, fontSize: 11, width: 28, height: 28 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "18px 20px", overflowY: "auto", display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
            <TileKPI label="Temperatura" value={d?.temp?.toFixed(1) || "--"} unit="°C" color={d ? gc(d.temp, LIM.temp) : C.dim} />
            <TileKPI label="Vibração" value={d?.vibRMS?.toFixed(2) || "--"} unit="g" color={d ? gc(d.vibRMS, LIM.vib) : C.dim} />
            <TileKPI label="Saúde" value={d?.score || "--"} unit="/100" color={d ? (d.score > 70 ? C.green : d.score > 40 ? C.amber : C.red) : C.dim} />
            <TileKPI label="RPM" value={d?.rpm?.toFixed(0) || "--"} unit="rpm" color={C.blue} />
          </div>

          <div style={{ background: C.panel, borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: U, fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Frequência — CFW500</div>
              <div style={{ fontFamily: M, fontSize: 20, fontWeight: 700, color: C.blue }}>{freqSP} <span style={{ fontSize: 11, color: C.dim }}>Hz</span></div>
            </div>
            <input type="range" min="30" max="60" step="0.5" value={freqSP} onChange={(e) => setFreqSP(+e.target.value)} disabled={motorMode === "MANUTENÇÃO"} style={{ width: "100%", accentColor: C.blue }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            <div style={{ background: C.panel, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: U, fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Rampa de aceleração</div>
              <div style={{ fontFamily: M, fontSize: 18, fontWeight: 700, color: C.orange }}>{ramp}s</div>
              <input type="range" min="1" max="30" step="1" value={ramp} onChange={(e) => setRamp(+e.target.value)} style={{ width: "100%", accentColor: C.orange, marginTop: 6 }} />
            </div>

            <div style={{ background: C.panel, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: U, fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Desgaste simulado</div>
              <div style={{ fontFamily: M, fontSize: 18, fontWeight: 700, color: degrad > 70 ? C.red : degrad > 40 ? C.amber : C.green }}>{degrad}%</div>
              <input type="range" min="0" max="100" step="1" value={degrad} onChange={(e) => setDegrad(+e.target.value)} style={{ width: "100%", accentColor: degrad > 70 ? C.red : degrad > 40 ? C.amber : C.green, marginTop: 6 }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button onClick={() => { if (motorMode !== "MANUTENÇÃO") setRunning(true); }} style={{ padding: "14px 20px", borderRadius: 8, cursor: motorMode === "MANUTENÇÃO" ? "not-allowed" : "pointer", fontFamily: M, fontSize: 12, fontWeight: 700, color: C.green, background: "#edfaf4", border: `2px solid ${C.green}`, opacity: motorMode === "MANUTENÇÃO" ? 0.4 : 1 }}>▶ PARTIDA</button>
            <button onClick={() => setRunning(false)} style={{ padding: "14px 20px", borderRadius: 8, cursor: "pointer", fontFamily: M, fontSize: 12, fontWeight: 700, color: C.red, background: "#fff2f2", border: `2px solid ${C.red}` }}>■ PARADA</button>
            <button onClick={() => { if (motorMode === "MANUTENÇÃO") setMotorMode("AUTO"); else { setMotorMode("MANUTENÇÃO"); setRunning(false); } }} style={{ padding: "14px 20px", borderRadius: 8, cursor: "pointer", fontFamily: M, fontSize: 12, fontWeight: 700, color: motorMode === "MANUTENÇÃO" ? C.green : C.orange, background: motorMode === "MANUTENÇÃO" ? "#edfaf4" : "#fff6e8", border: `2px solid ${motorMode === "MANUTENÇÃO" ? C.green : C.orange}` }}>⚙ {motorMode === "MANUTENÇÃO" ? "LIBERAR OPERAÇÃO" : "ATIVAR MANUTENÇÃO"}</button>
          </div>

          <div style={{ background: C.panel, borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: U, fontSize: 9, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Checklist de Inspeção</div>
            {checklist.map((item, i) => (
              <div key={i} onClick={() => toggleCheck(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 4, cursor: "pointer", background: i % 2 === 0 ? C.panelHi : "transparent", marginBottom: 3 }}>
                <span style={{ fontFamily: M, fontSize: 12, color: checked[i] ? C.green : C.dim }}>{checked[i] ? "☑" : "☐"}</span>
                <span style={{ fontFamily: U, fontSize: 9, color: checked[i] ? C.white : C.dim, textDecoration: checked[i] ? "line-through" : "none" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [motorMode, setMotorMode] = useState("AUTO");
  const [running, setRunning] = useState(true);
  const [freqSP, setFreqSP] = useState(60);
  const [ramp, setRamp] = useState(5);
  const [degrad, setDegrad] = useState(30);
  const [modalOpen, setModalOpen] = useState(false);
  const [alerts, setAlerts] = useState(defaultAlerts);
  const [backendAlerts, setBackendAlerts] = useState([]);
  const [modbusOnline, setModbusOnline] = useState(false);
  const [persistentAlarm, setPersistentAlarm] = useState(null);

  const pushLocalAlerts = useCallback((newAlerts) => {
    setAlerts((prev) => {
      const withIds = newAlerts.map((a, idx) => ({ ...a, id: `local-${Date.now()}-${idx}` }));
      return [...withIds, ...prev].slice(0, 50);
    });
  }, []);

  const { live, hist, connStatus } = useMotorData({ running, onAlert: pushLocalAlerts });

  useEffect(() => {
    if (!live) {
      setPersistentAlarm(null);
      return;
    }
    if (live.temp >= LIM.temp.c) {
      setPersistentAlarm({ level: "CRIT", title: "ALARME CRÍTICO — TEMPERATURA", message: `O motor atingiu ${live.temp.toFixed(1)}°C, acima do limite crítico de ${LIM.temp.c}°C.` });
      return;
    }
    if (live.vibRMS >= LIM.vib.c) {
      setPersistentAlarm({ level: "CRIT", title: "ALARME CRÍTICO — VIBRAÇÃO", message: `A vibração global atingiu ${live.vibRMS.toFixed(2)} g, acima do limite crítico de ${LIM.vib.c} g.` });
      return;
    }
    if (live.temp >= LIM.temp.w) {
      setPersistentAlarm({ level: "WARN", title: "ALERTA — TEMPERATURA", message: `O motor está em ${live.temp.toFixed(1)}°C, acima do limite de atenção de ${LIM.temp.w}°C.` });
      return;
    }
    if (live.vibRMS >= LIM.vib.w) {
      setPersistentAlarm({ level: "WARN", title: "ALERTA — VIBRAÇÃO", message: `A vibração global está em ${live.vibRMS.toFixed(2)} g, acima do limite de atenção de ${LIM.vib.w} g.` });
      return;
    }
    setPersistentAlarm(null);
  }, [live]);

  const loadBackendAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts`);
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      const data = await response.json();
      setBackendAlerts(data.filter((alert) => !alert.resolved));
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
    }
  }, []);

  const loadModbusStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/modbus/test`);
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      const result = await response.json();
      setModbusOnline(result.status === "ok");
    } catch (error) {
      console.error("Erro ao testar Modbus:", error);
      setModbusOnline(false);
    }
  }, []);

  const resolveBackendAlert = useCallback(async (alertId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, { method: "PATCH" });
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      await response.json();
      loadBackendAlerts();
    } catch (error) {
      console.error("Erro ao resolver alerta:", error);
    }
  }, [loadBackendAlerts]);

  useEffect(() => {
    loadBackendAlerts();
    loadModbusStatus();
    const id = setInterval(() => {
      loadBackendAlerts();
      loadModbusStatus();
    }, 3000);
    return () => clearInterval(id);
  }, [loadBackendAlerts, loadModbusStatus]);

  const dashboardAlerts = useMemo(() => {
    const mappedBackend = backendAlerts.map((alert) => ({
      id: alert.id,
      type: alert.severity === "critical" ? "CRIT" : "WARN",
      msg: `M${alert.machine_id} • ${alert.message}`,
      t: new Date(alert.timestamp).toLocaleTimeString("pt-BR"),
      c: alert.severity === "critical" ? C.red : C.amber,
    }));
    return [...mappedBackend, ...alerts].slice(0, 50);
  }, [backendAlerts, alerts]);

  const st = motorStatus(live);

  return (
    <>
      <Fonts />
      <PersistentAlarm alarm={persistentAlarm} />

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: C.white }}>SMARTMOTOR v2</div>
            <div style={{ fontFamily: M, fontSize: 8, color: C.dim }}>Painel operacional · manutenção preditiva</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <ConnBadge ok={modbusOnline} />
            <span style={{ fontFamily: M, fontSize: 8, color: C.dim }}>Fonte: {API_BASE_URL}</span>
          </div>
        </header>

        <main style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr 360px", gap: 12, padding: 12 }}>
          <div style={{ minWidth: 0 }}>
            <TelemetryPanel d={live} hist={hist} />
          </div>

          <div style={{ minWidth: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
              <div style={{ padding: "20px 24px 8px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                  BANCADA OPERACIONAL · MONITORAMENTO DE CONDIÇÃO
                </div>
                <MotorSVG status={st} running={running} onClick={() => setModalOpen(true)} />
              </div>

              <div style={{ padding: "4px 24px 12px", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setModalOpen(true)} style={{ padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: M, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: C.blue, background: C.blue + "12", border: `1px solid ${C.blue}55` }}>⊡ PAINEL DE CONTROLE</button>
                <button onClick={() => { if (motorMode !== "MANUTENÇÃO") setRunning((v) => !v); }} style={{ padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: M, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: running ? C.red : C.green, background: running ? "#fff2f2" : "#edfaf4", border: `1px solid ${running ? C.red : C.green}55`, opacity: motorMode === "MANUTENÇÃO" ? 0.4 : 1 }}>
                  {running ? "■ PARAR" : "▶ LIGAR"}
                </button>
                <button onClick={() => { if (motorMode === "MANUTENÇÃO") setMotorMode("AUTO"); else { setMotorMode("MANUTENÇÃO"); setRunning(false); } }} style={{ padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: M, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: motorMode === "MANUTENÇÃO" ? C.orange : C.dim, background: motorMode === "MANUTENÇÃO" ? "#fff6e8" : "transparent", border: `1px solid ${motorMode === "MANUTENÇÃO" ? C.orange : C.border}` }}>⚙ MANUTENÇÃO</button>
              </div>

              <div style={{ padding: "4px 18px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Índice de Saúde</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={hist.slice(-30)}>
                      <defs>
                        <linearGradient id="gscore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
                      <XAxis dataKey="t" tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} width={22} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={40} stroke={C.amber} strokeDasharray="3 2" strokeWidth={0.8} />
                      <Area type="monotone" dataKey="score" name="Saúde" stroke={C.green} fill="url(#gscore)" dot={false} strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Vibração por Eixo</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={hist.slice(-30)}>
                      <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
                      <XAxis dataKey="t" tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} width={22} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="ax" name="Eixo X" stroke={C.blue} dot={false} strokeWidth={1.4} />
                      <Line type="monotone" dataKey="ay" name="Eixo Y" stroke="#6870a0" dot={false} strokeWidth={1.4} />
                      <Line type="monotone" dataKey="az" name="Eixo Z" stroke={C.teal} dot={false} strokeWidth={1.4} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <AlertPanel alerts={dashboardAlerts} d={live} onExport={() => exportAlertsToCSV(dashboardAlerts)} onResolve={resolveBackendAlert} />
          </div>
        </main>

        <StatusBar d={live} running={running} motorMode={motorMode} connStatus={connStatus} modbusOnline={modbusOnline} />

        {modalOpen && (
          <MotorControlModal
            d={live}
            motorMode={motorMode}
            setMotorMode={setMotorMode}
            running={running}
            setRunning={setRunning}
            freqSP={freqSP}
            setFreqSP={setFreqSP}
            ramp={ramp}
            setRamp={setRamp}
            degrad={degrad}
            setDegrad={setDegrad}
            onClose={() => setModalOpen(false)}
          />
        )}
      </div>
    </>
  );
}
