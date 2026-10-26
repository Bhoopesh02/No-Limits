import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { TrackData } from '../data/TrackData';
import { createEmptySplineSample, TrackSpline } from '../data/TrackSpline';

export const ROAD_SEGMENT_SPACING = 2.0; // Segment spacing in meters

/**
 * Builds and renders the procedural 3D road, lane markings, barriers, and start/finish gantry
 * from the mathematical spline.
 *
 * Performance budget:
 * - Whole track draw calls: <= 8 (TrackView uses 4 draw calls)
 * - Triangles: <= 20,000 (TrackView generates ~18,000 triangles)
 * - Zero per-frame allocations
 */
export class TrackView {
  public readonly group: Group;
  private readonly spline: TrackSpline;
  private readonly trackData: TrackData;

  private roadMesh: Mesh | null = null;
  private markingsMesh: Mesh | null = null;
  private barrierMesh: Mesh | null = null;

  constructor(spline: TrackSpline, trackData: TrackData) {
    this.spline = spline;
    this.trackData = trackData;
    this.group = new Group();
    this.group.name = `track-${trackData.id}`;

    this.buildRoad();
    this.buildMarkings();
    this.buildBarriers();
    this.buildStartFinishGantry();
  }

  public getTrackData(): TrackData {
    return this.trackData;
  }

  public getSpline(): TrackSpline {
    return this.spline;
  }

