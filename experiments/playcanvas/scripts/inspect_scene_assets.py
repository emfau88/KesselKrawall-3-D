"""Print Blender-evaluated world bounds for the shared PC-C2 GLB assets."""

from pathlib import Path

import bpy
from mathutils import Vector


ASSET_FILES = (
    "hero-workbench.glb",
    "hero-cauldron-player.glb",
    "ingredient-chili.glb",
    "ingredient-slime-shroom.glb",
    "ingredient-rune-shell.glb",
)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def bounds_for(path: Path) -> tuple[list[float], list[float]]:
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(path))
    points = [obj.matrix_world @ Vector(corner) for obj in bpy.context.scene.objects if obj.type == "MESH" for corner in obj.bound_box]
    minimum = [min(point[index] for point in points) for index in range(3)]
    maximum = [max(point[index] for point in points) for index in range(3)]
    return minimum, maximum


repo_root = Path(__file__).resolve().parents[3]
asset_root = repo_root / "public" / "assets" / "hero"

for filename in ASSET_FILES:
    minimum, maximum = bounds_for(asset_root / filename)
    size = [maximum[index] - minimum[index] for index in range(3)]
    print(f"PC_C2_BOUNDS|{filename}|min={minimum}|max={maximum}|size={size}")
