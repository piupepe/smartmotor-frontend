import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";

/* ═══════════════════════════════════════════
   DIGITAL TWIN 3D — WEG Motor Preto
═══════════════════════════════════════════ */

function Pulley({ rpm }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += (rpm / 60) * 2 * Math.PI * delta;
  });
  return (
    <group ref={ref} position={[1.9, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <torusGeometry args={[0.36, 0.06, 16, 48]} />
        <meshStandardMaterial color="#222" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.09, 0.09, 0.15, 20]} />
        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.15} />
      </mesh>
      {[0,1,2,3].map(i => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
          <boxGeometry args={[0.54, 0.045, 0.06]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function FanBlades({ rpm }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += (rpm / 60) * 2 * Math.PI * delta;
  });
  return (
    <group ref={ref} position={[-1.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {[0,1,2,3,4,5].map(i => (
        <mesh key={i}
          position={[0.2 * Math.cos(i*Math.PI/3), 0.2 * Math.sin(i*Math.PI/3), 0]}
          rotation={[0, 0, i * Math.PI / 3]}>
          <boxGeometry args={[0.2, 0.05, 0.035]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function MotorMesh({ temp = 30, vibRMS = 0.1, rpm = 0, running = false }) {
  const bodyRef  = useRef();
  const shaftRef = useRef();
  const glowRef  = useRef();

  const ledColor     = temp > 85 ? "#ff2d55" : temp > 70 ? "#ffb830" : running ? "#00e676" : "#333";
  const heatColor    = temp > 85 ? "#ff3300" : temp > 70 ? "#ff7700" : "#000";
  const heatIntens   = temp > 85 ? 1.2 : temp > 70 ? 0.5 : 0;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (bodyRef.current && running && vibRMS > 0.3) {
      const shake = vibRMS * 0.007;
      const f = 35 + vibRMS * 6;
      bodyRef.current.position.x = Math.sin(t * f) * shake;
      bodyRef.current.position.y = Math.cos(t * f * 1.2) * shake * 0.5;
    } else if (bodyRef.current) {
      bodyRef.current.position.x *= 0.8;
      bodyRef.current.position.y *= 0.8;
    }
    if (shaftRef.current) {
      shaftRef.current.rotation.x += (rpm / 60) * 2 * Math.PI * delta;
    }
    if (glowRef.current && heatIntens > 0) {
      glowRef.current.material.emissiveIntensity = heatIntens * (0.6 + 0.4 * Math.sin(t * 2.5));
    }
  });

  const BLK  = "#141618";
  const DGRY = "#1e2124";
  const MTL  = "#2c3035";
  const CHR  = "#8899aa";

  return (
    <group ref={bodyRef}>

      {/* ── Carcaça cilíndrica principal ── */}
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.72, 0.72, 2.7, 48]} />
        <meshStandardMaterial color={BLK} metalness={0.8} roughness={0.25} />
      </mesh>

      {/* ── Rasgos de ventilação horizontais — 8 fileiras ── */}
      {[-0.9,-0.65,-0.4,-0.15,0.1,0.35,0.6,0.85].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.735, 0.735, 0.04, 48]} />
          <meshStandardMaterial color="#0a0b0c" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}

      {/* ── Tampa DE (Drive End) ── */}
      <mesh position={[1.42, 0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.14, 40]} />
        <meshStandardMaterial color={DGRY} metalness={0.88} roughness={0.12} />
      </mesh>
      {/* Parafusos tampa DE */}
      {[0,1,2,3,4,5].map(i => (
        <mesh key={i} position={[
          1.5,
          0.55 * Math.sin(i * Math.PI / 3),
          0.55 * Math.cos(i * Math.PI / 3)
        ]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.07, 8]} />
          <meshStandardMaterial color={CHR} metalness={1} roughness={0.1} />
        </mesh>
      ))}

      {/* ── Tampa NDE ── */}
      <mesh position={[-1.42, 0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.14, 40]} />
        <meshStandardMaterial color={DGRY} metalness={0.88} roughness={0.12} />
      </mesh>
      {/* Grade NDE */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <mesh key={i} position={[
          -1.52,
          0.38 * Math.sin(i * Math.PI / 4),
          0.38 * Math.cos(i * Math.PI / 4)
        ]} rotation={[0, 0, Math.PI/2]}>
          <boxGeometry args={[0.05, 0.3, 0.04]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}

      {/* ── Eixo ── */}
      <mesh ref={shaftRef} position={[1.82, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.82, 24]} />
        <meshStandardMaterial color={CHR} metalness={0.98} roughness={0.04} />
      </mesh>
      <mesh position={[1.52, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.08, 24]} />
        <meshStandardMaterial color={MTL} metalness={0.92} roughness={0.1} />
      </mesh>

      {/* ── Polia ── */}
      <Pulley rpm={rpm} />

      {/* ── Ventilador NDE ── */}
      <FanBlades rpm={rpm} />

      {/* ── Pés / base ── */}
      {[[-0.82, -0.82], [0.82, -0.82]].map(([x, y], i) => (
        <group key={i} position={[x, y, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.22, 1.65]} />
            <meshStandardMaterial color={DGRY} metalness={0.7} roughness={0.4} />
          </mesh>
          {[-0.55, 0.55].map((z, j) => (
            <mesh key={j} position={[0, -0.04, z]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.055, 0.055, 0.52, 10]} />
              <meshStandardMaterial color="#080a0c" metalness={0.3} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── Caixa de bornes ── */}
      <mesh position={[0.15, 0.9, 0]} castShadow>
        <boxGeometry args={[0.72, 0.3, 0.56]} />
        <meshStandardMaterial color={DGRY} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0.15, 1.06, 0]}>
        <boxGeometry args={[0.68, 0.05, 0.52]} />
        <meshStandardMaterial color={BLK} metalness={0.75} roughness={0.25} />
      </mesh>

      {/* ── Módulo ESP32 ── */}
      <mesh position={[-0.45, 0.82, 0.56]} castShadow>
        <boxGeometry args={[0.34, 0.15, 0.22]} />
        <meshStandardMaterial color="#0a1830" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[-0.45, 0.76, 0.56]}>
        <cylinderGeometry args={[0.065, 0.065, 0.04, 14]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* ── LEDs ── */}
      <mesh position={[1.05, 0.72, 0.58]}>
        <sphereGeometry args={[0.048, 12, 12]} />
        <meshStandardMaterial color={ledColor} emissive={ledColor}
          emissiveIntensity={running ? 3 : 0.2} />
      </mesh>
      <mesh position={[-0.34, 0.88, 0.66]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshStandardMaterial color="#00aaff" emissive="#00aaff"
          emissiveIntensity={running ? 1.5 : 0.1} />
      </mesh>

      {/* ── Heat glow ── */}
      {heatIntens > 0 && (
        <mesh ref={glowRef} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.76, 0.76, 2.75, 48]} />
          <meshStandardMaterial color={heatColor} emissive={heatColor}
            emissiveIntensity={heatIntens} transparent opacity={0.07} depthWrite={false} />
        </mesh>
      )}

    </group>
  );
}

function Motor3DScene({ data, running }) {
  const temp   = data?.temp   ?? 45;
  const vibRMS = data?.vibRMS ?? 0.1;
  const rpm    = data?.rpm    ?? 0;
  const heatLightColor  = temp > 80 ? "#ff4400" : temp > 65 ? "#ff8800" : "#6080ff";
  const heatLightIntens = temp > 80 ? 3 : temp > 65 ? 1.5 : 0.4;

  return (
    <Canvas shadows camera={{ position: [5, 3, 5], fov: 40 }}
      style={{ background: "transparent" }}>
      <color attach="background" args={["#111620"]} />

      {/* Iluminação industrial forte */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[6, 8, 5]} intensity={2.5} castShadow
        shadow-mapSize={[1024, 1024]} color="#fff5e8" />
      <directionalLight position={[-5, 4, -4]} intensity={1.0} color="#a0c0ff" />
      <directionalLight position={[0, -3, 3]} intensity={0.5} color="#8090a0" />
      <pointLight position={[0, 3, 0]} intensity={heatLightIntens}
        color={heatLightColor} distance={6} />
      <spotLight position={[0, 5, 3]} intensity={1.5} color="#ffffff"
        angle={0.6} penumbra={0.5} castShadow />

      <Suspense fallback={null}>
        <MotorMesh temp={temp} vibRMS={vibRMS} rpm={rpm} running={running} />
      </Suspense>

      <OrbitControls enableZoom enablePan={false}
        minDistance={3} maxDistance={12}
        autoRotate={!running} autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 8} maxPolarAngle={Math.PI / 1.9} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#0d1117" metalness={0.2} roughness={0.95} />
      </mesh>
      <gridHelper args={[12, 24, "#1e2a38", "#131c26"]} position={[0, -1.09, 0]} />
    </Canvas>
  );
}


// Polia com raios girando
function Pulley({ rpm }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += (rpm / 60) * 2 * Math.PI * delta;
  });
  return (
    <group ref={ref} position={[1.82, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Aro externo */}
      <mesh>
        <torusGeometry args={[0.38, 0.055, 16, 48]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Cubo central */}
      <mesh>
        <cylinderGeometry args={[0.10, 0.10, 0.14, 24]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* 4 raios */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
          <boxGeometry args={[0.56, 0.04, 0.05]} />
          <meshStandardMaterial color="#1c1c1c" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* Canal da correia */}
      <mesh>
        <torusGeometry args={[0.38, 0.03, 8, 48]} />
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Ventilador traseiro girando
function FanBlades({ rpm }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += (rpm / 60) * 2 * Math.PI * delta;
  });
  return (
    <group ref={ref} position={[-1.52, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {[0,1,2,3,4,5].map(i => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}
              position={[0.19 * Math.cos((i * Math.PI) / 3), 0.19 * Math.sin((i * Math.PI) / 3), 0]}>
          <boxGeometry args={[0.18, 0.05, 0.03]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function MotorMesh({ temp = 30, vibRMS = 0.1, rpm = 0, running = false }) {
  const bodyRef   = useRef();
  const shaftRef  = useRef();
  const glowRef   = useRef();

  // Cores baseadas em temperatura
  const heatColor   = temp > 85 ? "#ff2d00" : temp > 70 ? "#ff7700" : temp > 55 ? "#ff4400" : "#222";
  const heatIntens  = temp > 85 ? 1.8 : temp > 70 ? 0.9 : temp > 55 ? 0.35 : 0;
  const ledColor    = temp > 85 ? "#ff2d55" : temp > 70 ? "#ffb830" : running ? "#00e676" : "#333";

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Vibração mecânica na carcaça
    if (bodyRef.current) {
      if (running && vibRMS > 0.2) {
        const shake = vibRMS * 0.009;
        const freq  = 40 + vibRMS * 8;
        bodyRef.current.position.x = Math.sin(t * freq)       * shake;
        bodyRef.current.position.y = Math.cos(t * freq * 1.3) * shake * 0.6;
        bodyRef.current.rotation.z = Math.sin(t * freq * 0.7) * shake * 0.015;
      } else {
        bodyRef.current.position.x  *= 0.85;
        bodyRef.current.position.y  *= 0.85;
        bodyRef.current.rotation.z  *= 0.85;
      }
    }

    // Eixo gira
    if (shaftRef.current) {
      shaftRef.current.rotation.x += (rpm / 60) * 2 * Math.PI * delta;
    }

    // Pulso de calor
    if (glowRef.current) {
      glowRef.current.material.emissiveIntensity =
        heatIntens * (0.7 + 0.3 * Math.sin(t * 3));
    }
  });

  const BLACK   = "#111213";
  const DARKGRAY = "#1c1e20";
  const METAL   = "#2a2e32";
  const CHROME  = "#8090a0";

  return (
    <group ref={bodyRef}>

      {/* ── Carcaça principal preta ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.8, 1.35, 1.35]} />
        <meshStandardMaterial color={BLACK} metalness={0.75} roughness={0.3} />
      </mesh>

      {/* ── Rasgos de ventilação horizontais (faces superior e inferior) ── */}
      {[-0.55, -0.3, -0.05, 0.2, 0.45].map((z, i) => (
        <group key={i}>
          {/* face superior */}
          <mesh position={[0, 0.685, z]}>
            <boxGeometry args={[2.6, 0.02, 0.06]} />
            <meshStandardMaterial color="#080a0c" metalness={0.6} roughness={0.5} />
          </mesh>
          {/* face inferior */}
          <mesh position={[0, -0.685, z]}>
            <boxGeometry args={[2.6, 0.02, 0.06]} />
            <meshStandardMaterial color="#080a0c" metalness={0.6} roughness={0.5} />
          </mesh>
          {/* face frontal */}
          <mesh position={[0, z * 0.5, 0.685]}>
            <boxGeometry args={[2.6, 0.06, 0.02]} />
            <meshStandardMaterial color="#080a0c" metalness={0.6} roughness={0.5} />
          </mesh>
          {/* face traseira */}
          <mesh position={[0, z * 0.5, -0.685]}>
            <boxGeometry args={[2.6, 0.06, 0.02]} />
            <meshStandardMaterial color="#080a0c" metalness={0.6} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* ── Tampa DE (Drive End) — lado da polia ── */}
      <mesh position={[1.52, 0, 0]} castShadow>
        <cylinderGeometry args={[0.66, 0.66, 0.12, 40]} />
        <meshStandardMaterial color={DARKGRAY} metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Parafusos tampa DE */}
      {[0,1,2,3,4,5].map(i => (
        <mesh key={i} position={[
          1.59,
          0.52 * Math.sin(i * Math.PI / 3),
          0.52 * Math.cos(i * Math.PI / 3)
        ]}>
          <cylinderGeometry args={[0.03, 0.03, 0.06, 8]} />
          <meshStandardMaterial color={CHROME} metalness={1} roughness={0.1} />
        </mesh>
      ))}

      {/* ── Tampa NDE (Non Drive End) — com ventilador ── */}
      <mesh position={[-1.52, 0, 0]} castShadow>
        <cylinderGeometry args={[0.66, 0.66, 0.12, 40]} />
        <meshStandardMaterial color={DARKGRAY} metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Grade de ventilação NDE */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <mesh key={i} position={[
          -1.59,
          0.35 * Math.sin(i * Math.PI / 4),
          0.35 * Math.cos(i * Math.PI / 4)
        ]}>
          <boxGeometry args={[0.04, 0.28, 0.03]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}

      {/* ── Eixo principal ── */}
      <mesh ref={shaftRef} position={[1.75, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.7, 24]} />
        <meshStandardMaterial color={CHROME} metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Ressalto do eixo */}
      <mesh position={[1.58, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.155, 0.155, 0.08, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── Polia ── */}
      <Pulley rpm={rpm} />

      {/* ── Ventilador NDE ── */}
      <FanBlades rpm={rpm} />

      {/* ── Caixa de bornes (terminal box) ── */}
      <mesh position={[0.2, 0.88, 0]} castShadow>
        <boxGeometry args={[0.75, 0.28, 0.55]} />
        <meshStandardMaterial color={DARKGRAY} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Tampa caixa bornes */}
      <mesh position={[0.2, 1.03, 0]}>
        <boxGeometry args={[0.7, 0.05, 0.5]} />
        <meshStandardMaterial color={BLACK} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Parafusos caixa */}
      {[[-0.28, 0.22], [0.28, 0.22], [-0.28, -0.22], [0.28, -0.22]].map(([x, z], i) => (
        <mesh key={i} position={[0.2 + x, 1.06, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.05, 8]} />
          <meshStandardMaterial color={CHROME} metalness={1} roughness={0.1} />
        </mesh>
      ))}

      {/* ── Módulo ESP32 sensor (azul) ── */}
      <mesh position={[-0.5, 0.78, 0.52]} castShadow>
        <boxGeometry args={[0.36, 0.16, 0.24]} />
        <meshStandardMaterial color="#0a1a3a" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Ímã do sensor */}
      <mesh position={[-0.5, 0.72, 0.52]}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 16]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* ── Plaqueta de identificação WEG ── */}
      <mesh position={[0, 0, 0.685]}>
        <planeGeometry args={[0.9, 0.35]} />
        <meshStandardMaterial color="#e8e0c8" metalness={0.1} roughness={0.8} />
      </mesh>

      {/* ── Pés / base ── */}
      {[[-0.85, -0.95], [0.85, -0.95]].map(([x, y], i) => (
        <group key={i} position={[x, y, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.2, 1.6]} />
            <meshStandardMaterial color={DARKGRAY} metalness={0.6} roughness={0.5} />
          </mesh>
          {/* furos de fixação */}
          {[-0.52, 0.52].map((z, j) => (
            <mesh key={j} position={[0, -0.05, z]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.56, 12]} />
              <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── LED status ── */}
      <mesh position={[1.1, 0.72, 0.65]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial
          color={ledColor}
          emissive={ledColor}
          emissiveIntensity={running ? 2.5 : 0.2}
        />
      </mesh>

      {/* ── Brilho de calor (heat glow) sobre a carcaça ── */}
      <mesh ref={glowRef}>
        <boxGeometry args={[2.85, 1.42, 1.42]} />
        <meshStandardMaterial
          color={heatColor}
          emissive={heatColor}
          emissiveIntensity={heatIntens}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

    </group>
  );
}

function Motor3DScene({ data, running }) {
  const temp   = data?.temp   ?? 45;
  const vibRMS = data?.vibRMS ?? 0.1;
  const rpm    = data?.rpm    ?? 0;

  // Cor da luz pontual muda com temperatura
  const heatLight = temp > 80 ? "#ff4400" : temp > 65 ? "#ff8800" : "#204060";
  const heatLightIntens = temp > 80 ? 2.5 : temp > 65 ? 1.2 : 0.3;

  return (
    <Canvas
      shadows
      camera={{ position: [4.5, 2.8, 4.5], fov: 42 }}
      style={{ background: "transparent" }}
    >
      <color attach="background" args={["#0a0f14"]} />
      <fog attach="fog" args={["#0a0f14", 10, 30]} />

      {/* Iluminação industrial */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 6]} intensity={1.4} castShadow
        shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-4, 3, -3]} intensity={0.3} color="#4060a0" />
      {/* Luz de calor — muda com temperatura */}
      <pointLight position={[0, 2.5, 0]} intensity={heatLightIntens}
        color={heatLight} distance={5} />
      {/* Rim light industrial */}
      <spotLight position={[-5, 4, -4]} intensity={0.6} color="#2040a0"
        angle={0.5} penumbra={0.8} />

      <Suspense fallback={null}>
        <MotorMesh temp={temp} vibRMS={vibRMS} rpm={rpm} running={running} />
      </Suspense>

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={3}
        maxDistance={12}
        autoRotate={!running}
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.8}
      />

      {/* Piso industrial */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.08, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#0d1117" metalness={0.3} roughness={0.9} />
      </mesh>
      <gridHelper args={[10, 20, "#1a2535", "#111820"]} position={[0, -1.07, 0]} />
    </Canvas>
  );
}

/* ═══════════════════════════════════════════
   TEMA CLARO INDUSTRIAL
═══════════════════════════════════════════ */
const C = {
  bg: "#0f6f6a",
  bg2: "#1d8b84",
  panel: "#d9e6df",
  panelHi: "#c7d8cf",
  border: "#5e7f79",
  borderHi: "#3f5f59",

  blue: "#2f6fb2",
  teal: "#2f9f88",
  orange: "#d98324",
  red: "#c93d32",
  amber: "#d8b11e",
  green: "#7fd36a",

  dim: "#35534f",
  dimmer: "#5d7a74",
  white: "#1c2b29",
  grid: "#b8cbc4",
};

const M = "'Azeret Mono','Courier New',monospace";
const U = "'DM Sans','Segoe UI',sans-serif";

const TT = {
  background: C.panel,
  border: `1px solid ${C.borderHi}`,
  borderRadius: 6,
  fontSize: 10,
  color: C.white,
  fontFamily: M,
  padding: "6px 10px",
  boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
};

const LIM = {
  vib: { w: 4.5, c: 7.1 },
  temp: { w: 75, c: 85 },
};

const STORAGE_KEY = "smartmotor-light-industrial-v1";

// "sim" → simulação local | "ws" → WebSocket backend
const DATA_SOURCE = "ws";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws";

/* ═══════════════════════════════════════════
   SIMULAÇÃO
═══════════════════════════════════════════ */
const rnd = (s) => (Math.random() - 0.5) * 2 * s;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let _tick = 0;

function simTick(prev, degrad, running, freqSP) {
  _tick++;

  if (!running) {
    return prev
      ? {
          ...prev,
          ax: 0,
          ay: 0,
          az: 0,
          vibRMS: 0,
          rpm: 0,
          freq: 0,
          t: new Date().toLocaleTimeString("pt-BR"),
          tick: _tick,
        }
      : null;
  }

  const d = degrad / 100;
  const loadFactor = clamp((freqSP - 30) / 30, 0, 1);
  const spike = Math.random() < 0.05 ? 0.35 + 0.7 * d : 0;

  const temp = prev
    ? clamp(prev.temp + rnd(0.18) + 0.02 * d + 0.01 * loadFactor, 28, 98)
    : 44 + d * 16 + loadFactor * 8;

  const ax = prev
    ? clamp(prev.ax + rnd(0.03) + 0.015 * d + spike, 0.02, 6)
    : 0.7 + d * 1.6 + loadFactor * 0.4;

  const ay = prev
    ? clamp(prev.ay + rnd(0.03) + 0.014 * d + spike * 0.9, 0.02, 6)
    : 0.8 + d * 1.5 + loadFactor * 0.35;

  const az = prev
    ? clamp(prev.az + rnd(0.04) + 0.018 * d + spike * 1.1, 0.02, 6)
    : 1.0 + d * 1.9 + loadFactor * 0.45;

  const vibRMS = +Math.sqrt((ax ** 2 + ay ** 2 + az ** 2) / 3).toFixed(3);

  const freq = +freqSP.toFixed(1);
  const rpm = +(freq * (3475 / 60)).toFixed(0);
  const hours = prev ? +(prev.hours + 0.000556).toFixed(3) : 1248.5 + d * 180;
  const bat = prev ? clamp(prev.bat - 0.001, 0, 100) : 84.2;

  const sVib = Math.max(0, 60 * (1 - clamp(vibRMS / LIM.vib.c, 0, 1)));
  const sTemp = Math.max(0, 40 * (1 - clamp((temp - 35) / 50, 0, 1)));
  const score = Math.round(sVib + sTemp);

  const t = new Date().toLocaleTimeString("pt-BR");

  return { temp, ax, ay, az, vibRMS, rpm, freq, hours, bat, score, t, tick: _tick };
}

function motorStatus(d) {
  if (!d || d.rpm === 0) return "PARADO";
  if (d.temp >= LIM.temp.c || d.vibRMS >= LIM.vib.c) return "CRÍTICO";
  if (d.temp >= LIM.temp.w || d.vibRMS >= LIM.vib.w) return "ALERTA";
  return "NORMAL";
}

function gc(v, lim) {
  return v >= lim.c ? C.red : v >= lim.w ? C.amber : C.teal;
}

function exportAlertsToCSV(alerts) {
  const headers = ["tipo", "horario", "mensagem"];
  const rows = alerts.map((a) => [a.type, a.t, a.msg]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `smartmotor-alertas-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════
   BASE UI
═══════════════════════════════════════════ */
function Fonts() {
  useEffect(() => {
    if (!document.getElementById("pb2-fonts")) {
      const l = document.createElement("link");
      l.id = "pb2-fonts";
      l.rel = "stylesheet";
      l.href =
        "https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@300;400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(l);
    }

    Object.assign(document.body.style, {
      margin: 0,
      padding: 0,
      background: C.bg,
    });
  }, []);

  return null;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={TT}>
      <div style={{ fontSize: 9, color: C.dim, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: p.color,
              display: "inline-block",
            }}
          />
          <span style={{ fontFamily: M, fontSize: 9 }}>
            {p.name}: {Number(p.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniVal({ label, value, unit, color }) {
  return (
    <div style={{ textAlign: "center", minWidth: 64 }}>
      <div style={{ fontFamily: M, fontSize: 15, fontWeight: 700, color: color || C.white, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginTop: 2 }}>{unit}</div>
      <div
        style={{
          fontFamily: U,
          fontSize: 8,
          color: C.dimmer,
          marginTop: 1,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function TileKPI({ label, value, unit, color, sub, norm, small }) {
  return (
    <div
      style={{
        background: C.panel,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color || C.blue}`,
        padding: small ? "10px 12px" : "13px 15px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 18px rgba(19,31,45,0.05)",
      }}
    >
      {norm && (
        <span
          style={{
            position: "absolute",
            top: 5,
            right: 7,
            fontFamily: M,
            fontSize: 7,
            color: C.dimmer,
          }}
        >
          {norm}
        </span>
      )}
      <div
        style={{
          fontFamily: U,
          fontSize: 8,
          color: C.dim,
          textTransform: "uppercase",
          letterSpacing: "0.13em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: M,
          fontSize: small ? 20 : 24,
          fontWeight: 700,
          color: color || C.white,
          lineHeight: 1,
        }}
      >
        {value}
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim, marginLeft: 3 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ label, color, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 3, height: 16, background: color || C.blue, borderRadius: 2 }} />
      <span
        style={{
          fontFamily: U,
          fontSize: 10,
          fontWeight: 700,
          color: C.white,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {icon && <span style={{ marginRight: 5 }}>{icon}</span>}
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MOTOR SVG
═══════════════════════════════════════════ */
function MotorSVG({ status, running, onClick }) {
  const col = status === "CRÍTICO" ? C.red : status === "ALERTA" ? C.amber : status === "NORMAL" ? C.teal : C.dim;
  const bodyCol = running ? "#dde7f0" : "#e6ebf1";
  const shaftCol = running ? "#b8c8d8" : "#d1dbe4";

  return (
    <svg
      viewBox="0 0 420 220"
      style={{ width: "100%", maxWidth: 420, cursor: "pointer", display: "block" }}
      onClick={onClick}
    >
      <rect width="420" height="220" fill="transparent" />

      <rect x="68" y="162" width="50" height="18" rx="3" fill="#cfd8e2" stroke={C.borderHi} strokeWidth="1" />
      <rect x="302" y="162" width="50" height="18" rx="3" fill="#cfd8e2" stroke={C.borderHi} strokeWidth="1" />

      <rect x="70" y="48" width="280" height="120" rx="14" fill={bodyCol} stroke={C.borderHi} strokeWidth="1.5" />

      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={84 + i * 24} y="48" width="2" height="120" fill="#b7c5d4" opacity="0.9" />
      ))}

      <rect x="44" y="58" width="28" height="100" rx="6" fill={shaftCol} stroke={C.borderHi} strokeWidth="1" />
      <ellipse cx="58" cy="108" rx="10" ry="38" fill={bodyCol} stroke={C.borderHi} strokeWidth="0.8" />

      <rect x="348" y="58" width="28" height="100" rx="6" fill={shaftCol} stroke={C.borderHi} strokeWidth="1" />
      <ellipse cx="362" cy="108" rx="10" ry="38" fill={bodyCol} stroke={C.borderHi} strokeWidth="0.8" />

      <rect x="376" y="101" width="36" height="14" rx="4" fill="#9fb2c6" stroke={C.borderHi} strokeWidth="1" />

      <rect x="154" y="22" width="88" height="30" rx="5" fill="#d8e2ec" stroke={C.borderHi} strokeWidth="1.2" />

      <rect x="92" y="56" width="72" height="24" rx="5" fill="#dce8f6" stroke={C.blue} strokeWidth="1.2" />
      <text x="128" y="66" textAnchor="middle" fill={C.blue} fontSize="7" fontFamily={U} fontWeight="700">
        VIBRAÇÃO
      </text>
      <text x="128" y="76" textAnchor="middle" fill={C.dim} fontSize="6.2" fontFamily={M}>
        SENSOR 3 EIXOS
      </text>

      <rect x="248" y="56" width="72" height="24" rx="5" fill="#fff0dd" stroke={C.orange} strokeWidth="1.2" />
      <text x="284" y="66" textAnchor="middle" fill={C.orange} fontSize="7" fontFamily={U} fontWeight="700">
        TEMPERATURA
      </text>
      <text x="284" y="76" textAnchor="middle" fill={C.dim} fontSize="6.2" fontFamily={M}>
        SENSOR RTD
      </text>

      <rect x="110" y="92" width="200" height="46" rx="4" fill="#f9fbfd" stroke={col} strokeWidth="1" />
      <text x="210" y="110" textAnchor="middle" fill={col} fontSize="10" fontFamily={U} fontWeight="700">
        MONITORAMENTO OPERACIONAL
      </text>
      <text x="210" y="124" textAnchor="middle" fill={C.dim} fontSize="8" fontFamily={M}>
        MOTOR WEG 3HP · CFW500 · TM221
      </text>
      <text x="210" y="136" textAnchor="middle" fill={C.dimmer} fontSize="7.5" fontFamily={M}>
        TEMPERATURA + VIBRAÇÃO
      </text>

      <circle cx="390" cy="62" r="7" fill={col} stroke={col} strokeWidth="1" />
      <text x="390" y="82" textAnchor="middle" fill={C.dim} fontSize="7" fontFamily={M}>
        STATUS
      </text>

    </svg>
  );
}

