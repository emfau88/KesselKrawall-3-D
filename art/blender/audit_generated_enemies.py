"""Inspect supplied to3D enemies without changing their immutable source GLBs."""
from pathlib import Path
import bpy, json, math
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'art/blender/previews/enemies'
OUT.mkdir(parents=True, exist_ok=True)
for slug in ['zischbert', 'moor-martha']:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / f'art/source/enemies/{slug}/source.glb'))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    coords = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    low = Vector(tuple(min(c[i] for c in coords) for i in range(3)))
    high = Vector(tuple(max(c[i] for c in coords) for i in range(3)))
    print('ENEMY_BOUNDS', slug, list(low), list(high))
    for o in meshes:
        o.data.calc_loop_triangles()
        print('ENEMY_MESH', slug, o.name, len(o.data.vertices), len(o.data.loop_triangles))
        for p in o.data.polygons:
            p.use_smooth = True
        print('ENEMY_MATERIALS', [(m.name, [(n.type, n.image.size[:] if n.type == 'TEX_IMAGE' and n.image else None) for n in m.node_tree.nodes]) for m in o.data.materials])
    center = (low + high) / 2
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    world = bpy.data.worlds.new(f'Review-{slug}')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.025, .035, .045, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .6
    scene.world = world
    for position, power, color in [((2,-3,4),450,(1,.85,.65)),((-3,-1,2),240,(.65,.8,1)),((1,3,3),420,(.8,.85,1))]:
        bpy.ops.object.light_add(type='AREA', location=position)
        light = bpy.context.object
        light.data.energy = power
        light.data.size = 3
        light.data.color = color
        light.rotation_euler = (center-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = max(high-low) * 1.25
    scene.camera = camera
    for view, position in [('front', (0,-3,.6)), ('rear', (0,3,.6)), ('top', (.3,-.4,3))]:
        camera.location = Vector(position) + center
        camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath = str(OUT / f'{slug}-{view}.png')
        bpy.ops.render.render(write_still=True)
