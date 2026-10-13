"""Preserve legacy to3D enemy sculpts; add local morphs and living-liquid sockets.

Run Blender 5.2 --background --python art/blender/build_legacy_enemy_characters.py.
Optional -- --inspect only creates measured source views without exporting assets.
Source GLBs are immutable. Raw +Y faces rotate to Blender -Y / glTF +Z.
"""
from pathlib import Path
import hashlib
import json
import math
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / 'art/blender/previews/enemies-characters'
PREVIEW.mkdir(parents=True, exist_ok=True)
MORPHS = ['Blink_L', 'Blink_R', 'Smile', 'Surprise', 'Hurt', 'Look_L', 'Look_R', 'FaceNeutral']
PROFILES = {
    'zischbert': {
        'name': 'Zischbert', 'capHeight': .5775, 'radius': .315,
        'liquidHeight': .5835, 'liquidColor': (.9, .14, .012),
        # Measured in the straight orthographic source view and checked with
        # surface rays. These refer to the original eyes, not new face pieces.
        'eyes': [(-.14, .453, .053, .046, .015), (.14, .453, .053, .046, .015)],
        'mouth': (0, .319, .25, .091, -.19),
        'metallic': .18, 'roughness': .56,
    },
    'moor-martha': {
        'name': 'Moor-Martha', 'capHeight': .5365, 'radius': .285,
        'liquidHeight': .5435, 'liquidColor': (.39, .59, .018),
        # The generated pose is asymmetric: the left eye recedes towards -X.
        # Mirroring the right-eye mask would deform her nose instead of her eye.
        'eyes': [(-.253, .404, .046, .031, -.17), (-.056, .404, .053, .031, -.29)],
        'mouth': (-.145, .314, .20, .041, -.17),
        'metallic': .08, 'roughness': .72,
    },
}


def load_source(slug):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=False, do_recursive=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / f'art/source/enemies/{slug}/source.glb'))
    body = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    body.parent = None
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Rotate data explicitly: freshly imported glTF empties can delay the
    # operator's dependency-graph transform update in background mode.
    orientation = Matrix.Rotation(math.pi, 4, 'Z')
    for vertex in body.data.vertices:
        vertex.co = orientation @ vertex.co
    offset = -min(v.co.z for v in body.data.vertices)
    for v in body.data.vertices:
        v.co.z += offset
    body.name = 'Body'
    for p in body.data.polygons:
        p.use_smooth = True
    body.data.update()
    bpy.context.view_layer.update()
    return body, offset


def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def material(name, color, roughness=.35, emission=.25):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Emission Color'].default_value = (*color, 1)
    bsdf.inputs['Emission Strength'].default_value = emission
    return mat


def fade(t):
    t = max(0, min(1, t))
    return 1-t*t*(3-2*t)


def local_weight(co, cx, cz, rx, rz, max_y, plateau=.65):
    if co.y > max_y:
        return 0
    distance = math.sqrt(((co.x-cx)/rx)**2 + ((co.z-cz)/rz)**2)
    depth = min(1, max(0, (max_y-co.y)/.038))
    return fade((distance-plateau)/(1-plateau))*depth


