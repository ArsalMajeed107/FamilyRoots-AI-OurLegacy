import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Eye, Layers, RotateCcw, Sparkles } from 'lucide-react';
import { FamilyBranch, FamilyMember } from '../types/family';
import { getInitials } from '../lib/imageUtils';

interface ThreeFamilyTreeProps {
  members: FamilyMember[];
  branches: FamilyBranch[];
  selectedMemberId: string | null;
  onSelectMember: (member: FamilyMember) => void;
  selectedBranchId: string;
  onChangeBranch: (branchId: string) => void;
}

type FinishTheme = 'royal_gold' | 'ivory_brass' | 'midnight_platinum';
type CameraPreset = 'overview' | 'founders' | 'topdown' | 'focused';

// Pre-allocated scratch math helpers (zero GC inside animation/render loops)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _mat4 = new THREE.Matrix4();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createMarbleFloorTexture(isDark: boolean, maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = isDark ? '#0B172B' : '#EAE6DC';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle concentric heritage astrolabe lines
  ctx.strokeStyle = isDark ? 'rgba(212, 175, 55, 0.22)' : 'rgba(15, 35, 66, 0.16)';
  ctx.lineWidth = 2;
  [90, 155, 215, 245].forEach((r) => {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Cardinal compass ticks
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r1 = i % 6 === 0 ? 75 : 225;
    const r2 = 248;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1);
    ctx.lineTo(256 + Math.cos(a) * r2, 256 + Math.sin(a) * r2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createMemberMedallionTexture(
  member: FamilyMember,
  accentHex: string,
  maxAniso: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createRadialGradient(128, 96, 18, 128, 128, 128);
  if (member.gender === 'female') {
    grad.addColorStop(0, '#2B3E63');
    grad.addColorStop(1, '#101F3B');
  } else {
    grad.addColorStop(0, '#1B365D');
    grad.addColorStop(1, '#0A172E');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Decorative inner gold ring
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();

  // Initials monogram
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 74px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getInitials(member.fullName), 128, 112);

  // Name & generation footer
  ctx.fillStyle = accentHex;
  ctx.font = '600 18px sans-serif';
  const shortName = member.fullName.length > 16 ? member.fullName.slice(0, 15) + '…' : member.fullName;
  ctx.fillText(shortName, 128, 184);

  ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
  ctx.font = '500 14px monospace';
  ctx.fillText(`GEN ${member.generation}`, 128, 208);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export const ThreeFamilyTree: React.FC<ThreeFamilyTreeProps> = ({
  members,
  branches,
  selectedMemberId,
  onSelectMember,
  selectedBranchId,
  onChangeBranch,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [layerSeparation, setLayerSeparation] = useState(1.0);
  const [finish, setFinish] = useState<FinishTheme>('royal_gold');
  const [hoveredMember, setHoveredMember] = useState<FamilyMember | null>(null);
  const [webglError, setWebglError] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!selectedBranchId) return members;
    return members.filter((m) => m.branchId === selectedBranchId);
  }, [members, selectedBranchId]);

  const onSelectMemberRef = useRef(onSelectMember);
  onSelectMemberRef.current = onSelectMember;

  const targetSepRef = useRef(layerSeparation);
  targetSepRef.current = layerSeparation;

  const sceneApiRef = useRef<{
    setPreset: (preset: CameraPreset, targetMemberId?: string | null) => void;
    updateFinish: (f: FinishTheme) => void;
    wakeTransition: () => void;
  } | null>(null);

  // Keyboard shortcut 'H' to hide/show controls dock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Build & manage Three.js scene cleanly outside React re-renders
  useEffect(() => {
    const mountEl = containerRef.current;
    if (!mountEl) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => setWebglError(false);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const bgHex = finish === 'ivory_brass' ? 0xdde4ee : finish === 'midnight_platinum' ? 0x050b16 : 0x071122;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.018);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 200);
    camera.position.set(11, 8.5, 14);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4;
    controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 1.8, 0);

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xb8d0f8, 0x0b1629, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    keyLight.position.set(9, 16, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 45;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd4af37, 1.0);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const disposables: Array<{ dispose: () => void }> = [envRT];

    // Materials library with clear roughness/metalness contrast
    const accentColor = finish === 'midnight_platinum' ? 0xcbd5e1 : 0xd4af37;
    const accentHexStr = finish === 'midnight_platinum' ? '#CBD5E1' : '#D4AF37';

    const brushedGoldMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      metalness: 0.94,
      roughness: 0.18,
      anisotropy: 0.8,
      clearcoat: 0.25,
    });
    const darkNavyMat = new THREE.MeshStandardMaterial({
      color: 0x0f2342,
      metalness: 0.18,
      roughness: 0.58,
    });
    const ivoryPearlMat = new THREE.MeshStandardMaterial({
      color: 0xede6d6,
      metalness: 0.12,
      roughness: 0.52,
    });
    const connectorGoldMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      metalness: 0.88,
      roughness: 0.22,
      clearcoat: 0.4,
    });
    const spouseRubyGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4c45c,
      metalness: 0.92,
      roughness: 0.16,
      emissive: 0x3a2605,
      emissiveIntensity: 0.35,
    });
    disposables.push(brushedGoldMat, darkNavyMat, ivoryPearlMat, connectorGoldMat, spouseRubyGoldMat);

    // 1. Grounded Terraced Heritage Dais (Composite 4-part assembly at y = 0)
    const daisGroup = new THREE.Group();
    const daisPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(11.8, 0),
      new THREE.Vector2(11.8, 0.14),
      new THREE.Vector2(10.6, 0.18),
      new THREE.Vector2(10.4, 0.34),
      new THREE.Vector2(4.2, 0.36),
      new THREE.Vector2(3.8, 0.52),
      new THREE.Vector2(0, 0.52),
    ];
    const daisGeo = new THREE.LatheGeometry(daisPoints, 64);
    const daisMat = new THREE.MeshStandardMaterial({
      color: finish === 'ivory_brass' ? 0xd9d3c7 : 0x0c192f,
      metalness: 0.12,
      roughness: 0.65,
    });
    const daisMesh = new THREE.Mesh(daisGeo, daisMat);
    daisMesh.receiveShadow = true;
    daisGroup.add(daisMesh);

    const floorTex = createMarbleFloorTexture(finish !== 'ivory_brass', maxAniso);
    const compassDiscGeo = new THREE.CircleGeometry(10.2, 64);
    compassDiscGeo.rotateX(-Math.PI / 2);
    const compassDiscMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.45,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const compassDisc = new THREE.Mesh(compassDiscGeo, compassDiscMat);
    compassDisc.position.y = 0.37;
    compassDisc.receiveShadow = true;
    daisGroup.add(compassDisc);

    const outerBezelGeo = new THREE.TorusGeometry(10.5, 0.08, 16, 80);
    outerBezelGeo.rotateX(Math.PI / 2);
    const outerBezel = new THREE.Mesh(outerBezelGeo, brushedGoldMat);
    outerBezel.position.y = 0.36;
    daisGroup.add(outerBezel);

    // Contact shadow plane directly underneath dais
    const shadowTex = createRadialContactShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(26, 26);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactShadowPlane = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowPlane.position.y = 0.01;
    daisGroup.add(contactShadowPlane);
    scene.add(daisGroup);
    disposables.push(daisGeo, daisMat, floorTex, compassDiscGeo, compassDiscMat, outerBezelGeo, shadowTex, contactShadowGeo, contactShadowMat);

    // 2. Central Founding Monument (if no members yet, acts as hero architectural sculpture; if members exist, crowns Gen 0)
    const monumentGroup = new THREE.Group();
    const spirePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.85, 0),
      new THREE.Vector2(0.75, 0.25),
      new THREE.Vector2(0.45, 0.45),
      new THREE.Vector2(0.28, 1.35),
      new THREE.Vector2(0.42, 1.55),
      new THREE.Vector2(0.0, 2.05),
    ];
    const spireGeo = new THREE.LatheGeometry(spirePoints, 32);
    const spireMesh = new THREE.Mesh(spireGeo, darkNavyMat);
    spireMesh.castShadow = true;
    monumentGroup.add(spireMesh);

    const astrolabeRingGeo = new THREE.TorusGeometry(0.92, 0.045, 16, 48);
    const astrolabeRing = new THREE.Mesh(astrolabeRingGeo, brushedGoldMat);
    astrolabeRing.position.y = 1.45;
    monumentGroup.add(astrolabeRing);

    const astrolabeInnerGeo = new THREE.TorusGeometry(0.7, 0.035, 16, 48);
    astrolabeInnerGeo.rotateY(Math.PI / 3);
    const astrolabeInner = new THREE.Mesh(astrolabeInnerGeo, brushedGoldMat);
    astrolabeInner.position.y = 1.45;
    monumentGroup.add(astrolabeInner);

    monumentGroup.position.set(0, 0.52, 0);
    scene.add(monumentGroup);
    disposables.push(spireGeo, astrolabeRingGeo, astrolabeInnerGeo);

    // 3. Layout verified members into generation tiers & construct multi-part 3D heritage nodes
    const nodePositions = new Map<string, THREE.Vector3>();
    const nodeGroups = new Map<string, { group: THREE.Group; baseGen: number }>();
    const clickProxies: THREE.Mesh[] = [];

    // Shared geometries for member nodes (reused across all members)
    const plinthPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.56, 0),
      new THREE.Vector2(0.52, 0.14),
      new THREE.Vector2(0.38, 0.22),
      new THREE.Vector2(0.32, 0.45),
      new THREE.Vector2(0, 0.45),
    ];
    const plinthGeo = new THREE.LatheGeometry(plinthPoints, 28);

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(-0.48, -0.45);
    shieldShape.lineTo(0.48, -0.45);
    shieldShape.lineTo(0.56, 0.35);
    shieldShape.quadraticCurveTo(0, 0.65, -0.56, 0.35);
    shieldShape.closePath();
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    shieldGeo.center();

    const medallionGeo = new THREE.CircleGeometry(0.38, 32);
    const rimRingGeo = new THREE.TorusGeometry(0.4, 0.03, 12, 36);
    const crownGemGeo = new THREE.OctahedronGeometry(0.12, 0);
    const proxyGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.6, 12);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    disposables.push(plinthGeo, shieldGeo, medallionGeo, rimRingGeo, crownGemGeo, proxyGeo, proxyMat);

    // Group members by generation
    const byGen = new Map<number, FamilyMember[]>();
    filteredMembers.forEach((m) => {
      const list = byGen.get(m.generation) || [];
      list.push(m);
      byGen.set(m.generation, list);
    });

    const sortedGens = Array.from(byGen.keys()).sort((a, b) => a - b);
    sortedGens.forEach((gen) => {
      const tier = byGen.get(gen) || [];
      const radius = gen === 0 ? (tier.length <= 2 ? 1.85 : 2.5) : 3.2 + gen * 2.35;
      const baseY = 0.54 + gen * 2.15;

      tier.forEach((member, idx) => {
        const angle = (idx / Math.max(1, tier.length)) * Math.PI * 2 + gen * 0.45;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const pos = new THREE.Vector3(x, baseY, z);
        nodePositions.set(member.id, pos);

        // Multi-part member group (5 distinct parts + raycast proxy)
        const mGroup = new THREE.Group();
        mGroup.position.copy(pos);
        mGroup.lookAt(0, pos.y, 0);
        mGroup.rotateY(Math.PI);

        // Part 1: Turned brass/obsidian plinth (bottom-center flush)
        const plinth = new THREE.Mesh(plinthGeo, member.roleInLineage === 'founder' ? brushedGoldMat : darkNavyMat);
        plinth.castShadow = !isSoftwareGl;
        plinth.receiveShadow = true;
        mGroup.add(plinth);

        // Part 2: Beveled heraldic frame
        const frameMat = member.gender === 'female' ? ivoryPearlMat : darkNavyMat;
        const frame = new THREE.Mesh(shieldGeo, frameMat);
        frame.position.set(0, 0.96, 0);
        frame.castShadow = !isSoftwareGl;
        mGroup.add(frame);

        // Part 3: Portrait/Monogram face disc
        const faceTex = createMemberMedallionTexture(member, accentHexStr, maxAniso);
        const faceMat = new THREE.MeshStandardMaterial({
          map: faceTex,
          roughness: 0.35,
          metalness: 0.1,
        });
        disposables.push(faceTex, faceMat);
        const faceMesh = new THREE.Mesh(medallionGeo, faceMat);
        faceMesh.position.set(0, 0.96, 0.12);
        mGroup.add(faceMesh);

        // Part 4: Brushed gold outer rim
        const rim = new THREE.Mesh(rimRingGeo, brushedGoldMat);
        rim.position.set(0, 0.96, 0.12);
        mGroup.add(rim);

        // Part 5: Crown finial (gold if founder/selected, else sapphire/gold)
        const crown = new THREE.Mesh(
          crownGemGeo,
          member.id === selectedMemberId || member.roleInLineage === 'founder' ? spouseRubyGoldMat : brushedGoldMat,
        );
        crown.position.set(0, 1.62, 0);
        mGroup.add(crown);

        // Raycast proxy mesh
        const proxy = new THREE.Mesh(proxyGeo, proxyMat);
        proxy.position.set(0, 0.85, 0);
        proxy.layers.set(1);
        proxy.userData.member = member;
        mGroup.add(proxy);
        clickProxies.push(proxy);

        scene.add(mGroup);
        nodeGroups.set(member.id, { group: mGroup, baseGen: gen });
      });
    });

    // 4. Parent-Child & Marital Connectors (TubeGeometry arcs)
    const connectorsGroup = new THREE.Group();
    const connectorRecords: Array<{
      mesh: THREE.Mesh;
      fromId: string;
      toId: string;
      type: 'parent' | 'spouse';
    }> = [];

    const buildArcGeometry = (p1: THREE.Vector3, p2: THREE.Vector3, type: 'parent' | 'spouse') => {
      const mid = _vec3A.addVectors(p1, p2).multiplyScalar(0.5);
      if (type === 'parent') {
        mid.y += 0.9;
      } else {
        mid.y += 0.35;
      }
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(p1.x, p1.y + 0.65, p1.z),
        mid.clone(),
        new THREE.Vector3(p2.x, p2.y + 0.65, p2.z),
      ]);
      return new THREE.TubeGeometry(curve, 24, type === 'spouse' ? 0.045 : 0.032, 8, false);
    };

    const spouseSeen = new Set<string>();
    filteredMembers.forEach((member) => {
      const childPos = nodePositions.get(member.id);
      if (!childPos) return;

      [member.fatherId, member.motherId].forEach((parentId) => {
        if (!parentId) return;
        const parentPos = nodePositions.get(parentId);
        if (!parentPos) return;
        const tubeGeo = buildArcGeometry(parentPos, childPos, 'parent');
        const mesh = new THREE.Mesh(tubeGeo, connectorGoldMat);
        connectorsGroup.add(mesh);
        disposables.push(tubeGeo);
        connectorRecords.push({ mesh, fromId: parentId, toId: member.id, type: 'parent' });
      });

      if (member.spouseId) {
        const pairKey = [member.id, member.spouseId].sort().join('::');
        if (!spouseSeen.has(pairKey)) {
          spouseSeen.add(pairKey);
          const spousePos = nodePositions.get(member.spouseId);
          if (spousePos) {
            const tubeGeo = buildArcGeometry(childPos, spousePos, 'spouse');
            const mesh = new THREE.Mesh(tubeGeo, spouseRubyGoldMat);
            connectorsGroup.add(mesh);
            disposables.push(tubeGeo);
            connectorRecords.push({ mesh, fromId: member.id, toId: member.spouseId, type: 'spouse' });
          }
        }
      }
    });
    scene.add(connectorsGroup);

    // 5. InstancedMesh ambient starlight motes (> 60 repeated items)
    const moteCount = 72;
    const moteGeo = new THREE.OctahedronGeometry(0.055, 0);
    const moteMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.9,
    });
    const instancedMotes = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
    for (let i = 0; i < moteCount; i++) {
      const a = (i / moteCount) * Math.PI * 2 + (i % 5) * 0.37;
      const r = 2.5 + ((i * 1.37) % 10.5);
      const y = 1.2 + ((i * 0.73) % 7.5);
      const s = 0.85 + ((i % 4) - 1.5) * 0.1;
      _vec3A.set(Math.cos(a) * r, y, Math.sin(a) * r);
      _scale.setScalar(s);
      _mat4.compose(_vec3A, _quat, _scale);
      instancedMotes.setMatrixAt(i, _mat4);
    }
    instancedMotes.instanceMatrix.needsUpdate = true;
    instancedMotes.computeBoundingSphere();
    scene.add(instancedMotes);
    disposables.push(moteGeo, moteMat);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycaster on layer 1 proxies
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();

    // Smooth camera preset & layer separation transition state
    let currentSep = targetSepRef.current;
    let camTransitionActive = false;
    const targetCamPos = new THREE.Vector3().copy(camera.position);
    const targetLookAt = new THREE.Vector3().copy(controls.target);

    // Render-on-demand & software WebGL frame pacing
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        renderDirty = false;

        let needsMoreFrames = false;

        // Smooth exploded generation separation
        const targetSep = targetSepRef.current;
        if (Math.abs(currentSep - targetSep) > 0.002) {
          currentSep = THREE.MathUtils.damp(currentSep, targetSep, 7, dt);
          nodeGroups.forEach(({ group, baseGen }) => {
            group.position.y = 0.54 + baseGen * 2.15 * currentSep;
          });
          // Update connector tubes when generation layer spacing changes
          connectorRecords.forEach((rec) => {
            const gA = nodeGroups.get(rec.fromId)?.group;
            const gB = nodeGroups.get(rec.toId)?.group;
            if (gA && gB) {
              rec.mesh.geometry.dispose();
              rec.mesh.geometry = buildArcGeometry(gA.position, gB.position, rec.type);
            }
          });
          needsMoreFrames = true;
        }

        // Smooth camera glide
        if (camTransitionActive) {
          const factor = 1 - Math.exp(-6.5 * dt);
          camera.position.lerp(targetCamPos, factor);
          controls.target.lerp(targetLookAt, factor);
          if (
            camera.position.distanceTo(targetCamPos) < 0.04 &&
            controls.target.distanceTo(targetLookAt) < 0.04
          ) {
            camera.position.copy(targetCamPos);
            controls.target.copy(targetLookAt);
            camTransitionActive = false;
          } else {
            needsMoreFrames = true;
          }
        }

        const ctrlChanged = controls.update();
        if (ctrlChanged) needsMoreFrames = true;

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    const cancelCameraTransition = () => {
      camTransitionActive = false;
    };
    controls.addEventListener('start', cancelCameraTransition);
    controls.addEventListener('change', requestRender);

    sceneApiRef.current = {
      wakeTransition: () => requestRender(),
      setPreset: (preset: CameraPreset, targetMemberId?: string | null) => {
        if (preset === 'overview') {
          targetCamPos.set(11, 8.5, 14);
          targetLookAt.set(0, 1.8, 0);
        } else if (preset === 'founders') {
          targetCamPos.set(4.5, 3.2, 5.8);
          targetLookAt.set(0, 1.1, 0);
        } else if (preset === 'topdown') {
          targetCamPos.set(0.01, 22, 0.01);
          targetLookAt.set(0, 0.5, 0);
        } else if (preset === 'focused' && targetMemberId) {
          const entry = nodeGroups.get(targetMemberId);
          if (entry) {
            const p = entry.group.position;
            _vec3B.set(p.x, 0, p.z).normalize();
            if (_vec3B.lengthSq() < 0.01) _vec3B.set(0, 0, 1);
            targetLookAt.set(p.x, p.y + 0.85, p.z);
            targetCamPos.set(p.x + _vec3B.x * 4.2, p.y + 2.2, p.z + _vec3B.z * 4.2);
          }
        }
        camTransitionActive = true;
        requestRender();
      },
      updateFinish: () => {
        requestRender();
      },
    };

    // Click and throttled hover raycasting
    let lastMove = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6) return; // Ignore orbit drags
      updatePointer(ev);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(clickProxies, false);
      if (hits.length > 0) {
        const hitMember = hits[0].object.userData.member as FamilyMember | undefined;
        if (hitMember) {
          onSelectMemberRef.current(hitMember);
          sceneApiRef.current?.setPreset('focused', hitMember.id);
        }
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastMove < 50) return;
      lastMove = now;
      updatePointer(ev);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(clickProxies, false);
      if (hits.length > 0) {
        const m = hits[0].object.userData.member as FamilyMember | undefined;
        renderer.domElement.style.cursor = 'pointer';
        setHoveredMember(m || null);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredMember(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      if (!mountEl) return;
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', cancelCameraTransition);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [filteredMembers, finish, selectedMemberId]);

  useEffect(() => {
    sceneApiRef.current?.wakeTransition();
  }, [layerSeparation]);

  return (
    <div className="relative h-[calc(100vh-11rem)] min-h-[540px] w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#071122] dark:border-[#1E3252]">
      {/* Isolated WebGL mount container */}
      <div ref={containerRef} className="h-full w-full" />

      {webglError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#071122] p-6 text-center text-white">
          <p className="font-display text-xl font-semibold text-[#D4AF37]">3D Viewport Unavailable</p>
          <p className="mt-2 max-w-md text-sm text-[#CBD5E1]">
            Hardware-accelerated WebGL context was interrupted. Switch to the 2D Interactive Genealogy Chart to inspect every generation.
          </p>
        </div>
      )}

      {/* Minimal Top-Left Spec Badge (solid rgba surface, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-[#1E3252] bg-[#081120]/90 px-3.5 py-2 text-white">
        <p className="font-display text-sm font-semibold text-[#D4AF37]">3D Heritage Constellation</p>
        <p className="font-mono text-[11px] text-[#CBD5E1]">
          {filteredMembers.length} verified nodes · Drag to orbit · Click medallion to inspect
        </p>
      </div>

      {/* Hover Tooltip (non-blocking) */}
      {hoveredMember && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 rounded-lg border border-[#D4AF37]/50 bg-[#081120]/95 px-3.5 py-2 text-center text-white">
          <p className="text-xs font-semibold">{hoveredMember.fullName}</p>
          <p className="font-mono text-[11px] text-[#D4AF37]">
            Gen {hoveredMember.generation} · {hoveredMember.branchName} · Click to open profile
          </p>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion, no backdrop-filter) */}
      <div className="absolute bottom-4 left-1/2 z-20 flex w-[min(860px,94%)] -translate-x-1/2 flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-[#1E3252] bg-[#0B172B]/95 px-3 py-1 text-[11px] font-medium text-[#CBD5E1] hover:text-[#D4AF37] cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{dockCollapsed ? 'Show 3D Controls (H)' : 'Hide Controls (H)'}</span>
        </button>

        {!dockCollapsed && (
          <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1E3252] bg-[#0B172B]/95 px-4 py-2.5 text-xs text-white">
            {/* Branch Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#94A3B8]">Branch</span>
              <select
                value={selectedBranchId}
                onChange={(e) => onChangeBranch(e.target.value)}
                className="rounded-md border border-[#1E3252] bg-[#081120] px-2.5 py-1 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Generation Separation Slider */}
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span className="text-[11px] text-[#94A3B8]">Tier Spacing</span>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={layerSeparation}
                onChange={(e) => setLayerSeparation(Number(e.target.value))}
                className="w-24 accent-[#D4AF37]"
              />
            </div>

            {/* Camera Presets */}
            <div className="flex items-center gap-1 rounded-lg bg-[#081120] p-1">
              <button
                type="button"
                onClick={() => sceneApiRef.current?.setPreset('overview')}
                className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-[#CBD5E1] hover:bg-[#162742] hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Overview
              </button>
              <button
                type="button"
                onClick={() => sceneApiRef.current?.setPreset('founders')}
                className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-[#CBD5E1] hover:bg-[#162742] hover:text-white cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                Founders
              </button>
              <button
                type="button"
                onClick={() => sceneApiRef.current?.setPreset('topdown')}
                className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-[#CBD5E1] hover:bg-[#162742] hover:text-white cursor-pointer"
              >
                <Eye className="h-3 w-3" />
                Top-Down
              </button>
            </div>

            {/* Finish Swatches */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#94A3B8]">Finish</span>
              <button
                type="button"
                title="Royal Navy & Gold"
                onClick={() => setFinish('royal_gold')}
                className={`h-5 w-5 rounded-full border bg-[#0F2342] cursor-pointer ${
                  finish === 'royal_gold' ? 'border-2 border-[#D4AF37]' : 'border-white/30'
                }`}
              />
              <button
                type="button"
                title="Ivory & Brass"
                onClick={() => setFinish('ivory_brass')}
                className={`h-5 w-5 rounded-full border bg-[#EAE6DC] cursor-pointer ${
                  finish === 'ivory_brass' ? 'border-2 border-[#D4AF37]' : 'border-white/30'
                }`}
              />
              <button
                type="button"
                title="Midnight Platinum"
                onClick={() => setFinish('midnight_platinum')}
                className={`h-5 w-5 rounded-full border bg-[#334155] cursor-pointer ${
                  finish === 'midnight_platinum' ? 'border-2 border-[#D4AF37]' : 'border-white/30'
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
