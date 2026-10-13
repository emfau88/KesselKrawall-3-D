"""Preserve original textured face; add local morphs and separate liquid.
Run Blender --background --python art/blender/build_brasskin_morph_character.py.
Source stays untouched. Z-up/-Y front exports as glTF Y-up/+Z front.
"""
from pathlib import Path
import hashlib, json, math
import bpy, bmesh
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art/source/brasskin/source.glb'
OUTPUT=ROOT/'public/assets/characters/brasskin'
PREVIEW=ROOT/'art/blender/previews/brasskin'
OUTPUT.mkdir(parents=True,exist_ok=True)
PREVIEW.mkdir(parents=True,exist_ok=True)
OFFSET=.4168242812156677
MORPHS=['Blink_L','Blink_R','Smile','Surprise','Hurt','Look_L','Look_R','FaceNeutral']

def material(name,rgb,roughness=.5,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=m.node_tree.nodes['Principled BSDF']
    n.inputs['Base Color'].default_value=(*rgb,1)
    n.inputs['Roughness'].default_value=roughness
    n.inputs['Emission Color'].default_value=(*rgb,1)
    n.inputs['Emission Strength'].default_value=emission
    return m

def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent
    return o

def weight(co,cx,cz,rx,rz):
    d=((co.x-cx)/rx)**2+((co.z-cz)/rz)**2
    if d>=1 or co.y>-.255:return 0
    return (1-d)**2*min(1,max(0,(-co.y-.255)/.055))

def eye_weight(co,cx,cz):
    if co.y>-.275:return 0
    distance=math.sqrt(((co.x-cx)/.043)**2+((co.z-cz)/.048)**2)
    t=min(1,max(0,(distance-.72)/.43))
    return (1-t*t*(3-2*t))*min(1,max(0,(-co.y-.275)/.04))

def mouth_weight(co):
    """Follow the sculpted curved mouth, with a flat core and soft lip boundary.

    The former radial weight left the lifted corners almost untouched, so even
    Hurt still read as a grin. This band includes lips/corners but excludes the
    eyes, cheek armour, chin jewel and rear shell. UVs remain unchanged.
    """
    if co.y>-.245:return 0
    x=abs(co.x)
    edge=min(1,max(0,(x-.162)/.043))
    center=OFFSET+.068+.075*min(1.4,(x/.17)**2)
    vertical=min(1,max(0,(abs(co.z-center)-.042)/.058))
    fade=lambda t:1-t*t*(3-2*t)
    return fade(edge)*fade(vertical)*min(1,max(0,(-co.y-.245)/.065))

def morphs(body):
    basis=body.shape_key_add(name='Basis')
    # Centers measured on the original sculpt, not guessed from the screen view.
    centers=[(-.080,OFFSET+.237),(.080,OFFSET+.237)]
    for name in MORPHS:
        k=body.shape_key_add(name=name)
        # Blender can initialize a new relative shape key at 1. Reset explicitly
        # so exported glTF weights never stack every expression on first import.
        k.value=0
        for v,p in zip(basis.data,k.data):
            c=v.co;delta=Vector((0,0,0))
            eyes=[eye_weight(c,x,z) for x,z in centers]
            mouth=mouth_weight(c)
            brow=weight(c,0,OFFSET+.306,.185,.04)
            if name.startswith('Blink'):
                side=0 if name.endswith('L') else 1
                delta.z=(centers[side][1]-.01-c.z)*eyes[side]*.985
                delta.y=.004*eyes[side]
            elif name=='Smile':delta.z=(.010+.014*min(1,abs(c.x)/.13))*mouth
            elif name=='Surprise':
                delta.x=-c.x*.2*mouth
                delta.z=(c.z-(OFFSET+.096))*.12*mouth+.011*brow
            elif name=='Hurt':
                # A complete expression from the original Basis. Crossfade
                # with FaceNeutral; stacking both fully would close it twice.
                corner=min(1.5,(abs(c.x)/.16)**2)
                delta.z=(-.76*(c.z-(OFFSET+.120))-.043*corner)*mouth
                delta.z+=(.012-.022*min(1,abs(c.x)/.10))*brow
                delta.x=-c.x*.035*mouth
            elif name=='FaceNeutral':
                corner=min(1.5,(abs(c.x)/.16)**2)
                delta.z=(-.78*(c.z-(OFFSET+.120))-.026*corner)*mouth
                delta.x=-c.x*.025*mouth
            else:delta.x=(-.006 if name=='Look_L' else .006)*max(eyes)
            p.co=c+delta
    # An imported derivative should start with the same restrained resting face
    # as the game, not show the supplied sculpt's original open grin for a frame.
    body.data.shape_keys.key_blocks['FaceNeutral'].value=.85

def build():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    body=next(o for o in bpy.context.scene.objects if o.type=='MESH');body.parent=None
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
    bpy.context.view_layer.objects.active=body
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);body.name='Body'
    bm=bmesh.new();bm.from_mesh(body.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
    old_liquid=[]
    for f in bm.faces:
        c=f.calc_center_median()
        if c.x*c.x+c.y*c.y<.285**2 and c.z>.276:old_liquid.append(f)
    bmesh.ops.delete(bm,geom=old_liquid,context='FACES')
    for v in bm.verts:v.co.z+=OFFSET
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
    for p in body.data.polygons:p.use_smooth=True
    m=body.data.materials[0];m.name='Brasskin_PaintedShell'
    m.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.38
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.52
    m.use_backface_culling=False
    root=empty('CharacterRoot');body.parent=root
    for i in bpy.data.images:
        if i.type=='IMAGE' and i.size[0]:i.pack()
    liquid_root=empty('LiquidRoot',root)
    count,rings=64,16
    vertices=[(0,0,0)]
    for ring in range(1,rings+1):
        r=.28*ring/rings
        vertices.extend((math.cos(i/count*math.tau)*r,math.sin(i/count*math.tau)*r,0) for i in range(count))
    faces=[(0,i+1,1+(i+1)%count) for i in range(count)]
    for ring in range(rings-1):
        for i in range(count):
            a=1+ring*count+i;b=1+ring*count+(i+1)%count
            faces.append((a,b,b+count,a+count))
    mesh=bpy.data.meshes.new('LiquidSurface')
    mesh.from_pydata(vertices,[],faces);mesh.update()
    surface=bpy.data.objects.new('LiquidSurface',mesh);bpy.context.collection.objects.link(surface)
    surface.parent=liquid_root;surface.location.z=OFFSET+.324
    mesh.materials.append(material('Brasskin_Liquid',(.68,.235,.028),roughness=.22,emission=.25))
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=(0,-.406,OFFSET-.232))
    charm=bpy.context.object;charm.name='CharmGlow';charm.scale=(.019,.004,.019)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);charm.parent=root
    charm.data.materials.append(material('Brasskin_MagicCyan',(.03,.56,.68),roughness=.25,emission=2))
    # Dark interior behind the existing opening prevents seeing the studio through
    # the generated mesh. It does not replace the lips, teeth, texture or smile.
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(0,-.288,OFFSET+.09))
    throat=bpy.context.object;throat.name='MouthInterior';throat.scale=(.179,.016,.072)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);throat.parent=root
    throat.data.materials.append(material('Brasskin_MouthInterior',(.003,.002,.002),roughness=1))
    return root,body