def add_morphs(body, profile):
    basis = body.shape_key_add(name='Basis')
    mx, mz, mrx, mrz, my = profile['mouth']
    is_fire = profile['name'] == 'Zischbert'
    for name in MORPHS:
        key = body.shape_key_add(name=name)
        key.value = 0
        for original, point in zip(basis.data, key.data):
            c = original.co
            delta = Vector((0, 0, 0))
            eye_weights = [local_weight(c, *eye, plateau=.85 if is_fire else .70) for eye in profile['eyes']]
            mouth = local_weight(c, mx, mz, mrx, mrz, my, plateau=.52)
            corner = min(1, abs(c.x-mx)/mrx)**2
            brows = [local_weight(c, x, z+rz+.012, rx*1.35, .027, max_y-.012, plateau=.5)
                     for x, z, rx, rz, max_y in profile['eyes']]
            brow = max(brows)
            if name.startswith('Blink_'):
                side = 0 if name.endswith('L') else 1
                cz = profile['eyes'][side][1]
                delta.z = (cz-.004-c.z)*eye_weights[side]*.995
                delta.y = -.002*eye_weights[side]
            elif name in ['Look_L', 'Look_R']:
                delta.x = (-.005 if name == 'Look_L' else .005)*max(eye_weights)
            elif name == 'Smile':
                delta.z = (.003+.016*corner)*mouth
            elif name == 'Surprise':
                delta.z = (c.z-mz)*(.15 if is_fire else .35)*mouth + .014*brow
                delta.x = -(c.x-mx)*.04*mouth
            elif name == 'Hurt':
                delta.z = (-.23*(c.z-mz)-.017*corner)*mouth
                delta.z -= .012*brow
                delta.x = -(c.x-mx)*.025*mouth
            elif name == 'FaceNeutral':
                # A small expression release, deliberately not the player's
                # full grin suppression. Martha keeps her original tired smirk.
                delta.z = (-.11*(c.z-mz)-(.008 if is_fire else .003)*corner)*mouth
            point.co = c+delta
    # Background shape_key_add can otherwise leave every new key at 1. Export
    # one coherent resting face and never rely on a renderer's first frame to
    # repair simultaneous blink/smile/surprise/hurt expressions.
    for key in body.data.shape_keys.key_blocks:
        key.value = .85 if key.name == 'FaceNeutral' else 0


def remove_baked_brew(body, profile):
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bm.normal_update()
    candidates = set()
    height = profile['capHeight']
    for face in bm.faces:
        c = face.calc_center_median()
        if height-.017 < c.z < height+.018 and c.x*c.x+c.y*c.y < .37**2 and face.normal.z > .55:
            candidates.add(face)
    # A forehead/rivet face can share the cap's height and upward normal.
    # Delete only the connected surface reached from the central brew, never
    # every similarly oriented face in the bowl's bounding cylinder.
    seed = min(candidates, key=lambda f: f.calc_center_median().xy.length_squared)
    doomed = set([seed])
    pending = [seed]
    while pending:
        face = pending.pop()
        for edge in face.edges:
            for neighbor in edge.link_faces:
                if neighbor in candidates and neighbor not in doomed:
                    doomed.add(neighbor)
                    pending.append(neighbor)
    bmesh.ops.delete(bm, geom=list(doomed), context='FACES')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()
    bpy.context.view_layer.update()
    return len(doomed)


def add_liquid(root, profile):
    liquid_root = empty('LiquidRoot', root)
    count, rings = 64, 16
    vertices = [(0, 0, 0)]
    for ring in range(1, rings+1):
        radius = profile['radius']*ring/rings
        for index in range(count):
            angle = index/count*math.tau
            # A small authored meniscus still has radial geometry for the
            # runtime LivingLiquid deformation, rather than a flat triangle fan.
            height = -.0015*math.sin(ring/rings*math.pi)
            vertices.append((math.cos(angle)*radius, math.sin(angle)*radius, height))
    faces = [(0, index+1, 1+(index+1)%count) for index in range(count)]
    for ring in range(rings-1):
        for index in range(count):
            a = 1+ring*count+index
            b = 1+ring*count+(index+1)%count
            faces.append((a, b, b+count, a+count))
    mesh = bpy.data.meshes.new('LiquidSurface')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    surface = bpy.data.objects.new('LiquidSurface', mesh)
    bpy.context.collection.objects.link(surface)
    surface.parent = liquid_root
    surface.location.z = profile['liquidHeight']
    mesh.materials.append(material(profile['name']+'_LivingBrew', profile['liquidColor']))
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return surface


def check_opening(body, profile):
    rays = []
    step = profile['radius']*.48
    for x, y in [(0, 0), (step, 0), (-step, 0), (0, step), (0, -step),
                 (step, step), (step, -step), (-step, step), (-step, -step)]:
        hit, point, normal, face = body.ray_cast(Vector((x, y, 1.2)), Vector((0, 0, -1)))
        free = not hit or point.z < profile['liquidHeight']-.02
        rays.append({'xy': [x, y], 'bodyHitHeight': point.z if hit else None, 'clear': free})
        if not free:
            raise RuntimeError(f'Baked brew still blocks opening at {x},{y}: {point.z}')
    return rays


