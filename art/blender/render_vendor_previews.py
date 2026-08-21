"""Render consistent QA previews for shortlisted Quaternius assets.

Set ``KESSEL_VENDOR_ROOT`` to the temporary folder containing the three
extracted Standard packs, then run this file through Blender in background
mode. Outputs are deliberately written below the git-ignored preview folder.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
VENDOR_ROOT = Path(os.environ["KESSEL_VENDOR_ROOT"])
OUTPUT_ROOT = ROOT / "art" / "blender" / "previews" / "vendor"

FANTASY = VENDOR_ROOT / "Fantasy Props MegaKit[Standard]" / "Exports" / "glTF"
VILLAGE = (
    VENDOR_ROOT
    / "Medieval Village MegaKit[Standard]"
    / "Medieval Village MegaKit[Standard]"
    / "glTF"
)
NATURE = VENDOR_ROOT / "Stylized Nature MegaKit[Standard]" / "glTF"

CANDIDATES = {
    "fantasy": [
        "Cauldron",
        "Workbench",
        "Workbench_Drawers",
        "Table_Large",
        "Bookcase_2",
        "Shelf_Arch",
        "Shelf_Small_Bottles",
        "BookStand",
        "Potion_1",
        "Potion_2",
        "CandleStick_Triple",
        "Lantern_Wall",
        "Chest_Wood",
        "Banner_1",
        "Torch_Metal",
        "Barrel",
    ],
    "village": [
        "Wall_UnevenBrick_Straight",
        "Wall_Arch",
        "Wall_Plaster_WoodGrid",
        "Wall_Plaster_Window_Wide_Round",
        "Floor_UnevenBrick",
        "DoorFrame_Round_Brick",
        "Stair_Interior_Solid",
        "Prop_Vine5",
    ],
    "nature": [
        "Mushroom_Common",
        "Mushroom_Laetiporus",
        "TwistedTree_3",
        "DeadTree_3",
        "Plant_7_Big",
        "Bush_Common",
        "Rock_Medium_2",
    ],
}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.diffuse_color = color
    result.use_nodes = True
    node = result.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = color
    node.inputs["Roughness"].default_value = 0.92
    return result


def bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [
        obj.matrix_world @ Vector(corner)
        for obj in objects
        if obj.type == "MESH"
        for corner in obj.bound_box
    ]
    if not corners:
        raise RuntimeError("Imported asset has no mesh bounds")
    minimum = Vector(tuple(min(point[index] for point in corners) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in corners) for index in range(3)))
    return minimum, maximum


def render_asset(category: str, source: Path, name: str) -> bool:
    output = OUTPUT_ROOT / f"{category}-{name}.png"
    if output.exists():
        print(f"skipped,{category},{name}")
        return False
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(source / f"{name}.gltf"))
    imported = list(bpy.context.scene.objects)
    minimum, maximum = bounds(imported)
    center = (minimum + maximum) * 0.5
    shift = Vector((-center.x, -center.y, -minimum.z))
    for obj in imported:
        obj.location += shift
        obj.rotation_euler.z += math.radians(12)

    minimum, maximum = bounds(imported)
    size = maximum - minimum
    span = max(size.x, size.y, size.z, 0.1)
    target = Vector((0, 0, size.z * 0.46))

    floor_material = material("PreviewFloor", (0.055, 0.038, 0.032, 1))
    bpy.ops.mesh.primitive_plane_add(size=max(span * 5, 5), location=(0, 0, -0.012))
    floor = bpy.context.object
    floor.data.materials.append(floor_material)

    bpy.ops.object.camera_add(location=(span * 2.7, -span * 4.1, span * 2.9))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(size.z * 1.42, size.x * 1.65, size.y * 1.65, 1)
    look_at(camera, target)
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-span * 2, -span * 2.5, span * 4))
    key = bpy.context.object
    key.data.energy = 850
    key.data.shape = "DISK"
    key.data.size = span * 3
    key.data.color = (1.0, 0.62, 0.34)
    look_at(key, target)

    bpy.ops.object.light_add(type="AREA", location=(span * 2.5, span, span * 2.5))
    fill = bpy.context.object
    fill.data.energy = 520
    fill.data.size = span * 2.5
    fill.data.color = (0.42, 0.55, 1.0)
    look_at(fill, target)

    bpy.ops.object.light_add(type="AREA", location=(0, span * 1.5, span * 4.5))
    rim = bpy.context.object
    rim.data.energy = 600
    rim.data.size = span * 2
    rim.data.color = (0.78, 0.48, 1.0)
    look_at(rim, target)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.world.color = (0.012, 0.008, 0.015)
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    return True


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    sources = {"fantasy": FANTASY, "village": VILLAGE, "nature": NATURE}
    for category, names in CANDIDATES.items():
        for name in names:
            path = sources[category] / f"{name}.gltf"
            if not path.exists():
                raise FileNotFoundError(path)
            if render_asset(category, sources[category], name):
                print(f"rendered,{category},{name}")


if __name__ == "__main__":
    main()
