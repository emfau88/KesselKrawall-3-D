"""Technical preparation of the user's nine image-to-3D environment sources.

Run: blender --background --python art/blender/prepare_mockup_environment.py
No new creative geometry is built. Raw GLBs and their embedded atlases remain
unchanged. Exports normalize axes/pivots, repair nonmetal material defaults,
preserve UV corner data while welding normals, and produce bounded LODs.
"""

from pathlib import Path
import hashlib
import json
import math
import struct
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / "public" / "assets" / "environment"
MANIFEST = ROOT / "art" / "source" / "mockup-runtime-manifest.json"
REVIEW = "--render-review" in sys.argv

# Desired XYZ sizes are expressed in glTF/Three's Y-up basis.
ASSETS = [
    dict(slug="ritual-platform", batch="batch-01", size=(11.1, .42, 11.1), budgets=(20000, 10000), roughness=.88),
    dict(slug="witch-workbench", batch="batch-01", size=(8.2, 1.18, 6.4), budgets=(16000, 8000), roughness=.82),
    dict(slug="triple-candleholder", batch="batch-01", height=1.1, budgets=(4000, 2000), roughness=.76, normal_angle=75),
    dict(slug="open-grimoire", batch="batch-01", width=1.6, budgets=(6000, 3000), roughness=.87),
    dict(slug="dungeon-wall-module", batch="batch-02", size=(3.2, 3.2, .5), budgets=(6000, 3000), roughness=.9),
    dict(slug="dungeon-stone-arch", batch="batch-02", quarter_turn=True, size=(2.8, 4.4, .6), budgets=(8000, 4000), roughness=.9),
    dict(slug="alchemy-shelf", batch="batch-02", quarter_turn=True, height=3.0, budgets=(12000, 6000), roughness=.8, normal_angle=65),
    dict(slug="wall-candle-sconce", batch="batch-02", quarter_turn=True, height=.7, budgets=(3000, 1500), roughness=.78, normal_angle=75),
    dict(slug="dungeon-stone-pillar", batch="batch-03", height=4.4, budgets=(6000, 3000), roughness=.9),
]