def build(slug):
    profile = PROFILES[slug]
    body, offset = load_source(slug)
    removed = remove_baked_brew(body, profile)
    for polygon in body.data.polygons:
        polygon.use_smooth = True
    mat = body.data.materials[0]
    mat.name = profile['name']+'_OriginalPaintedSculpt'
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Metallic'].default_value = profile['metallic']
    bsdf.inputs['Roughness'].default_value = profile['roughness']
    mat.use_backface_culling = False
    for img in bpy.data.images:
        if img.type == 'IMAGE' and img.size[0]:
            img.pack()
    root = empty('CharacterRoot')
    body.parent = root
    add_liquid(root, profile)
    if slug == 'zischbert':
        bpy.ops.object.select_all(action='DESELECT')
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=(0, -.225, .32))
        interior = bpy.context.object
        interior.name = 'MouthInterior'
        interior.scale = (.21, .022, .066)
        bpy.context.view_layer.update()
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        interior.parent = root
        interior.data.materials.append(material('Zischbert_MouthInterior', (.002, .001, .001), 1, 0))
    return root, body, offset, removed


def export_variant(slug, body, variant, body_budget):
    output = ROOT / f'public/assets/characters/{slug}'
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    original_mesh = body.data
    body.data = original_mesh.copy()
    body.data.calc_loop_triangles()
    modifier = body.modifiers.new('UV-preserving body LOD', 'DECIMATE')
    modifier.ratio = min(1, body_budget/len(body.data.loop_triangles))
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    add_morphs(body, PROFILES[slug])
    check_opening(body, PROFILES[slug])
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.name == 'CharacterRoot' or obj.parent or obj.type == 'MESH':
            obj.select_set(True)
    path = output / f'{slug}-{variant}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                             export_apply=False, export_yup=True, export_animations=False,
                             export_morph=True, export_normals=True, export_materials='EXPORT',
                             export_cameras=False, export_lights=False)
    data = path.read_bytes()
    gltf = json.loads(data[20:20+int.from_bytes(data[12:16], 'little')])
    primitives = [p for mesh in gltf['meshes'] for p in mesh['primitives']]
    stats = {
        'file': path.name, 'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'triangles': sum(gltf['accessors'][p['indices']]['count']//3 for p in primitives),
        'vertices': sum(gltf['accessors'][p['attributes']['POSITION']]['count'] for p in primitives),
        'meshCount': len(gltf['meshes']), 'materialCount': len(gltf['materials']),
    }
    body.data = original_mesh
    return stats


def produce(slug):
    profile = PROFILES[slug]
    root, body, offset, removed = build(slug)
    variants = {'desktop': export_variant(slug, body, 'desktop', 26000),
                'mobile': export_variant(slug, body, 'mobile', 16000)}
    add_morphs(body, profile)
    rays = check_opening(body, profile)
    source = ROOT / f'art/source/enemies/{slug}/source.glb'
    contract = {
        'version': 2, 'id': slug, 'name': profile['name'],
        'faceStrategy': 'original-textured-face-local-morphs',
        'source': {'file': str(source.relative_to(ROOT)).replace('\\', '/'),
                   'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'bytes': source.stat().st_size},
        'coordinates': {'up': 'Y', 'front': '+Z', 'footPivot': 0, 'sourceFootOffset': offset},
        'variants': variants,
        'liquid': {'node': 'LiquidSurface', 'radius': profile['radius'], 'height': profile['liquidHeight'],
                   'palette': 'fire' if slug == 'zischbert' else 'poison', 'removedBakedFaces': removed},
        'openingRays': rays, 'morphs': {'Body': MORPHS},
        'defaultWeights': {name: .85 if name == 'FaceNeutral' else 0 for name in MORPHS},
        'measuredFace': {'eyesBlenderXZ': [list(eye[:2]) for eye in profile['eyes']],
                         'mouthBlenderXZ': list(profile['mouth'][:2])},
        'expressions': ['idle', 'joy', 'charge', 'attack', 'hit', 'defeat'],
        'notes': ['Original generated sculpt and embedded painted texture preserved; no generic replacement faceplate.',
                  'Facial weights are local to measured original features; source mouth identity is preserved.',
                  'Liquid cap removed from Body and replaced by a radial separate mesh with runtime deformation.',
                  'Only scalar metallic/roughness tuned; no claim of newly authored PBR texture maps.'],
    }
    output = ROOT / f'public/assets/characters/{slug}'
    (output/'character-contract.json').write_text(json.dumps(contract, indent=2), encoding='utf8')
    bpy.context.preferences.filepaths.save_version = 0
    if hasattr(bpy.context.preferences.filepaths, 'use_save_preview_images'):
        bpy.context.preferences.filepaths.use_save_preview_images = False
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'art/blender/{slug}-character.blend'), compress=True)
    # Visual QA inspects the actual exported desktop geometry/morphs, while the
    # saved blend retains the editable full-resolution sculpt.
    if '--no-preview' not in sys.argv:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(output/f'{slug}-desktop.glb'))
        body = bpy.data.objects.get('Body')
        review_scene(body, slug, {'ready-front': {'FaceNeutral': .85},
                                  'blink': {'FaceNeutral': .85, 'Blink_L': 1, 'Blink_R': 1},
                                  'hit': {'Hurt': .9, 'Blink_L': .2, 'Blink_R': .2},
                                  'ready-three-quarter': {'FaceNeutral': .85}})
    print('ENEMY_CHARACTER_COMPLETE', json.dumps(contract))