def export(body,label,budget):
    bpy.context.view_layer.objects.active=body
    source=body.data;body.data=source.copy();body.data.calc_loop_triangles()
    d=body.modifiers.new('Body LOD','DECIMATE');d.ratio=min(1,budget/len(body.data.loop_triangles))
    d.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=d.name)
    morphs(body)
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.name=='CharacterRoot' or o.parent or o.type=='MESH':o.select_set(True)
    path=OUTPUT/f'brasskin-{label}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_apply=False,export_yup=True,export_animations=False,export_morph=True,
        export_normals=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    data=path.read_bytes();g=json.loads(data[20:20+int.from_bytes(data[12:16],'little')])
    ps=[p for m in g['meshes'] for p in m['primitives']]
    stats={'file':path.name,'bytes':len(data),'triangles':sum(g['accessors'][p['indices']]['count']//3 for p in ps),
        'vertices':sum(g['accessors'][p['attributes']['POSITION']]['count'] for p in ps),
        'meshCount':len(g['meshes']),'materialCount':len(g['materials'])}
    body.data=source
    return stats

def render():
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True
    s.render.resolution_x=800;s.render.resolution_y=800;s.render.resolution_percentage=100
    w=bpy.data.worlds.new('Review');w.use_nodes=True
    w.node_tree.nodes['Background'].inputs['Color'].default_value=(.055,.07,.08,1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value=.6;s.world=w
    target=Vector((0,0,.43))
    for pos,power,color in [((2,-3,4),500,(1,.79,.56)),((-3,-1,2),260,(.55,.76,1)),((1,3,3),450,(.8,.85,1))]:
        bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object
        o.data.energy=power;o.data.size=3;o.data.color=color
        o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(.8,-2.8,1.2));c=bpy.context.object
    c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=1.22;s.camera=c
    body=bpy.data.objects.get('Body')
    expressions={
        'original-face':{},
        'neutral':{'FaceNeutral':.85},
        'hurt':{'FaceNeutral':.1,'Hurt':.9,'Blink_L':.2,'Blink_R':.2},
        'defeat':{'Hurt':1,'Blink_L':.5,'Blink_R':.5},
        'joy':{'Smile':.35},
        'blink':{'FaceNeutral':.85,'Blink_L':1,'Blink_R':1},
    }
    for label,values in expressions.items():
        for k in body.data.shape_keys.key_blocks:k.value=values.get(k.name,0)
        s.render.filepath=str(PREVIEW/f'character-{label}.png');bpy.ops.render.render(write_still=True)
    for k in body.data.shape_keys.key_blocks:k.value=0

root,body=build()
variants={'desktop':export(body,'desktop',23500),'mobile':export(body,'mobile',15500)}
morphs(body)
contract={'version':3,'name':'Brasskin','faceStrategy':'original-textured-face-local-morphs',
    'source':{'file':'art/source/brasskin/source.glb','sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'bytes':SOURCE.stat().st_size},
    'coordinates':{'up':'Y','front':'+Z','footPivot':0},'variants':variants,
    'liquid':{'node':'LiquidSurface','radius':.28,'height':OFFSET+.324},'morphs':{'Body':MORPHS},
    'expressions':['idle','joy','charge','attack','hit','defeat'],
    'defaultWeights':{'Body':{'FaceNeutral':.85}},
    'expressionWeights':{'idle':{'FaceNeutral':.85},'joy':{'Smile':.35},
        'charge':{'FaceNeutral':1},'hit':{'FaceNeutral':.1,'Hurt':.9},'defeat':{'Hurt':1}},
    'notes':['Original face geometry and texture preserved; no replacement faceplate.',
        'Local facial morphs; body movement and liquid animation are runtime effects.',
        'FaceNeutral and Hurt are complete expressions from Basis; crossfade rather than stacking both at full weight.']}
(OUTPUT/'character-contract.json').write_text(json.dumps(contract,indent=2),encoding='utf8')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/blender/brasskin-character.blend'))
render()
print('BRASSKIN_COMPLETE',json.dumps(contract))