function TelemetryPanel({ d, hist }) {
  const vibC = d ? gc(d.vibRMS, LIM.vib) : C.dim;
  const tempC = d ? gc(d.temp, LIM.temp) : C.dim;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <SectionLabel label="Telemetria Operacional" color={C.teal} icon="◈" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <TileKPI small label="Temperatura da Carcaça" value={d?.temp?.toFixed(1) || "--"} unit="°C" color={tempC} norm="RTD" sub={`Atenção ${LIM.temp.w} / Crítico ${LIM.temp.c}`} />
        <TileKPI small label="Vibração Global" value={d?.vibRMS?.toFixed(2) || "--"} unit="g" color={vibC} norm="3 eixos" sub={`Atenção ${LIM.vib.w} / Crítico ${LIM.vib.c}`} />
        <TileKPI small label="Condição do Ativo" value={d?.score || "--"} unit="/100" color={d ? (d.score > 70 ? C.green : d.score > 40 ? C.amber : C.red) : C.dim} />
        <TileKPI small label="Frequência do Inversor" value={d?.freq?.toFixed(1) || "--"} unit="Hz" color={C.blue} sub="referência operacional" />
      </div>

      <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Tendência Térmica
        </div>
        <ResponsiveContainer width="100%" height={95}>
          <AreaChart data={hist.slice(-30)}>
            <defs>
              <linearGradient id="gtemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.orange} stopOpacity={0.22} />
                <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
            <XAxis dataKey="t" tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} width={22} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={LIM.temp.w} stroke={C.amber} strokeDasharray="3 2" strokeWidth={0.8} />
            <ReferenceLine y={LIM.temp.c} stroke={C.red} strokeDasharray="3 2" strokeWidth={0.8} />
            <Area type="monotone" dataKey="temp" name="Temperatura" stroke={C.orange} fill="url(#gtemp)" dot={false} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Tendência Vibracional
        </div>
        <ResponsiveContainer width="100%" height={95}>
          <AreaChart data={hist.slice(-30)}>
            <defs>
              <linearGradient id="gvib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.blue} stopOpacity={0.22} />
                <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
            <XAxis dataKey="t" tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} width={22} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={LIM.vib.w} stroke={C.amber} strokeDasharray="3 2" strokeWidth={0.8} />
            <ReferenceLine y={LIM.vib.c} stroke={C.red} strokeDasharray="3 2" strokeWidth={0.8} />
            <Area type="monotone" dataKey="vibRMS" name="Vibração" stroke={C.blue} fill="url(#gvib)" dot={false} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Leitura por Eixo
        </div>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <MiniVal label="Eixo X" value={d?.ax?.toFixed(2) || "--"} unit="g" color={C.blue} />
          <MiniVal label="Eixo Y" value={d?.ay?.toFixed(2) || "--"} unit="g" color="#6d7f91" />
          <MiniVal label="Eixo Z" value={d?.az?.toFixed(2) || "--"} unit="g" color={C.teal} />
          <MiniVal label="RPM" value={d?.rpm?.toFixed(0) || "--"} unit="rpm" color={C.dim} />
        </div>
      </div>
    </div>
  );
}