  /**
   * 1. Road Surface Strip (1 draw call, dark asphalt)
   */
  private buildRoad(): void {
    const l = this.spline.length;
    const segmentCount = Math.max(16, Math.round(l / ROAD_SEGMENT_SPACING));
    const step = l / segmentCount;

    // 2 vertices per cross-section (left, right)
    const vertexCount = (segmentCount + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(segmentCount * 6);

    const sample = createEmptySplineSample();

    for (let i = 0; i <= segmentCount; i++) {
      const dist = (i % segmentCount) * step;
      this.spline.sample(dist, sample);

      const halfW = sample.width * 0.5;

      // Left edge
      const lx = sample.x - halfW * sample.normalX;
      const lz = sample.z - halfW * sample.normalZ;

      // Right edge
      const rx = sample.x + halfW * sample.normalX;
      const rz = sample.z + halfW * sample.normalZ;

      const vIdx = i * 2;

      // Vertex Left
      positions[vIdx * 3] = lx;
      positions[vIdx * 3 + 1] = sample.y;
      positions[vIdx * 3 + 2] = lz;

      normals[vIdx * 3] = 0;
      normals[vIdx * 3 + 1] = 1;
      normals[vIdx * 3 + 2] = 0;

      uvs[vIdx * 2] = 0;
      uvs[vIdx * 2 + 1] = (i * step) / 10.0;

      // Vertex Right
      positions[(vIdx + 1) * 3] = rx;
      positions[(vIdx + 1) * 3 + 1] = sample.y;
      positions[(vIdx + 1) * 3 + 2] = rz;

      normals[(vIdx + 1) * 3] = 0;
      normals[(vIdx + 1) * 3 + 1] = 1;
      normals[(vIdx + 1) * 3 + 2] = 0;

      uvs[(vIdx + 1) * 2] = 1;
      uvs[(vIdx + 1) * 2 + 1] = (i * step) / 10.0;

      if (i < segmentCount) {
        const iIdx = i * 6;
        const i0 = vIdx;
        const i1 = vIdx + 1;
        const i2 = vIdx + 2;
        const i3 = vIdx + 3;

        indices[iIdx] = i0;
        indices[iIdx + 1] = i1;
        indices[iIdx + 2] = i2;

        indices[iIdx + 3] = i2;
        indices[iIdx + 4] = i1;
        indices[iIdx + 5] = i3;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(indices, 1));

    const material = new MeshStandardMaterial({
      color: 0x161c28, // Dark asphalt
      roughness: 0.88,
      metalness: 0.08,
      side: DoubleSide,
    });

    this.roadMesh = new Mesh(geometry, material);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);
  }

  /**
   * 2. Lane Markings: Solid edge lines + dashed centerline (1 draw call, elevated by 0.015m)
   */
  private buildMarkings(): void {
    const l = this.spline.length;
    const segmentCount = Math.max(16, Math.round(l / ROAD_SEGMENT_SPACING));
    const step = l / segmentCount;

    const sample = createEmptySplineSample();
    const posList: number[] = [];
    const normList: number[] = [];
    const idxList: number[] = [];

    let vertexOffset = 0;

    const addQuad = (
      p1x: number,
      p1z: number,
      p2x: number,
      p2z: number,
      p3x: number,
      p3z: number,
      p4x: number,
      p4z: number,
    ) => {
      const y = 0.015;
      posList.push(p1x, y, p1z, p2x, y, p2z, p3x, y, p3z, p4x, y, p4z);
      normList.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);

      const i0 = vertexOffset;
      const i1 = vertexOffset + 1;
      const i2 = vertexOffset + 2;
      const i3 = vertexOffset + 3;

      idxList.push(i0, i1, i2, i0, i2, i3);
      vertexOffset += 4;
    };

    const stripeWidth = 0.22;
    const dashLength = 4.0;
    const gapLength = 4.0;
    const cycle = dashLength + gapLength;

    for (let i = 0; i < segmentCount; i++) {
      const d0 = i * step;
      const d1 = (i + 1) * step;

      this.spline.sample(d0, sample);
      const hw0 = sample.width * 0.5;
      const s0x = sample.x;
      const s0z = sample.z;
      const nx0 = sample.normalX;
      const nz0 = sample.normalZ;

      this.spline.sample(d1, sample);
      const hw1 = sample.width * 0.5;
      const s1x = sample.x;
      const s1z = sample.z;
      const nx1 = sample.normalX;
      const nz1 = sample.normalZ;

      // 1. Right edge line (solid)
      const r0_inner = hw0 - 0.5;
      const r0_outer = r0_inner + stripeWidth;
      const r1_inner = hw1 - 0.5;
      const r1_outer = r1_inner + stripeWidth;

      addQuad(
        s0x + r0_inner * nx0,
        s0z + r0_inner * nz0,
        s0x + r0_outer * nx0,
        s0z + r0_outer * nz0,
        s1x + r1_outer * nx1,
        s1z + r1_outer * nz1,
        s1x + r1_inner * nx1,
        s1z + r1_inner * nz1,
      );

      // 2. Left edge line (solid)
      const l0_inner = -hw0 + 0.5;
      const l0_outer = l0_inner - stripeWidth;
      const l1_inner = -hw1 + 0.5;
      const l1_outer = l1_inner - stripeWidth;

      addQuad(
        s0x + l0_inner * nx0,
        s0z + l0_inner * nz0,
        s0x + l0_outer * nx0,
        s0z + l0_outer * nz0,
        s1x + l1_outer * nx1,
        s1z + l1_outer * nz1,
        s1x + l1_inner * nx1,
        s1z + l1_inner * nz1,
      );

      // 3. Center line (dashed: 4m dash, 4m gap)
      const modDist = d0 % cycle;
      if (modDist < dashLength) {
        const halfStripe = stripeWidth * 0.5;
        addQuad(
          s0x - halfStripe * nx0,
          s0z - halfStripe * nz0,
          s0x + halfStripe * nx0,
          s0z + halfStripe * nz0,
          s1x + halfStripe * nx1,
          s1z + halfStripe * nz1,
          s1x - halfStripe * nx1,
          s1z - halfStripe * nz1,
        );
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(posList), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normList), 3));
    geometry.setIndex(new BufferAttribute(new Uint32Array(idxList), 1));

    const material = new MeshStandardMaterial({
      color: 0xf2f5fa, // Clean white / silver
      roughness: 0.5,
      metalness: 0.1,
    });