RAW_CANDLE_WICKS = {
    "Wick_L": [-.243562013, .498299986, .164998204],
    "Wick_C": [.002618057, .183923662, -.236622483],
    "Wick_R": [.252544224, .277291417, .166225955],
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def raw_glb(path):
    content = path.read_bytes()
    length, kind = struct.unpack_from("<II", content, 12)
    assert kind == 0x4E4F534A, "Expected JSON first chunk"
    document = json.loads(content[20:20 + length].decode("utf8"))
    binary = content[28 + length:]
    return document, binary


def source_texture_hashes(path):
    document, binary = raw_glb(path)
    result = []
    for image in document.get("images", []):
        view = document["bufferViews"][image["bufferView"]]
        start = view.get("byteOffset", 0)
        data = binary[start:start + view["byteLength"]]
        result.append(hashlib.sha256(data).hexdigest())
    return result


def triangles(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def bounds(obj):
    points = [obj.matrix_world @ v.co for v in obj.data.vertices]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    return lo, hi


def to_gltf(point):
    return [float(point.x), float(point.z), float(-point.y)]


def from_gltf(point):
    return Vector((point[0], -point[2], point[1]))


def detect_sconce_wick(obj):
    """UV-sample actual black wick tips above the wax, not a guessed offset."""
    mesh = obj.data
    texture = next(node.image for node in obj.data.materials[0].node_tree.nodes
                   if node.type == "TEX_IMAGE" and node.image)
    pixels = list(texture.pixels[:])
    width, height = texture.size
    uv = mesh.uv_layers.active.data
    lo, hi = bounds(obj)
    dark = []
    for loop in mesh.loops:
        point = obj.matrix_world @ mesh.vertices[loop.vertex_index].co
        # Only the highest 22% of the candle assembly can be wick geometry.
        if point.z < lo.z + .78 * (hi.z - lo.z):
            continue
        u, v = uv[loop.index].uv
        x = min(width - 1, max(0, int(u * width)))
        y = min(height - 1, max(0, int(v * height)))
        offset = (y * width + x) * 4
        # Blender exposes image samples as stored sRGB float values here.
        if max(pixels[offset:offset + 3]) < 100 / 255:
            dark.append(point)
    if not dark:
        raise RuntimeError("No dark sconce wick tip found; do not invent anchor")
    top = max(p.z for p in dark)
    tips = [p for p in dark if p.z >= top - .004]
    center = sum(tips, Vector()) / len(tips)
    center.z = top
    return center


def prepare_normals(obj, angle):
    """Weld positions, retain per-loop UVs, and use deliberate hard-edge normals."""
    mesh = obj.data
    before = len(mesh.vertices)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=1e-9)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    for face in bm.faces:
        face.smooth = True
    for edge in bm.edges:
        edge.smooth = len(edge.link_faces) == 2 and edge.calc_face_angle(0) < math.radians(angle)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return {"verticesBeforeWeld": before, "verticesAfterWeld": len(mesh.vertices),
            "normalHardEdgeAngleDegrees": angle}


def repair_materials(obj, spec):
    for material in obj.data.materials:
        material.name = spec["slug"] + "-atlas-nonmetal"
        material.use_nodes = True
        bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Metallic"].default_value = 0
        bsdf.inputs["Roughness"].default_value = spec["roughness"]
        material.diffuse_color = (1, 1, 1, 1)
        material["sourceAtlasRetained"] = True
        material["materialLimitation"] = "Single colored atlas; no newly authored normal/AO/MR maps"


def decimate(obj, ceiling, angle):
    bpy.context.view_layer.objects.active = obj
    count = triangles(obj.data)
    if count > ceiling:
        modifier = obj.modifiers.new("Technical silhouette LOD", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = (ceiling - 12) / count
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    # Keep triangulation explicit for deterministic inspection/export counts.
    modifier = obj.modifiers.new("Runtime triangles", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    obj.data.set_sharp_from_angle(angle=math.radians(angle))
    # Blender collapse interpolation can overshoot a source atlas border by a
    # fraction of a texel. Correct only that tiny numerical drift, never reshape
    # or regenerate the atlas (all supplied sources use UVs inside [0, 1]).
    uv_corrections = 0
    for layer in obj.data.uv_layers:
        for corner in layer.data:
            for axis in (0, 1):
                value = corner.uv[axis]
                if not 0 <= value <= 1:
                    assert -.003 <= value <= 1.003, "Unexpected UV drift requires inspection"
                    corner.uv[axis] = min(1, max(0, value))
                    uv_corrections += 1
    obj.data.update()
    assert triangles(obj.data) <= ceiling, (obj.name, triangles(obj.data), ceiling)
    return uv_corrections


def exported_metrics(path):
    document, binary = raw_glb(path)
    count = sum(document["accessors"][primitive["indices"]]["count"] // 3
                for mesh in document["meshes"] for primitive in mesh["primitives"])
    assert all("NORMAL" in primitive["attributes"]
               for mesh in document["meshes"] for primitive in mesh["primitives"])
    assert all(mat["pbrMetallicRoughness"]["metallicFactor"] == 0
               for mat in document["materials"])
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size,
            "sha256": sha256(path), "triangles": count,
            "meshes": len(document["meshes"]), "materials": len(document["materials"]),
            "images": len(document["images"]), "normalAttributesPresent": True,
            "metallicFactor": 0, "embeddedAtlasSha256": source_texture_hashes(path)}


def render_review(obj, slug, lod):
    """Temporary diagnostic only, never a scene/runtime quality claim."""
    scene = bpy.context.scene
    lo, hi = bounds(obj)
    center = (lo + hi) / 2
    extent = max(hi - lo)
    scene.world = bpy.data.worlds.new("Technical review world")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (.2, .2, .2, 1)
    background.inputs["Strength"].default_value = .55
    def look_at(thing):
        thing.rotation_euler = (center - thing.location).to_track_quat("-Z", "Y").to_euler()
    temporary = []
    for location, strength in [((2, -3, 4), 500), ((-3, -1, 2), 300)]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(location) * extent)
        light = bpy.context.object
        light.data.energy = strength * extent * extent
        light.data.size = 3 * extent
        look_at(light)
        temporary.append(light)
    bpy.ops.object.camera_add(location=center + Vector((.8, -3, 2 if slug in ("witch-workbench", "ritual-platform", "open-grimoire") else 1)) * extent)
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = extent * 1.48
    look_at(camera)
    scene.camera = camera
    temporary.append(camera)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 720
    scene.render.resolution_y = 560
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    output = ROOT / ".tmp-qa" / "mockup-lod-review"
    output.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(output / f"{slug}-{lod}.png")
    bpy.ops.render.render(write_still=True)
    for item in temporary:
        bpy.data.objects.remove(item, do_unlink=True)


def prepare(spec):
    reset()
    source = ROOT / "art" / "source" / spec["batch"] / spec["slug"] / "source.glb"
    original_hash = sha256(source)
    original_texture_hashes = source_texture_hashes(source)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    assert len(meshes) == 1, "These supplied sources are each one mesh"
    obj = meshes[0]
    obj.name = spec["slug"]
    raw_lo, raw_hi = bounds(obj)
    raw_wicks = {name: from_gltf(point) for name, point in RAW_CANDLE_WICKS.items()} if spec["slug"] == "triple-candleholder" else {}
    if spec["slug"] == "wall-candle-sconce":
        raw_wicks["Wick"] = detect_sconce_wick(obj)
    # Blender Z-up rotation -90 maps source +X toward runtime glTF +Z.
    rotation = Matrix.Rotation(-math.pi / 2 if spec.get("quarter_turn") else 0, 4, "Z")
    for vertex in obj.data.vertices:
        vertex.co = rotation @ (obj.matrix_world @ vertex.co)
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.update()
    lo, hi = bounds(obj)
    size = hi - lo
    origin = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    if "size" in spec:
        sx, sy, sz = spec["size"]
        scales = Vector((sx / size.x, sz / size.y, sy / size.z))
    else:
        factor = spec["height"] / size.z if "height" in spec else spec["width"] / size.x
        scales = Vector((factor, factor, factor))
    def transform(point):
        moved = rotation @ point - origin
        return Vector(tuple(moved[i] * scales[i] for i in range(3)))
    for vertex in obj.data.vertices:
        moved = vertex.co - origin
        vertex.co = Vector(tuple(moved[i] * scales[i] for i in range(3)))
    obj.data.update()
    normal_angle = spec.get("normal_angle", 48)
    technical = prepare_normals(obj, normal_angle)
    repair_materials(obj, spec)
    anchors = {}
    for name, raw_point in raw_wicks.items():
        point = transform(raw_point)
        empty = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(empty)
        empty.empty_display_type = "PLAIN_AXES"
        empty.empty_display_size = .03
        empty.location = point
        empty["anchorMethod"] = "Source mesh UV sampled dark wick tip"
        anchors[name] = to_gltf(point)
    obj["sourceSha256"] = original_hash
    obj["preparation"] = "Technical normals/materials/pivot/LOD only; image-to-3D identity preserved"
    prepared_lo, prepared_hi = bounds(obj)
    # Preserve a prepared full-resolution mesh solely in memory for both LODs.
    master = obj.data.copy()
    output = RUNTIME / spec["slug"]
    output.mkdir(parents=True, exist_ok=True)
    lods = {}
    for name, ceiling in zip(("desktop", "mobile"), spec["budgets"]):
        obj.data = master.copy()
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        uv_corrections = decimate(obj, ceiling, normal_angle)
        # Collapse LODs can move their extreme base by millimeters. Ground each
        # exported mesh exactly and translate its wick anchors by the same amount.
        lod_min, _ = bounds(obj)
        ground_shift = -lod_min.z
        for vertex in obj.data.vertices:
            vertex.co.z += ground_shift
        obj.data.update()
        for anchor_name, point in anchors.items():
            bpy.data.objects[anchor_name].location = from_gltf(point) + Vector((0, 0, ground_shift))
        for other in bpy.context.scene.objects:
            other.select_set(other.type == "MESH" or other.name in anchors)
        path = output / f'{spec["slug"]}-{name}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                                  export_yup=True, export_normals=True, export_texcoords=True,
                                  export_materials="EXPORT", export_extras=True,
                                  export_image_format="AUTO", export_keep_originals=False,
                                  export_animations=False, export_cameras=False, export_lights=False)
        lods[name] = exported_metrics(path)
        lods[name]["atlasBorderUvCorrections"] = uv_corrections
        # Exporter may re-encode PNG containers; compare embedded pixels in QA.
        lods[name]["originalEncodedAtlasRetained"] = lods[name]["embeddedAtlasSha256"] == original_texture_hashes
        lods[name]["groundShiftY"] = ground_shift
        lods[name]["anchors"] = {key: to_gltf(bpy.data.objects[key].location) for key in anchors}
        post_lo, post_hi = bounds(obj)
        lods[name]["boundsMinXYZ"] = [post_lo.x, post_lo.z, -post_hi.y]
        lods[name]["boundsMaxXYZ"] = [post_hi.x, post_hi.z, -post_lo.y]
        if REVIEW:
            render_review(obj, spec["slug"], name)
    assert sha256(source) == original_hash, "Raw source must never change"
    result = {"slug": spec["slug"], "source": source.relative_to(ROOT).as_posix(),
              "sourceSha256": original_hash, "sourceEmbeddedAtlasSha256": original_texture_hashes,
              "sourceSizeXYZ": [raw_hi.x - raw_lo.x, raw_hi.z - raw_lo.z, raw_hi.y - raw_lo.y],
              "rawSourceYawDegrees": -90 if spec.get("quarter_turn") else 0,
              "front": "+Z; shelf/arch/sconce source +X rotated to +Z",
              "axisScaleXYZ": [scales.x, scales.z, scales.y],
              "originBeforeScaleBlenderXYZ": list(origin),
              "preparedSizeXYZ": [prepared_hi.x - prepared_lo.x, prepared_hi.z - prepared_lo.z,
                                  prepared_hi.y - prepared_lo.y],
              "anchors": anchors, "technical": technical, "roughnessFactor": spec["roughness"],
              "lods": lods}
    print("PREPARED", json.dumps(result), flush=True)
    return result