function AlertPanel({ alerts, d, onExport }) {
  const sC = d ? (d.score > 70 ? C.green : d.score > 40 ? C.amber : C.red) : C.dim;
  const crits = alerts.filter((a) => a.type === "CRIT").length;
  const warns = alerts.filter((a) => a.type === "WARN").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <SectionLabel label="Diagnóstico Técnico" color={C.red} icon="▲" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {[
          ["Críticos", crits, C.red],
          ["Alertas", warns, C.amber],
          ["Saúde", d?.score || "--", sC],
        ].map(([lbl, val, col]) => (
          <div
            key={lbl}
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${col}`,
              borderRadius: 8,
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: M, fontSize: 16, fontWeight: 700, color: col }}>{val}</div>
            <div style={{ fontFamily: U, fontSize: 8, color: C.dim, textTransform: "uppercase", marginTop: 2 }}>
              {lbl}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: C.panel,
          borderRadius: 8,
          padding: "12px 14px",
          border: `1px solid ${C.borderHi}`,
          borderLeft: `3px solid ${sC}`,
        }}
      >
        <div
          style={{
            fontFamily: U,
            fontSize: 9,
            fontWeight: 700,
            color: sC,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          Diagnóstico Operacional
        </div>

        {d ? (
          [
            [
              "Térmico",
              d.temp < LIM.temp.w ? "Faixa nominal" : d.temp < LIM.temp.c ? "Elevação térmica" : "Sobreaquecimento",
              d.temp < LIM.temp.w ? C.green : d.temp < LIM.temp.c ? C.amber : C.red,
            ],
            [
              "Mecânico",
              d.vibRMS < 2.8 ? "Estável" : d.vibRMS < LIM.vib.w ? "Vibração crescente" : "Vibração crítica",
              d.vibRMS < 2.8 ? C.green : d.vibRMS < LIM.vib.w ? C.amber : C.red,
            ],
            [
              "Tendência",
              d.score > 70 ? "Operação confiável" : d.score > 40 ? "Requer observação" : "Intervenção recomendada",
              sC,
            ],
            ["Previsão", `~${d.score > 70 ? ">180" : d.score > 40 ? "30–60" : "<15"} dias estimados`, sC],
          ].map(([lbl, val, col]) => (
            <div
              key={lbl}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4px 0",
                borderBottom: `1px solid ${C.grid}`,
              }}
            >
              <span style={{ fontFamily: U, fontSize: 8, color: C.dim }}>{lbl}</span>
              <span style={{ fontFamily: M, fontSize: 8, fontWeight: 600, color: col }}>{val}</span>
            </div>
          ))
        ) : (
          <div style={{ fontFamily: M, fontSize: 9, color: C.dim }}>Ativo offline</div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onExport}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            background: C.blue + "12",
            color: C.blue,
            border: `1px solid ${C.blue}55`,
            cursor: "pointer",
            fontFamily: M,
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          EXPORTAR CSV
        </button>
      </div>

      <div
        style={{
          background: C.panel,
          borderRadius: 8,
          padding: "10px 12px",
          border: `1px solid ${C.border}`,
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 200,
        }}
      >
        <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Registro de Eventos
        </div>
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          {alerts.slice(0, 18).map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "flex-start",
                padding: "4px 6px",
                borderRadius: 3,
                background: a.type === "CRIT" ? "#fff3f3" : a.type === "WARN" ? "#fff8e7" : "#edf5ff",
                borderLeft: `2px solid ${a.c}`,
              }}
            >
              <span style={{ fontFamily: M, fontSize: 7, color: C.dim, minWidth: 56, flexShrink: 0, marginTop: 1 }}>{a.t}</span>
              <span style={{ fontFamily: M, fontSize: 7.5, color: C.white, lineHeight: 1.4 }}>{a.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ d, running, motorMode }) {
  const st = running ? motorStatus(d) : "PARADO";
  const col = st === "CRÍTICO" ? C.red : st === "ALERTA" ? C.amber : st === "NORMAL" ? C.green : C.dim;

  return (
    <div
      style={{
        background: C.panel,
        borderTop: `1px solid ${C.border}`,
        padding: "7px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: M, fontSize: 9, color: col, fontWeight: 700 }}>● {st}</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.freq?.toFixed(1) || "0.0"} Hz</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.rpm?.toFixed(0) || "0"} RPM</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.temp?.toFixed(1) || "–"}°C</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.vibRMS?.toFixed(2) || "–"} g</span>
        <span style={{ fontFamily: M, fontSize: 9, color: C.dim }}>{d?.hours?.toFixed(1) || "–"}h</span>
        <span style={{ fontFamily: M, fontSize: 9, color: motorMode === "MANUTENÇÃO" ? C.orange : C.dimmer }}>
          MODO: {motorMode}
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontFamily: M, fontSize: 8, color: C.dim }}>BATERIA {d?.bat?.toFixed(0) || "–"}%</span>
        <span style={{ fontFamily: M, fontSize: 8, color: C.dim }}>RTD ● SENSOR 3 EIXOS ● ESP32</span>
        <span style={{ fontFamily: M, fontSize: 8, color: C.dimmer }}>PAINEL OPERACIONAL</span>
      </div>
    </div>
  );
}

function MotorControlModal({
  d,
  motorMode,
  setMotorMode,
  running,
  setRunning,
  freqSP,
  setFreqSP,
  ramp,
  setRamp,
  degrad,
  setDegrad,
  onClose,
}) {
  const status = motorMode === "MANUTENÇÃO" ? "MANUTENÇÃO" : motorStatus(d);
  const statusCol = status === "CRÍTICO" ? C.red : status === "ALERTA" ? C.amber : status === "NORMAL" ? C.green : C.orange;
  const [activeTab, setActiveTab] = useState("controle");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(80,95,110,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.bg2,
          border: `1px solid ${C.borderHi}`,
          borderTop: `3px solid ${statusCol}`,
          borderRadius: 10,
          width: "100%",
          maxWidth: 760,
          boxShadow: "0 16px 34px rgba(16,24,40,0.12)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background: C.panel,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div>
            <div style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: C.white }}>PAINEL DE CONTROLE OPERACIONAL</div>
            <div style={{ fontFamily: M, fontSize: 8, color: C.dim }}>MOTOR WEG 3HP · CFW500 · TM221 · ESP32</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              color: C.dim,
              cursor: "pointer",
              fontFamily: M,
              fontSize: 11,
              width: 28,
              height: 28,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.panel, flexWrap: "wrap" }}>
          {[
            ["controle", "CONTROLE"],
            ["partida", "PARTIDA/PARADA"],
            ["manutencao", "MANUTENÇÃO"],
            ["horas", "HORÍMETRO"],
          ].map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: "9px 16px",
                border: "none",
                background: "transparent",
                borderBottom: `2px solid ${activeTab === id ? C.blue : "transparent"}`,
                color: activeTab === id ? C.blue : C.dim,
                fontFamily: U,
                fontSize: 10,
                fontWeight: activeTab === id ? 700 : 500,
                cursor: "pointer",
                letterSpacing: "0.07em",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ padding: "18px 20px", overflowY: "auto" }}>
          {activeTab === "controle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
                <TileKPI small label="Temperatura" value={d?.temp?.toFixed(1) || "--"} unit="°C" color={d ? gc(d.temp, LIM.temp) : C.dim} />
                <TileKPI small label="Vibração Global" value={d?.vibRMS?.toFixed(2) || "--"} unit="g" color={d ? gc(d.vibRMS, LIM.vib) : C.dim} />
                <TileKPI small label="Eixos" value={d ? `${d.ax.toFixed(1)} / ${d.ay.toFixed(1)} / ${d.az.toFixed(1)}` : "--"} unit="g" color={C.blue} />
                <TileKPI small label="Saúde" value={d?.score || "--"} unit="/100" color={d ? (d.score > 70 ? C.green : d.score > 40 ? C.amber : C.red) : C.dim} />
              </div>

              <div style={{ background: C.panel, borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontFamily: U, fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Frequência de Operação
                  </div>
                  <div style={{ fontFamily: M, fontSize: 20, fontWeight: 700, color: C.blue }}>
                    {freqSP} <span style={{ fontSize: 11, color: C.dim }}>Hz</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="30"
                  max="60"
                  step="0.5"
                  value={freqSP}
                  onChange={(e) => setFreqSP(+e.target.value)}
                  disabled={motorMode === "MANUTENÇÃO"}
                  style={{ width: "100%", accentColor: C.blue }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                <div style={{ background: C.panel, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: U, fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    Rampa
                  </div>
                  <div style={{ fontFamily: M, fontSize: 18, fontWeight: 700, color: C.orange }}>{ramp}s</div>
                  <input type="range" min="1" max="30" step="1" value={ramp} onChange={(e) => setRamp(+e.target.value)} style={{ width: "100%", accentColor: C.orange, marginTop: 6 }} />
                </div>

                <div style={{ background: C.panel, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: U, fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    Degradação Simulada
                  </div>
                  <div style={{ fontFamily: M, fontSize: 18, fontWeight: 700, color: degrad > 70 ? C.red : degrad > 40 ? C.amber : C.green }}>
                    {degrad}%
                  </div>
                  <input type="range" min="0" max="100" step="1" value={degrad} onChange={(e) => setDegrad(+e.target.value)} style={{ width: "100%", accentColor: degrad > 70 ? C.red : degrad > 40 ? C.amber : C.green, marginTop: 6 }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "partida" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Preset de rampa — configurar ANTES de ligar */}
              <div style={{ background: C.panel, borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontFamily: U, fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Rampa de Aceleração
                  </div>
                  <div style={{ fontFamily: M, fontSize: 20, fontWeight: 700, color: C.orange }}>
                    {ramp}s
                  </div>
                </div>
                {/* Presets rápidos */}
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[
                    [3,  "Rápida"],
                    [5,  "Normal"],
                    [10, "Suave"],
                    [20, "Lenta"],
                    [30, "Muito lenta"],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setRamp(val)}
                      disabled={motorMode === "MANUTENÇÃO"}
                      style={{
                        flex: 1,
                        padding: "6px 4px",
                        borderRadius: 5,
                        cursor: motorMode === "MANUTENÇÃO" ? "not-allowed" : "pointer",
                        fontFamily: M,
                        fontSize: 8,
                        fontWeight: ramp === val ? 700 : 400,
                        color:      ramp === val ? C.orange : C.dim,
                        background: ramp === val ? "#fff6e8" : C.panelHi,
                        border:    `1px solid ${ramp === val ? C.orange : C.border}`,
                        opacity: motorMode === "MANUTENÇÃO" ? 0.4 : 1,
                      }}
                    >
                      {val}s<br/>
                      <span style={{ fontSize: 7, fontWeight: 400 }}>{label}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="range" min="1" max="30" step="1" value={ramp}
                  onChange={(e) => setRamp(+e.target.value)}
                  disabled={motorMode === "MANUTENÇÃO"}
                  style={{ width: "100%", accentColor: C.orange }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: M, fontSize: 7, color: C.dimmer, marginTop: 3 }}>
                  <span>1s (mín)</span><span>15s</span><span>30s (máx)</span>
                </div>
              </div>

              {/* Botões partida / parada */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              <button
                onClick={() => {
                  if (motorMode !== "MANUTENÇÃO") setRunning(true);
                }}
                style={{
                  padding: "24px",
                  borderRadius: 8,
                  cursor: motorMode === "MANUTENÇÃO" ? "not-allowed" : "pointer",
                  fontFamily: M,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.green,
                  background: "#eefaf4",
                  border: `2px solid ${C.green}`,
                  opacity: motorMode === "MANUTENÇÃO" ? 0.4 : 1,
                }}
              >
                PARTIDA
              </button>

              <button
                onClick={() => setRunning(false)}
                style={{
                  padding: "24px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: M,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.red,
                  background: "#fff3f3",
                  border: `2px solid ${C.red}`,
                }}
              >
                PARADA
              </button>
            </div>
            </div>
          )}

          {activeTab === "manutencao" && (
            <div style={{ background: C.panel, borderRadius: 8, padding: "16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: U, fontSize: 11, fontWeight: 700, color: C.white, marginBottom: 8 }}>
                Bloqueio de Operação para Inspeção
              </div>
              <button
                onClick={() => {
                  if (motorMode === "MANUTENÇÃO") {
                    setMotorMode("AUTO");
                  } else {
                    setMotorMode("MANUTENÇÃO");
                    setRunning(false);
                  }
                }}
                style={{
                  padding: "8px 18px",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontFamily: M,
                  fontSize: 10,
                  fontWeight: 700,
                  color: motorMode === "MANUTENÇÃO" ? C.green : C.orange,
                  background: motorMode === "MANUTENÇÃO" ? "#eefaf4" : "#fff6e8",
                  border: `1px solid ${motorMode === "MANUTENÇÃO" ? C.green : C.orange}`,
                }}
              >
                {motorMode === "MANUTENÇÃO" ? "LIBERAR OPERAÇÃO" : "ATIVAR MANUTENÇÃO"}
              </button>
            </div>
          )}

          {activeTab === "horas" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
              <TileKPI small label="Horas totais" value={d ? d.hours.toFixed(1) : "--"} unit="h" color={C.blue} />
              <TileKPI small label="Desde a manutenção" value={d ? (d.hours % 500).toFixed(1) : "--"} unit="h" color={C.teal} />
              <TileKPI small label="Próxima manutenção" value={d ? Math.max(0, 500 - (d.hours % 500)).toFixed(0) : "--"} unit="h" color={C.amber} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CenterPanel({
  st,
  running,
  motorMode,
  setMotorMode,
  setRunning,
  freqSP,
  setFreqSP,
  degrad,
  hist,
  setModalOpen,
  compact = false,
  live,
}) {
  const [show3D, setShow3D] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: compact ? "18px 12px 8px" : "24px 28px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {show3D ? (
          <div style={{ width: "100%", height: 340, borderRadius: 10, overflow: "hidden", background: C.panelHi, border: `1px solid ${C.border}` }}>
            <Motor3DScene data={live} running={running} />
          </div>
        ) : (
          <MotorSVG status={st} running={running} onClick={() => setModalOpen(true)} />
        )}
      </div>

      <div style={{ padding: compact ? "4px 12px 12px" : "4px 28px 12px", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => setShow3D(v => !v)}
          style={{
            padding: "8px 16px", borderRadius: 6, cursor: "pointer",
            fontFamily: M, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
            color:      show3D ? C.teal : C.dim,
            background: show3D ? `${C.teal}18` : C.panel,
            border:    `1px solid ${show3D ? C.teal : C.border}`,
          }}
        >
          ⬡ 3D
        </button>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: M,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: C.blue,
            background: "#edf5ff",
            border: `1px solid ${C.blue}55`,
          }}
        >
          PAINEL DE CONTROLE
        </button>

        <button
          onClick={() => {
            if (motorMode !== "MANUTENÇÃO") setRunning((v) => !v);
          }}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: M,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: running ? C.red : C.green,
            background: running ? "#fff3f3" : "#eefaf4",
            border: `1px solid ${running ? C.red : C.green}55`,
            opacity: motorMode === "MANUTENÇÃO" ? 0.4 : 1,
          }}
        >
          {running ? "PARAR" : "LIGAR"}
        </button>

        <button
          onClick={() => {
            if (motorMode === "MANUTENÇÃO") {
              setMotorMode("AUTO");
            } else {
              setMotorMode("MANUTENÇÃO");
              setRunning(false);
            }
          }}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: M,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: motorMode === "MANUTENÇÃO" ? C.orange : C.dim,
            background: motorMode === "MANUTENÇÃO" ? "#fff6e8" : C.panel,
            border: `1px solid ${motorMode === "MANUTENÇÃO" ? C.orange : C.border}`,
          }}
        >
          MANUTENÇÃO
        </button>
      </div>

      <div style={{ padding: compact ? "4px 12px 14px" : "4px 18px 14px", display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 10 }}>
        <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Índice de Saúde
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={hist.slice(-30)}>
              <defs>
                <linearGradient id="gscore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
              <XAxis dataKey="t" tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} width={20} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={40} stroke={C.amber} strokeDasharray="3 2" strokeWidth={0.8} />
              <Area type="monotone" dataKey="score" name="Saúde" stroke={C.green} fill="url(#gscore)" dot={false} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: M, fontSize: 8, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Vibração por Eixo
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={hist.slice(-30)}>
              <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
              <XAxis dataKey="t" tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 6, fill: C.dim, fontFamily: M }} width={22} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ax" name="Eixo X" stroke={C.blue} dot={false} strokeWidth={1.4} />
              <Line type="monotone" dataKey="ay" name="Eixo Y" stroke="#6d7f91" dot={false} strokeWidth={1.4} />
              <Line type="monotone" dataKey="az" name="Eixo Z" stroke={C.teal} dot={false} strokeWidth={1.4} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ padding: compact ? "0 12px 18px" : "0 18px 18px" }}>
        <div
          style={{
            background: C.panel,
            borderRadius: 8,
            padding: "12px 16px",
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ fontFamily: U, fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", minWidth: 110 }}>
            Frequência do Inversor
          </div>
          <input
            type="range"
            min="30"
            max="60"
            step="0.5"
            value={freqSP}
            onChange={(e) => setFreqSP(+e.target.value)}
            style={{ flex: 1, accentColor: C.blue }}
            disabled={motorMode === "MANUTENÇÃO"}
          />
          <div style={{ fontFamily: M, fontSize: 18, fontWeight: 700, color: C.blue, minWidth: 64 }}>
            {freqSP} <span style={{ fontSize: 10, color: C.dim }}>Hz</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const defaultAlerts = [
  { type: "SYS", msg: "Painel operacional iniciado", t: new Date().toLocaleTimeString("pt-BR"), c: C.blue },
  { type: "SYS", msg: "Sensoriamento térmico e vibracional ativo", t: new Date().toLocaleTimeString("pt-BR"), c: C.green },
  { type: "SYS", msg: "CLP e inversor em modo bancada", t: new Date().toLocaleTimeString("pt-BR"), c: C.teal },
  { type: "SYS", msg: "Monitoramento de condição pronto", t: new Date().toLocaleTimeString("pt-BR"), c: C.blue },
];

export default function App() {
  const [live, setLive] = useState(null);
  const [hist, setHist] = useState([]);
  const [running, setRunning] = useState(true);
  const [motorMode, setMotorMode] = useState("AUTO");
  const [freqSP, setFreqSP] = useState(60);
  const [ramp, setRamp] = useState(5);
  const [degrad, setDegrad] = useState(30);
  const [modalOpen, setModalOpen] = useState(false);
  const [alerts, setAlerts] = useState(defaultAlerts);
  const [screen, setScreen] = useState(typeof window !== "undefined" ? window.innerWidth : 1400);
  const [wsConnected, setWsConnected] = useState(false);

  const prev  = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setRunning(parsed.running ?? true);
      setMotorMode(parsed.motorMode ?? "AUTO");
      setFreqSP(parsed.freqSP ?? 60);
      setRamp(parsed.ramp ?? 5);
      setDegrad(parsed.degrad ?? 30);
      setAlerts(parsed.alerts?.length ? parsed.alerts : defaultAlerts);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        running,
        motorMode,
        freqSP,
        ramp,
        degrad,
        alerts: alerts.slice(0, 100),
      })
    );
  }, [running, motorMode, freqSP, ramp, degrad, alerts]);

  useEffect(() => {
    const onResize = () => setScreen(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── WebSocket — dados ao vivo do backend ─────────────────────────────────
  useEffect(() => {
    if (DATA_SOURCE !== "ws") return;
    let reconnectTimer = null;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setAlerts(a => [{
          type: "SYS", msg: "WebSocket conectado — dados ao vivo do backend",
          t: new Date().toLocaleTimeString("pt-BR"), c: C.teal,
        }, ...a].slice(0, 200));
      };

      ws.onmessage = (evt) => {
        try {
          const raw = JSON.parse(evt.data);
          const d = {
            temp:   raw.temp   ?? raw.temperatura   ?? 0,
            ax:     raw.ax     ?? raw.vibration_x   ?? 0,
            ay:     raw.ay     ?? raw.vibration_y   ?? 0,
            az:     raw.az     ?? raw.vibration_z   ?? 0,
            vibRMS: raw.vibRMS ?? raw.vibration_rms ?? 0,
            freq:   raw.freq   ?? raw.frequencia_hz ?? 0,
            rpm:    raw.rpm    ?? 0,
            hours:  raw.hours  ?? raw.horas_operacao ?? 0,
            score:  raw.score  ?? raw.saude_score   ?? 0,
            bat:    raw.bat    ?? 100,
            t:      raw.t      ?? new Date().toLocaleTimeString("pt-BR"),
            source: "ws",
          };
          prev.current = d;
          setLive(d);
          setHist(h => [...h, d].slice(-80));

          const t = d.t; const evts = [];
          if (d.temp >= LIM.temp.c)      evts.push({ type:"CRIT", msg:`Temperatura crítica ${d.temp.toFixed(1)}°C`, t, c: C.red });
          else if (d.temp >= LIM.temp.w) evts.push({ type:"WARN", msg:`Elevação térmica ${d.temp.toFixed(1)}°C`, t, c: C.amber });
          if (d.vibRMS >= LIM.vib.c)     evts.push({ type:"CRIT", msg:`Vibração crítica ${d.vibRMS.toFixed(2)} g`, t, c: C.red });
          else if (d.vibRMS >= LIM.vib.w)evts.push({ type:"WARN", msg:`Vibração elevada ${d.vibRMS.toFixed(2)} g`, t, c: C.amber });
          if (evts.length) setAlerts(a => [...evts, ...a].slice(0, 200));
        } catch(e) { console.warn("[WS] parse error", e); }
      };

      ws.onerror = () => console.warn("[WS] erro de conexão");

      ws.onclose = () => {
        setWsConnected(false);
        setAlerts(a => [{
          type: "WARN", msg: "WebSocket desconectado — reconectando em 3s...",
          t: new Date().toLocaleTimeString("pt-BR"), c: C.amber,
        }, ...a].slice(0, 200));
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => { clearTimeout(reconnectTimer); wsRef.current?.close(); };
  }, []);

  const st = running ? motorStatus(live) : "PARADO";

  const layout = useMemo(() => {
    if (screen < 900) return "mobile";
    if (screen < 1250) return "tablet";
    return "desktop";
  }, [screen]);

  return (
    <div
      style={{
        fontFamily: U,
        background: C.bg,
        minHeight: "100vh",
        color: C.white,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Fonts />

      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div
          style={{
            padding: "0 18px",
            minHeight: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="12" fill="none" stroke={C.blue} strokeWidth="1.5" />
              <circle cx="14" cy="14" r="6" fill="none" stroke={C.blue} strokeWidth="1" strokeDasharray="3 2" />
              <circle cx="14" cy="14" r="2.5" fill={C.blue} />
            </svg>
            <div>
              <div style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: "0.04em" }}>
                SMART<span style={{ color: C.blue }}>MOTOR</span>
                <span style={{ color: C.dim, fontWeight: 400, marginLeft: 6 }}>· Painel Operacional</span>
              </div>
              <div style={{ fontFamily: M, fontSize: 7.5, color: C.dim }}>
                BANCADA · {new Date().toLocaleDateString("pt-BR")}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[
              ["ESP32", C.teal],
              ["RTD", C.orange],
              ["VIBRAÇÃO", C.blue],
              ["CLP ONLINE", C.green],
              ["CFW500", C.teal],
            ].map(([lbl, col]) => (
              <span
                key={lbl}
                style={{
                  fontFamily: M,
                  fontSize: 8,
                  fontWeight: 600,
                  color: col,
                  background: `${col}15`,
                  border: `1px solid ${col}55`,
                  borderRadius: 3,
                  padding: "2px 8px",
                }}
              >
                {lbl}
              </span>
            ))}
            <span style={{
              fontFamily: M, fontSize: 8, fontWeight: 700,
              color:      wsConnected ? C.green : C.amber,
              background: wsConnected ? `${C.green}22` : `${C.amber}22`,
              border:    `1px solid ${wsConnected ? C.green : C.amber}88`,
              borderRadius: 3, padding: "2px 8px",
            }}>
              {wsConnected ? "● WS AO VIVO" : "○ WS SIM"}
            </span>
          </div>
        </div>
      </div>

      {layout === "desktop" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr 320px", minHeight: 0 }}>
          <div style={{ borderRight: `1px solid ${C.border}`, padding: "14px", overflowY: "auto", background: C.bg2 }}>
            <TelemetryPanel d={live} hist={hist} />
          </div>

          <CenterPanel
            st={st}
            running={running}
            motorMode={motorMode}
            setMotorMode={setMotorMode}
            setRunning={setRunning}
            freqSP={freqSP}
            setFreqSP={setFreqSP}
            degrad={degrad}
            hist={hist}
            setModalOpen={setModalOpen}
            live={live}
          />

          <div style={{ borderLeft: `1px solid ${C.border}`, padding: "14px", overflowY: "auto", background: C.bg2 }}>
            <AlertPanel alerts={alerts} d={live} onExport={() => exportAlertsToCSV(alerts)} />
          </div>
        </div>
      )}

      {layout === "tablet" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr", minHeight: 0 }}>
          <div style={{ padding: "14px", overflowY: "auto" }}>
            <CenterPanel
              st={st}
              running={running}
              motorMode={motorMode}
              setMotorMode={setMotorMode}
              setRunning={setRunning}
              freqSP={freqSP}
              setFreqSP={setFreqSP}
              degrad={degrad}
              hist={hist}
              setModalOpen={setModalOpen}
              live={live}
            />
            <div style={{ marginTop: 14 }}>
              <TelemetryPanel d={live} hist={hist} />
            </div>
            <div style={{ marginTop: 14 }}>
              <AlertPanel alerts={alerts} d={live} onExport={() => exportAlertsToCSV(alerts)} />
            </div>
          </div>
        </div>
      )}

      {layout === "mobile" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr", minHeight: 0 }}>
          <div style={{ padding: "12px", overflowY: "auto" }}>
            <CenterPanel
              st={st}
              running={running}
              motorMode={motorMode}
              setMotorMode={setMotorMode}
              setRunning={setRunning}
              freqSP={freqSP}
              setFreqSP={setFreqSP}
              degrad={degrad}
              hist={hist}
              setModalOpen={setModalOpen}
                live={live}
              compact
            />
            <div style={{ marginTop: 12 }}>
              <TelemetryPanel d={live} hist={hist} />
            </div>
            <div style={{ marginTop: 12 }}>
              <AlertPanel alerts={alerts} d={live} onExport={() => exportAlertsToCSV(alerts)} />
            </div>
          </div>
        </div>
      )}

      <StatusBar d={live} running={running} motorMode={motorMode} />

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
  );
}