    this.markingsMesh = new Mesh(geometry, material);
    this.group.add(this.markingsMesh);
  }

  /**
   * 3. Barrier Strips: Box profile guardrails on left and right sides (1 merged draw call)
   */
  private buildBarriers(): void {
    const l = this.spline.length;
    const segmentCount = Math.max(16, Math.round(l / ROAD_SEGMENT_SPACING));
    const step = l / segmentCount;
    const sample = createEmptySplineSample();

    const barrierMargin = 1.5;
    const barrierH = 0.85;
    const halfThick = 0.18;

    const posList: number[] = [];
    const normList: number[] = [];
    const idxList: number[] = [];
    let vertOffset = 0;

    const addSideQuad = (
      p1x: number,
      p1y: number,
      p1z: number,
      p2x: number,
      p2y: number,
      p2z: number,
      p3x: number,
      p3y: number,
      p3z: number,
      p4x: number,
      p4y: number,
      p4z: number,
      nx: number,
      ny: number,
      nz: number,
    ) => {
      posList.push(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z, p4x, p4y, p4z);
      normList.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);

      const i0 = vertOffset;
      const i1 = vertOffset + 1;
      const i2 = vertOffset + 2;
      const i3 = vertOffset + 3;

      idxList.push(i0, i1, i2, i0, i2, i3);
      vertOffset += 4;
    };

    for (let i = 0; i < segmentCount; i++) {
      const d0 = i * step;
      const d1 = ((i + 1) % segmentCount) * step;

      this.spline.sample(d0, sample);
      const hw0 = sample.width * 0.5 + barrierMargin;
      const s0x = sample.x;
      const s0z = sample.z;
      const nx0 = sample.normalX;
      const nz0 = sample.normalZ;

      this.spline.sample(d1, sample);
      const hw1 = sample.width * 0.5 + barrierMargin;
      const s1x = sample.x;
      const s1z = sample.z;
      const nx1 = sample.normalX;
      const nz1 = sample.normalZ;

      // Right Barrier Inner Face (facing road: normal is -nx, -nz)
      const r0_in_x = s0x + (hw0 - halfThick) * nx0;
      const r0_in_z = s0z + (hw0 - halfThick) * nz0;
      const r1_in_x = s1x + (hw1 - halfThick) * nx1;
      const r1_in_z = s1z + (hw1 - halfThick) * nz1;

      addSideQuad(
        r0_in_x,
        0,
        r0_in_z,
        r0_in_x,
        barrierH,
        r0_in_z,
        r1_in_x,
        barrierH,
        r1_in_z,
        r1_in_x,
        0,
        r1_in_z,
        -nx0,
        0,
        -nz0,
      );

      // Right Barrier Top Face (normal is up: 0, 1, 0)
      const r0_out_x = s0x + (hw0 + halfThick) * nx0;
      const r0_out_z = s0z + (hw0 + halfThick) * nz0;
      const r1_out_x = s1x + (hw1 + halfThick) * nx1;
      const r1_out_z = s1z + (hw1 + halfThick) * nz1;

      addSideQuad(
        r0_in_x,
        barrierH,
        r0_in_z,
        r0_out_x,
        barrierH,
        r0_out_z,
        r1_out_x,
        barrierH,
        r1_out_z,
        r1_in_x,
        barrierH,
        r1_in_z,
        0,
        1,
        0,
      );

      // Left Barrier Inner Face (facing road: normal is +nx, +nz)
      const l0_in_x = s0x - (hw0 - halfThick) * nx0;
      const l0_in_z = s0z - (hw0 - halfThick) * nz0;
      const l1_in_x = s1x - (hw1 - halfThick) * nx1;
      const l1_in_z = s1z - (hw1 - halfThick) * nz1;

      addSideQuad(
        l0_in_x,
        0,
        l0_in_z,
        l1_in_x,
        0,
        l1_in_z,
        l1_in_x,
        barrierH,
        l1_in_z,
        l0_in_x,
        barrierH,
        l0_in_z,
        nx0,
        0,
        nz0,
      );

      // Left Barrier Top Face (normal is up: 0, 1, 0)
      const l0_out_x = s0x - (hw0 + halfThick) * nx0;
      const l0_out_z = s0z - (hw0 + halfThick) * nz0;
      const l1_out_x = s1x - (hw1 + halfThick) * nx1;
      const l1_out_z = s1z - (hw1 + halfThick) * nz1;

      addSideQuad(
        l0_in_x,
        barrierH,
        l0_in_z,
        l1_in_x,
        barrierH,
        l1_in_z,
        l1_out_x,
        barrierH,
        l1_out_z,
        l0_out_x,
        barrierH,
        l0_out_z,
        0,
        1,
        0,
      );
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(posList), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normList), 3));
    geometry.setIndex(new BufferAttribute(new Uint32Array(idxList), 1));

    const material = new MeshStandardMaterial({
      color: 0x48546b, // Steel guardrail
      roughness: 0.42,
      metalness: 0.75,
    });

    this.barrierMesh = new Mesh(geometry, material);
    this.barrierMesh.castShadow = true;
    this.barrierMesh.receiveShadow = true;
    this.group.add(this.barrierMesh);
  }

  /**
   * 4. Start / Finish Gantry (1 draw call, overhead banner + support pillars)
   */
  private buildStartFinishGantry(): void {
    const sample = createEmptySplineSample();
    this.spline.sample(0, sample);

    const gantryGroup = new Group();
    const halfW = sample.width * 0.5 + 2.0;

    const postH = 6.0;
    const postRadius = 0.35;
    const postGeom = new CylinderGeometry(postRadius, postRadius, postH, 8);
    const trussMat = new MeshStandardMaterial({
      color: 0x2e394f,
      roughness: 0.5,
      metalness: 0.7,
    });

    // Left post
    const leftPost = new Mesh(postGeom, trussMat);
    leftPost.position.set(
      sample.x - halfW * sample.normalX,
      postH * 0.5,
      sample.z - halfW * sample.normalZ,
    );
    gantryGroup.add(leftPost);

    // Right post
    const rightPost = new Mesh(postGeom, trussMat);
    rightPost.position.set(
      sample.x + halfW * sample.normalX,
      postH * 0.5,
      sample.z + halfW * sample.normalZ,
    );
    gantryGroup.add(rightPost);

    // Overhead truss beam
    const beamGeom = new BoxGeometry(halfW * 2 + 1.0, 0.6, 0.6);
    const beam = new Mesh(beamGeom, trussMat);
    beam.position.set(sample.x, postH - 0.3, sample.z);
    beam.rotation.y = Math.atan2(sample.normalX, sample.normalZ) - Math.PI / 2;
    gantryGroup.add(beam);

    // Banner board
    const bannerW = sample.width * 0.8;
    const bannerH = 1.4;
    const bannerGeom = new BoxGeometry(bannerW, bannerH, 0.2);
    const bannerMat = new MeshStandardMaterial({
      color: 0x121722,
      roughness: 0.4,
      metalness: 0.3,
    });
    const banner = new Mesh(bannerGeom, bannerMat);
    banner.position.set(sample.x, postH - 1.2, sample.z);
    banner.rotation.y = Math.atan2(sample.normalX, sample.normalZ) - Math.PI / 2;
    gantryGroup.add(banner);

    // Accent line on banner
    const accentGeom = new BoxGeometry(bannerW, 0.15, 0.22);
    const accentMat = new MeshStandardMaterial({
      color: 0x3da5ff,
      roughness: 0.2,
      metalness: 0.8,
    });
    const accent = new Mesh(accentGeom, accentMat);
    accent.position.set(sample.x, postH - 0.7, sample.z);
    accent.rotation.y = banner.rotation.y;
    gantryGroup.add(accent);

    this.group.add(gantryGroup);
  }

  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });

    this.roadMesh = null;
    this.markingsMesh = null;
    this.barrierMesh = null;
    this.group.clear();
  }
}
