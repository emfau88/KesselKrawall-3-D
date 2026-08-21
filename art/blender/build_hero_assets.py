"""Build the original KesselKrawall 3D hero asset pack with Blender.

Run from the repository root:

    "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" \
      --background --python art/blender/build_hero_assets.py

The script is the editable source of truth. It exports compact GLBs to
``public/assets/hero`` and neutral review renders to ``art/blender/previews``.
No legacy bitmap is read or embedded; the old game and production mockups are
visual references only.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
EXPORT_DIR = ROOT / "public" / "assets" / "hero"
PREVIEW_DIR = ROOT / "art" / "blender" / "previews"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.55,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = color
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if emission and emission_input:
            emission_input.default_value = emission
        strength_input = bsdf.inputs.get("Emission Strength")
        if strength_input:
            strength_input.default_value = emission_strength
    return mat


def finish(obj: bpy.types.Object, mat: bpy.types.Material, *, bevel: float = 0.0, smooth: bool = True) -> bpy.types.Object:
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Crafted edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    if smooth and hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def cube(name: str, location, scale, mat, *, rotation=(0, 0, 0), bevel=0.06) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return finish(obj, mat, bevel=bevel, smooth=False)


def sphere(name: str, location, scale, mat, *, segments=32, rings=20) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return finish(obj, mat, smooth=True)


def cylinder(name: str, location, radius, depth, mat, *, vertices=32, rotation=(0, 0, 0), bevel=0.035) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, bevel=bevel, smooth=True)


def cone(name: str, location, radius1, radius2, depth, mat, *, vertices=24, rotation=(0, 0, 0), bevel=0.025) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, bevel=bevel, smooth=True)


def torus(name: str, location, major_radius, minor_radius, mat, *, rotation=(0, 0, 0), major_segments=48, minor_segments=12) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, smooth=True)


def curve(name: str, points, bevel_depth: float, mat, *, cyclic=False, resolution=3) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = resolution
    data.bevel_depth = bevel_depth
    data.bevel_resolution = 4
    data.use_fill_caps = True
    data.resolution_u = 12
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for control, point in zip(spline.bezier_points, points):
        control.co = point
        control.handle_left_type = "AUTO"
        control.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def vessel(name: str, profile, mat, *, segments=48) -> bpy.types.Object:
    """Create an open, rotationally symmetric cauldron body."""
    vertices = []
    for z, radius in profile:
        for index in range(segments):
            angle = index / segments * math.tau
            vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
    faces = []
    for ring_index in range(len(profile) - 1):
        for index in range(segments):
            next_index = (index + 1) % segments
            a = ring_index * segments + index
            b = ring_index * segments + next_index
            c = (ring_index + 1) * segments + next_index
            d = (ring_index + 1) * segments + index
            faces.append((a, b, c, d))
    faces.append(tuple(reversed(range(segments))))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    bevel_mod = obj.modifiers.new("Forged vessel edge", "BEVEL")
    bevel_mod.width = 0.035
    bevel_mod.segments = 3
    return obj


def select_runtime_objects() -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "CURVE"} and not obj.name.startswith("Preview_"):
            obj.select_set(True)


def export_glb(name: str) -> None:
    select_runtime_objects()
    bpy.ops.export_scene.gltf(
        filepath=str(EXPORT_DIR / f"{name}.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
        export_animations=False,
    )


def look_at(obj: bpy.types.Object, target) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_preview(name: str, camera_location, target, ground_z: float) -> None:
    world = bpy.context.scene.world or bpy.data.worlds.new("Preview world")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.008, 0.018, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.18

    preview_ground = material("Preview ground", (0.045, 0.028, 0.055, 1), roughness=0.9)
    ground = cylinder("Preview_Ground", (0, 0, ground_z - 0.08), 4.8, 0.16, preview_ground, vertices=64, bevel=0.04)
    ground.name = "Preview_Ground"

    bpy.ops.object.light_add(type="AREA", location=(4.2, -5.4, 6.3))
    key = bpy.context.object
    key.name = "Preview_Key"
    key.data.energy = 920
    key.data.shape = "DISK"
    key.data.size = 4.2
    key.data.color = (1.0, 0.58, 0.29)
    look_at(key, target)

    bpy.ops.object.light_add(type="AREA", location=(-4.5, -1.2, 3.8))
    fill = bpy.context.object
    fill.name = "Preview_Fill"
    fill.data.energy = 720
    fill.data.size = 5.0
    fill.data.color = (0.30, 0.42, 1.0)
    look_at(fill, target)

    bpy.ops.object.light_add(type="POINT", location=(0.8, 2.2, 4.2))
    rim = bpy.context.object
    rim.name = "Preview_Rim"
    rim.data.energy = 480
    rim.data.color = (0.62, 0.32, 1.0)

    bpy.ops.object.camera_add(location=camera_location)
    camera = bpy.context.object
    camera.name = "Preview_Camera"
    camera.data.lens = 57
    look_at(camera, target)
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_DIR / f"{name}.png")
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def add_rivets(radius: float, z: float, count: int, mat, *, front_only=False, size=0.045) -> None:
    for index in range(count):
        angle = (index / count) * math.tau
        y = math.sin(angle) * radius
        if front_only and y > 0.22:
            continue
        sphere(
            f"Rivet_{index:02d}",
            (math.cos(angle) * radius, y, z),
            (size, size, size),
            mat,
            segments=16,
            rings=10,
        )


def add_face(*, moor: bool, dark, ivory, pupil, accent, bronze) -> None:
    eye_z = 0.18 if moor else 0.22
    eye_x = 0.29
    surface = -1.17 if moor else -1.08
    for side in (-1, 1):
        sphere(
            f"Eye_{side}",
            (side * eye_x, surface, eye_z),
            (0.22, 0.10, 0.25 if not moor else 0.18),
            ivory,
        )
        sphere(
            f"Pupil_{side}",
            (side * (eye_x + (0.025 if moor else 0)), surface - 0.105, eye_z - 0.01),
            (0.075, 0.035, 0.105),
            pupil,
            segments=20,
            rings=12,
        )
        curve(
            f"Brow_{side}",
            [
                (side * 0.49, surface - 0.07, eye_z + 0.28),
                (side * 0.30, surface - 0.10, eye_z + (0.36 if moor else 0.32)),
                (side * 0.11, surface - 0.07, eye_z + (0.26 if moor else 0.30)),
            ],
            0.045 if not moor else 0.06,
            dark,
        )

    if moor:
        cone("Crooked_nose", (0, surface - 0.19, -0.02), 0.21, 0.06, 0.62, bronze, rotation=(math.pi / 2, 0, 0), bevel=0.03)
        curve(
            "Moor_smirk",
            [(-0.36, surface - 0.06, -0.35), (-0.12, surface - 0.13, -0.43), (0.15, surface - 0.13, -0.40), (0.38, surface - 0.04, -0.27)],
            0.045,
            dark,
        )
    else:
        sphere("Nose", (0, surface - 0.13, 0.0), (0.12, 0.07, 0.13), bronze, segments=20, rings=12)
        curve(
            "Smile",
            [(-0.34, surface - 0.07, -0.24), (-0.20, surface - 0.15, -0.43), (0, surface - 0.19, -0.49), (0.20, surface - 0.15, -0.43), (0.34, surface - 0.07, -0.24)],
            0.055,
            dark,
        )
        curve(
            "Moustache_left",
            [(-0.02, surface - 0.17, -0.17), (-0.22, surface - 0.21, -0.18), (-0.44, surface - 0.16, -0.10), (-0.56, surface - 0.09, -0.18)],
            0.055,
            bronze,
        )
        curve(
            "Moustache_right",
            [(0.02, surface - 0.17, -0.17), (0.22, surface - 0.21, -0.18), (0.44, surface - 0.16, -0.10), (0.56, surface - 0.09, -0.18)],
            0.055,
            bronze,
        )


def build_player_cauldron() -> tuple:
    reset_scene()
    iron = material("Hero blackened iron", (0.055, 0.045, 0.06, 1), metallic=0.78, roughness=0.3)
    iron_hi = material("Hero iron edge", (0.12, 0.095, 0.13, 1), metallic=0.72, roughness=0.36)
    bronze = material("Hero aged brass", (0.52, 0.25, 0.075, 1), metallic=0.82, roughness=0.26)
    bronze_hi = material("Hero gold edge", (0.95, 0.53, 0.12, 1), metallic=0.72, roughness=0.2)
    ivory = material("Hero warm ivory", (0.92, 0.76, 0.52, 1), roughness=0.42)
    pupil = material("Hero pupils", (0.012, 0.006, 0.014, 1), roughness=0.22)
    cyan = material(
        "Hero cyan rune",
        (0.08, 0.64, 0.82, 1),
        metallic=0.14,
        roughness=0.22,
        emission=(0.04, 0.55, 0.9, 1),
        emission_strength=3.2,
    )
    liquid = material(
        "Hero amber brew",
        (0.95, 0.22, 0.045, 1),
        metallic=0.04,
        roughness=0.16,
        emission=(1.0, 0.15, 0.02, 1),
        emission_strength=2.4,
    )

    vessel("Hero_body", [(-0.94, 0.46), (-0.78, 0.82), (-0.36, 1.10), (0.18, 1.17), (0.58, 1.05), (0.75, 0.91)], iron)
    sphere("Hero_belly_plate", (0, -1.035, -0.20), (0.78, 0.13, 0.66), iron_hi)
    torus("Hero_rim_outer", (0, 0, 0.78), 0.97, 0.13, bronze_hi)
    torus("Hero_rim_inner", (0, 0, 0.79), 0.80, 0.055, bronze)
    cylinder("Hero_liquid", (0, 0, 0.78), 0.80, 0.075, liquid, vertices=64, bevel=0.015)
    add_rivets(0.98, 0.80, 16, bronze, size=0.042)

    for side in (-1, 1):
        torus(f"Hero_handle_{side}", (side * 1.17, 0, 0.10), 0.34, 0.085, bronze, rotation=(0, math.pi / 2, 0))
        sphere(f"Hero_handle_mount_{side}", (side * 1.05, -0.02, 0.10), (0.18, 0.14, 0.22), bronze)
        sphere(f"Hero_boot_{side}", (side * 0.63, -0.10, -0.95), (0.34, 0.44, 0.22), iron_hi)
        cube(f"Hero_boot_toe_{side}", (side * 0.63, -0.32, -1.04), (0.30, 0.28, 0.12), bronze, bevel=0.08)
        cube(
            f"Hero_vertical_trim_{side}",
            (side * 0.69, -1.00, -0.16),
            (0.055, 0.045, 0.58),
            bronze,
            rotation=(0.10, side * 0.08, side * -0.16),
            bevel=0.025,
        )

    add_face(moor=False, dark=iron, ivory=ivory, pupil=pupil, accent=cyan, bronze=bronze)
    cube("Hero_rune_mount", (0, -1.17, -0.62), (0.31, 0.055, 0.31), bronze, rotation=(0, 0, math.pi / 4), bevel=0.05)
    sphere("Hero_rune_gem", (0, -1.24, -0.62), (0.16, 0.045, 0.19), cyan, segments=24, rings=16)
    for side in (-1, 1):
        curve(
            f"Hero_scroll_{side}",
            [
                (side * 0.22, -1.17, -0.58),
                (side * 0.44, -1.16, -0.70),
                (side * 0.67, -1.08, -0.64),
                (side * 0.72, -1.03, -0.47),
            ],
            0.045,
            bronze,
        )
    return ("hero-cauldron-player", (3.8, -6.6, 3.0), (0, 0, -0.05), -1.17)


def add_mushroom(name: str, location, scale_value: float, stem, cap) -> None:
    x, y, z = location
    cylinder(f"{name}_stem", (x, y, z), 0.08 * scale_value, 0.32 * scale_value, stem, vertices=16, bevel=0.02)
    sphere(f"{name}_cap", (x, y, z + 0.18 * scale_value), (0.23 * scale_value, 0.23 * scale_value, 0.10 * scale_value), cap)


def build_moor_cauldron() -> tuple:
    reset_scene()
    iron = material("Moor pitted iron", (0.075, 0.065, 0.055, 1), metallic=0.48, roughness=0.58)
    iron_hi = material("Moor worn iron", (0.16, 0.12, 0.08, 1), metallic=0.42, roughness=0.64)
    rust = material("Moor rusted rim", (0.31, 0.15, 0.06, 1), metallic=0.38, roughness=0.68)
    bark = material("Moor root handles", (0.19, 0.095, 0.035, 1), roughness=0.88)
    moss = material("Moor moss", (0.20, 0.31, 0.055, 1), roughness=0.96)
    moss_hi = material("Moor fresh moss", (0.39, 0.55, 0.09, 1), roughness=0.9)
    ivory = material("Moor eyes", (0.70, 0.65, 0.38, 1), roughness=0.58)
    pupil = material(
        "Moor pupil glow",
        (0.38, 0.62, 0.04, 1),
        roughness=0.24,
        emission=(0.42, 0.85, 0.02, 1),
        emission_strength=1.8,
    )
    poison = material(
        "Moor poison brew",
        (0.38, 0.66, 0.035, 1),
        roughness=0.18,
        emission=(0.32, 0.88, 0.015, 1),
        emission_strength=2.6,
    )
    fungus = material("Moor shelf fungus", (0.48, 0.23, 0.08, 1), roughness=0.86)
    fungus_edge = material("Moor fungus edge", (0.75, 0.42, 0.15, 1), roughness=0.82)

    vessel("Moor_body", [(-0.96, 0.50), (-0.82, 0.88), (-0.40, 1.18), (0.18, 1.26), (0.62, 1.12), (0.78, 0.96)], iron)
    sphere("Moor_belly_wear", (0.04, -1.13, -0.18), (0.86, 0.13, 0.70), iron_hi)
    torus("Moor_rim", (0, 0, 0.82), 1.02, 0.16, rust)
    torus("Moor_inner_rim", (0, 0, 0.83), 0.82, 0.065, iron_hi)
    cylinder("Moor_liquid", (0, 0, 0.82), 0.83, 0.08, poison, vertices=64, bevel=0.015)
    add_rivets(1.04, 0.81, 14, rust, size=0.05)

    for side in (-1, 1):
        curve(
            f"Moor_root_handle_{side}",
            [
                (side * 1.02, 0.0, 0.25),
                (side * 1.33, -0.02, 0.37),
                (side * 1.45, -0.02, 0.08),
                (side * 1.28, -0.03, -0.20),
                (side * 1.08, -0.04, -0.05),
            ],
            0.105,
            bark,
        )
        sphere(f"Moor_foot_{side}", (side * 0.68, -0.02, -1.0), (0.38, 0.46, 0.22), iron_hi)
        add_mushroom(f"Moor_foot_fungus_{side}", (side * 0.83, -0.30, -0.83), 0.65, bark, fungus)

    add_face(moor=True, dark=iron, ivory=ivory, pupil=pupil, accent=poison, bronze=iron_hi)
    for index, (x, y, z, sx, sy, sz) in enumerate(
        [
            (-0.66, -1.10, 0.55, 0.42, 0.08, 0.16),
            (0.60, -1.11, 0.50, 0.33, 0.07, 0.13),
            (-0.54, -1.12, -0.45, 0.36, 0.07, 0.15),
            (0.62, -1.12, -0.52, 0.28, 0.06, 0.12),
        ]
    ):
        sphere(f"Moor_moss_patch_{index}", (x, y, z), (sx, sy, sz), moss if index % 2 else moss_hi, segments=20, rings=12)

    for index, (x, y, z, scale_value) in enumerate(
        [(-1.08, -0.20, 0.45, 0.95), (1.10, -0.16, -0.23, 0.82), (-0.78, -0.66, -0.75, 0.62)]
    ):
        add_mushroom(f"Moor_mushroom_{index}", (x, y, z), scale_value, fungus_edge, fungus)

    for index, (x, y, radius) in enumerate([(-0.30, -0.18, 0.09), (0.18, 0.20, 0.11), (0.38, -0.12, 0.07)]):
        sphere(f"Moor_bubble_{index}", (x, y, 0.91), (radius, radius, radius), poison, segments=16, rings=10)
    return ("hero-cauldron-moor", (4.0, -7.0, 3.1), (0, 0, -0.06), -1.20)


def build_chili() -> tuple:
    reset_scene()
    red = material("Chili lacquer red", (0.72, 0.025, 0.012, 1), roughness=0.28)
    red_hi = material(
        "Chili hot core",
        (1.0, 0.16, 0.025, 1),
        roughness=0.18,
        emission=(1.0, 0.075, 0.005, 1),
        emission_strength=1.6,
    )
    green = material("Chili stem", (0.16, 0.31, 0.035, 1), roughness=0.74)
    curve(
        "Chili_body",
        [(-0.18, 0, 0.54), (-0.26, 0, 0.22), (-0.19, 0, -0.10), (0.02, 0, -0.38), (0.34, 0, -0.48)],
        0.16,
        red,
    )
    # Curve bevel caps are not exported consistently by every glTF path.  A
    # small tapered end gives the pepper a deliberate, closed silhouette in
    # Blender previews and in Three.js instead of exposing a hollow tube.
    sphere("Chili_tip", (0.35, 0, -0.48), (0.17, 0.16, 0.15), red, segments=20, rings=12)
    curve(
        "Chili_glow_seam",
        [(-0.26, -0.135, 0.42), (-0.30, -0.15, 0.12), (-0.22, -0.145, -0.10), (-0.02, -0.13, -0.31)],
        0.018,
        red_hi,
    )
    cone("Chili_stem", (-0.20, 0, 0.72), 0.11, 0.045, 0.38, green, rotation=(0, -0.20, -0.10), bevel=0.02)
    for index, angle in enumerate((-0.8, -0.25, 0.35, 0.92)):
        sphere(f"Chili_leaf_{index}", (-0.20 + math.sin(angle) * 0.12, 0.0, 0.57), (0.14, 0.07, 0.035), green, segments=16, rings=10)
    return ("ingredient-chili", (2.2, -4.0, 1.7), (0, 0, 0), -0.62)


def build_slime_shroom() -> tuple:
    reset_scene()
    stem = material("Slime mushroom stem", (0.43, 0.42, 0.22, 1), roughness=0.78)
    cap = material("Slime mushroom cap", (0.42, 0.69, 0.055, 1), roughness=0.34)
    glow = material(
        "Slime glow",
        (0.68, 0.95, 0.08, 1),
        roughness=0.22,
        emission=(0.44, 1.0, 0.02, 1),
        emission_strength=1.8,
    )
    cylinder("Shroom_stem", (0, 0, -0.18), 0.22, 0.82, stem, vertices=28, bevel=0.08)
    sphere("Shroom_cap", (0, 0, 0.32), (0.62, 0.58, 0.28), cap)
    sphere("Shroom_cap_lower", (0, 0, 0.20), (0.48, 0.46, 0.14), glow)
    for index, (x, y, size) in enumerate([(-0.24, -0.35, 0.11), (0.08, -0.48, 0.08), (0.30, -0.24, 0.09), (-0.10, 0.18, 0.075)]):
        sphere(f"Shroom_spot_{index}", (x, y, 0.48 - abs(x) * 0.22), (size, size * 0.55, size * 0.45), glow, segments=16, rings=10)
    for index, (x, y, length) in enumerate([(-0.36, -0.22, 0.34), (0.16, -0.47, 0.44), (0.43, 0.02, 0.28)]):
        curve(
            f"Shroom_drip_{index}",
            [(x, y, 0.27), (x * 1.03, y * 1.02, 0.06), (x * 1.01, y, 0.27 - length)],
            0.055,
            glow,
        )
        sphere(f"Shroom_drop_{index}", (x, y, 0.23 - length), (0.075, 0.075, 0.10), glow, segments=16, rings=10)
    return ("ingredient-slime-shroom", (2.5, -4.1, 1.8), (0, 0, 0), -0.65)


def shell_mesh(name: str, outer, inner) -> bpy.types.Object:
    segments = 18
    rings = [
        (-0.58, 0.24),
        (-0.42, 0.42),
        (-0.10, 0.52),
        (0.24, 0.54),
        (0.48, 0.50),
    ]
    vertices = []
    for ring_index, (z, radius) in enumerate(rings):
        for index in range(segments):
            angle = index / segments * math.tau
            top_jag = 0
            if ring_index == len(rings) - 1:
                top_jag = (0.12 if index % 3 == 0 else -0.08 if index % 3 == 1 else 0.04)
            vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, z + top_jag))
    faces = []
    for ring_index in range(len(rings) - 1):
        for index in range(segments):
            next_index = (index + 1) % segments
            a = ring_index * segments + index
            b = ring_index * segments + next_index
            c = (ring_index + 1) * segments + next_index
            d = (ring_index + 1) * segments + index
            faces.append((a, b, c, d))
    faces.append(tuple(reversed(range(segments))))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(outer)
    mesh.materials.append(inner)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    solidify = obj.modifiers.new("Shell thickness", "SOLIDIFY")
    solidify.thickness = 0.055
    solidify.material_offset = 1
    bevel_mod = obj.modifiers.new("Worn shell edge", "BEVEL")
    bevel_mod.width = 0.018
    bevel_mod.segments = 2
    return obj


def build_rune_shell() -> tuple:
    reset_scene()
    shell = material("Runeshell warm ceramic", (0.78, 0.67, 0.47, 1), roughness=0.68)
    inner = material("Runeshell inner", (0.30, 0.23, 0.16, 1), roughness=0.82)
    crack = material("Runeshell cracks", (0.22, 0.13, 0.08, 1), roughness=0.75)
    rune = material(
        "Runeshell cyan rune",
        (0.10, 0.72, 0.90, 1),
        roughness=0.20,
        emission=(0.04, 0.72, 1.0, 1),
        emission_strength=2.7,
    )
    shell_mesh("Runeshell_body", shell, inner)
    curve("Runeshell_crack_left", [(-0.12, -0.52, 0.30), (-0.20, -0.55, 0.08), (-0.10, -0.56, -0.08), (-0.25, -0.48, -0.28)], 0.018, crack)
    curve("Runeshell_crack_right", [(0.18, -0.51, 0.38), (0.08, -0.57, 0.18), (0.20, -0.55, 0.03)], 0.016, crack)
    torus("Runeshell_rune_ring", (0, -0.565, -0.10), 0.20, 0.026, rune, rotation=(math.pi / 2, 0, 0), major_segments=32, minor_segments=8)
    for index, angle in enumerate((0, math.tau / 3, math.tau * 2 / 3)):
        sphere(
            f"Runeshell_rune_{index}",
            (math.cos(angle) * 0.20, -0.595, -0.10 + math.sin(angle) * 0.20),
            (0.045, 0.025, 0.045),
            rune,
            segments=16,
            rings=10,
        )
    return ("ingredient-rune-shell", (2.4, -4.1, 1.9), (0, 0, 0), -0.66)


def build_workbench() -> tuple:
    reset_scene()
    wood = material("Workbench walnut", (0.24, 0.075, 0.028, 1), roughness=0.60)
    wood_hi = material("Workbench worn plank", (0.42, 0.15, 0.045, 1), roughness=0.54)
    wood_dark = material("Workbench dark frame", (0.095, 0.028, 0.018, 1), roughness=0.74)
    iron = material("Workbench iron", (0.075, 0.065, 0.075, 1), metallic=0.72, roughness=0.40)
    brass = material("Workbench brass trim", (0.50, 0.25, 0.075, 1), metallic=0.76, roughness=0.30)
    stone = material("Workbench ritual stone", (0.12, 0.095, 0.12, 1), roughness=0.78)
    rune = material(
        "Workbench ember rune",
        (0.90, 0.23, 0.045, 1),
        roughness=0.22,
        emission=(1.0, 0.12, 0.01, 1),
        emission_strength=2.2,
    )

    plank_width = 5.84 / 6
    for index in range(6):
        y = -2.44 + index * plank_width
        cube(
            f"Workbench_plank_{index}",
            (0, y, 0.04 + (index % 2) * 0.012),
            (3.92, plank_width * 0.48, 0.22),
            wood_hi if index % 3 == 0 else wood,
            bevel=0.055,
        )
        curve(
            f"Workbench_grain_{index}",
            [(-3.4, y - 0.05, 0.275), (-1.6, y + 0.03, 0.282), (0.2, y - 0.02, 0.28), (2.3, y + 0.035, 0.282), (3.4, y - 0.02, 0.275)],
            0.012,
            wood_dark,
        )

    cube("Workbench_front_apron", (0, -3.02, -0.42), (3.95, 0.18, 0.54), wood_dark, bevel=0.08)
    cube("Workbench_back_apron", (0, 3.02, -0.42), (3.95, 0.18, 0.54), wood_dark, bevel=0.08)
    cube("Workbench_left_rail", (-4.02, 0, -0.34), (0.20, 3.02, 0.46), wood_dark, bevel=0.08)
    cube("Workbench_right_rail", (4.02, 0, -0.34), (0.20, 3.02, 0.46), wood_dark, bevel=0.08)
    for x in (-3.45, 3.45):
        for y in (-2.28, 2.28):
            cube(f"Workbench_leg_{x}_{y}", (x, y, -1.10), (0.34, 0.38, 1.10), wood_dark, bevel=0.09)
            cube(f"Workbench_foot_{x}_{y}", (x, y - 0.10, -2.06), (0.47, 0.58, 0.14), iron, bevel=0.06)
            sphere(f"Workbench_corner_cap_{x}_{y}", (x, y, 0.30), (0.19, 0.19, 0.08), brass, segments=20, rings=12)

    cylinder("Workbench_hearth", (0, -0.55, 0.35), 1.34, 0.20, stone, vertices=48, bevel=0.055)
    torus("Workbench_hearth_brass", (0, -0.55, 0.48), 1.06, 0.055, brass)
    torus("Workbench_hearth_rune", (0, -0.55, 0.49), 0.76, 0.025, rune)
    add_rivets(1.16, 0.48, 14, brass, size=0.042)
    for side in (-1, 1):
        cube(f"Workbench_front_bracket_{side}", (side * 2.8, -3.22, -0.34), (0.42, 0.06, 0.62), iron, bevel=0.045)
        sphere(f"Workbench_front_rivet_{side}", (side * 2.8, -3.30, -0.30), (0.09, 0.04, 0.09), brass, segments=16, rings=10)
    return ("hero-workbench", (8.7, -11.8, 8.0), (0, 0, -0.55), -2.25)


def build_arena_dais() -> tuple:
    reset_scene()
    stone = material("Arena basalt", (0.075, 0.065, 0.085, 1), roughness=0.82)
    stone_hi = material("Arena worn stone", (0.16, 0.13, 0.17, 1), roughness=0.76)
    iron = material("Arena black iron", (0.06, 0.05, 0.065, 1), metallic=0.68, roughness=0.42)
    brass = material("Arena old brass", (0.45, 0.22, 0.07, 1), metallic=0.72, roughness=0.34)
    rune = material(
        "Arena violet rune",
        (0.42, 0.16, 0.68, 1),
        roughness=0.24,
        emission=(0.48, 0.12, 0.88, 1),
        emission_strength=2.1,
    )

    cylinder("Arena_outer_dais", (0, 0, -0.20), 5.55, 0.42, stone, vertices=64, bevel=0.08)
    cylinder("Arena_inner_dais", (0, 0, 0.04), 4.72, 0.22, stone_hi, vertices=64, bevel=0.05)
    torus("Arena_outer_trim", (0, 0, 0.16), 4.88, 0.085, iron, major_segments=64)
    torus("Arena_brass_circle", (0, 0, 0.17), 3.72, 0.055, brass, major_segments=64)
    torus("Arena_rune_circle", (0, 0, 0.18), 2.85, 0.032, rune, major_segments=64)
    for index in range(20):
        angle = index / 20 * math.tau
        radius = 4.32
        cube(
            f"Arena_rune_tile_{index:02d}",
            (math.cos(angle) * radius, math.sin(angle) * radius, 0.20),
            (0.25, 0.13, 0.055),
            stone_hi,
            rotation=(0, 0, angle),
            bevel=0.03,
        )
        sphere(
            f"Arena_rune_gem_{index:02d}",
            (math.cos(angle) * radius, math.sin(angle) * radius, 0.28),
            (0.065, 0.065, 0.035),
            rune,
            segments=14,
            rings=8,
        )
    for index, (x, y) in enumerate([(-4.25, -3.2), (4.25, -3.2), (-4.25, 3.2), (4.25, 3.2)]):
        cylinder(f"Arena_brazier_base_{index}", (x, y, 0.35), 0.48, 0.72, stone_hi, vertices=12, bevel=0.055)
        torus(f"Arena_brazier_ring_{index}", (x, y, 0.73), 0.34, 0.055, brass, major_segments=28)
    return ("hero-arena-dais", (8.8, -11.8, 8.4), (0, 0, 0), -0.44)


BUILDERS = [
    build_player_cauldron,
    build_moor_cauldron,
    build_chili,
    build_slime_shroom,
    build_rune_shell,
    build_workbench,
    build_arena_dais,
]


def main() -> None:
    print(f"Building hero assets in {ROOT}")
    for builder in BUILDERS:
        name, camera_location, target, ground_z = builder()
        export_glb(name)
        render_preview(name, camera_location, target, ground_z)
        print(f"Built {name}")
    reset_scene()
    print("Hero asset build complete")


if __name__ == "__main__":
    main()
