"""Print lightweight geometry metrics for the runtime glTF/GLB catalog.

Run with Blender so the numbers reflect Blender's real glTF importer rather
than assumptions made from file size alone.
"""

from pathlib import Path
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
ASSET_ROOT = ROOT / "public" / "assets"


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def measure(path: Path) -> tuple[int, int, int, int, int, Vector]:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    vertices = sum(len(obj.data.vertices) for obj in meshes)
    triangles = sum(
        max(0, len(polygon.vertices) - 2)
        for obj in meshes
        for polygon in obj.data.polygons
    )
    materials = {material.name for obj in meshes for material in obj.data.materials if material}
    images = {image.name for image in bpy.data.images if image.source == "FILE"}
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[index] for point in corners) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in corners) for index in range(3)))
    return len(meshes), vertices, triangles, len(materials), len(images), maximum - minimum


def main() -> None:
    paths = sorted((ASSET_ROOT / "hero").glob("*.glb"))
    paths += sorted((ASSET_ROOT / "kaykit-dungeon").glob("*.gltf"))
    paths += sorted((ASSET_ROOT / "quaternius").glob("*/*.gltf"))
    print("asset,bytes,mesh_objects,vertices,triangles,materials,file_images,size_x,size_y,size_z")
    for path in paths:
        mesh_objects, vertices, triangles, materials, images, size = measure(path)
        print(
            f"{path.relative_to(ASSET_ROOT).as_posix()},"
            f"{path.stat().st_size},{mesh_objects},{vertices},{triangles},"
            f"{materials},{images},{size.x:.4f},{size.y:.4f},{size.z:.4f}"
        )


if __name__ == "__main__":
    main()