def review_scene(body, slug, labels):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    world = bpy.data.worlds.new(f'Review-{slug}')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.035, .045, .055, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
    scene.world = world
    target = Vector((0, 0, .4))
    for pos, energy, color in [((-2, -3, 4), 450, (1, .88, .7)),
                               ((3, -1, 2), 260, (.66, .8, 1)),
                               ((1, 3, 3), 350, (.8, .85, 1))]:
        bpy.ops.object.light_add(type='AREA', location=pos)
        light = bpy.context.object
        light.data.energy = energy
        light.data.size = 3
        light.data.color = color
        light.rotation_euler = (target-light.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add(location=(0, -3, .4))
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 1.25
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    for label, weights in labels.items():
        camera.location = (Vector((.65, -3, 1.25)) if label.endswith('three-quarter')
                           else Vector((0, -3, .4)))
        camera.rotation_euler = (target-camera.location).to_track_quat('-Z', 'Y').to_euler()
        if body.data.shape_keys:
            for key in body.data.shape_keys.key_blocks:
                key.value = weights.get(key.name, 0)
        scene.render.filepath = str(PREVIEW / f'{slug}-{label}.png')
        bpy.ops.render.render(write_still=True)
    if body.data.shape_keys:
        for key in body.data.shape_keys.key_blocks:
            key.value = 0


def inspect_source(slug):
    body, offset = load_source(slug)
    bounds = [[min(v.co[i] for v in body.data.vertices) for i in range(3)],
              [max(v.co[i] for v in body.data.vertices) for i in range(3)]]
    rays = []
    for x, y in [(0, 0), (.12, 0), (-.12, 0), (0, .12), (0, -.12),
                 (.12, .12), (.12, -.12), (-.12, .12), (-.12, -.12)]:
        hit, point, normal, index = body.ray_cast(Vector((x, y, 1.2)), Vector((0, 0, -1)))
        rays.append({'xy': [x, y], 'hit': hit, 'z': point.z if hit else None,
                     'normal': list(normal), 'face': index})
    print('SOURCE_MEASURE', slug, json.dumps({'offset': offset, 'bounds': bounds, 'rays': rays}))
    for x, z in ([(-.14, .44), (.14, .44), (0, .315)] if slug == 'zischbert'
                 else [(-.253, .404), (-.056, .404), (-.145, .32)]):
        hit, point, normal, index = body.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
        print('FACE_PROBE', slug, x, z, hit, list(point), list(normal), index)
    review_scene(body, slug, {'source-front-straight': {}})


if __name__ == '__main__':
    for slug in ['zischbert', 'moor-martha']:
        if '--only' in sys.argv and sys.argv[sys.argv.index('--only')+1] != slug:
            continue
        if '--inspect' in sys.argv:
            inspect_source(slug)
        else:
            produce(slug)