def main():
    assets = [prepare(spec) for spec in ASSETS]
    # The user later supplied a floor that already has PBR textures and two LODs.
    # Its separate mechanical preparation must not be erased by this rebuild.
    previous = json.loads(MANIFEST.read_text(encoding="utf8")) if MANIFEST.exists() else {}
    floor_module = previous.get("floorModule", {"status": "source-glb-missing", "runtimeReplacementCreated": False})
    report = {"version": 1, "date": "2026-10-13", "purpose": "Local opt-in before/after environment review",
              "status": "technical-exports-created-scene-acceptance-pending",
              "generator": "art/blender/prepare_mockup_environment.py", "coordinateSystem": "glTF Y-up, width X, front +Z, base Y=0",
              "rawSourcesUnmodified": True, "floorModule": floor_module,
              "limitations": ["Single existing colored atlas per mesh; no new PBR normal/AO/MR textures",
                              "Workbench/wall/arch/platform are deliberately nonuniformly fitted; actual camera acceptance required",
                              "LOD acceptance and in-game placement/loading/performance remain separate checks",
                              "No new geometry or creative Blender replacements were generated"],
              "assets": assets}
    MANIFEST.write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
    print("MANIFEST", str(MANIFEST), flush=True)


if __name__ == "__main__":
    main()
