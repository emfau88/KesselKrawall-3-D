"""Phase 3A: original, repeatable sculpted meshes. Blender 5.2, no paid inputs.
Only writes public/assets/ingredient-phase3a; never replaces the legacy GLBs.
Run blender --background --python art/blender/build_ingredient_phase3a.py
"""
import bpy
import math
import json
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/ingredient-phase3a'
OUT.mkdir(parents=True, exist_ok=True)
TAU = math.tau
MOBILE = False
PARTS = []


def material(name, roughness, metal=0, emission=0, normal=0.15):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bs = nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metal
    vertex = nodes.new('ShaderNodeVertexColor')
    vertex.layer_name = 'SurfaceColor'
    links.new(vertex.outputs['Color'], bs.inputs['Base Color'])
    if emission:
        links.new(vertex.outputs['Color'], bs.inputs['Emission Color'])
        bs.inputs['Emission Strength'].default_value = emission
    # Small shared, unlit micro-normal: surface response, not baked shadows.
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = MICRO
    normal_node = nodes.new('ShaderNodeNormalMap')
    normal_node.inputs['Strength'].default_value = normal
    links.new(tex.outputs['Color'], normal_node.inputs['Color'])
    links.new(normal_node.outputs['Normal'], bs.inputs['Normal'])
    return mat


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    PARTS.clear()


def mesh(name, verts, faces, mat, color, smooth=True, variation=0.08):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    uv = data.uv_layers.new(name='SurfaceUV')
    data.color_attributes.new(name='SurfaceColor', type='FLOAT_COLOR', domain='CORNER')
    paint = data.color_attributes['SurfaceColor']
    uv = data.uv_layers['SurfaceUV']
    for p in data.polygons:
        p.use_smooth = smooth
        for li in p.loop_indices:
            v = data.vertices[data.loops[li].vertex_index].co
            c = color(v) if callable(color) else color
            noise = (math.sin(v.x*39+v.y*23+v.z*31)*0.3 + math.sin(v.x*13-v.y*17+v.z*21)*0.7)
            paint.data[li].color = tuple(max(0.002,min(1,x*(1+noise*variation))) for x in c) + (1,)
            uv.data[li].uv = (v.x*1.7+v.y*0.37, v.z*1.7+v.y*0.71)
    PARTS.append(obj)
    return obj


def tube(name, points, radii, mat, color, sides=8):
    verts=[]
    for i, p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize()
        normal=tangent.cross(Vector((0,1,0)))
        if normal.length<0.01: normal=tangent.cross(Vector((1,0,0)))
        normal.normalize()
        binormal=tangent.cross(normal).normalized()
        for j in range(sides):
            a=TAU*j/sides
            v=Vector(p)+(normal*math.cos(a)+binormal*math.sin(a))*radii[i]
            verts.append(tuple(v))
    faces=[]
    for i in range(len(points)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range(len(verts)-sides,len(verts)))])
    return mesh(name,verts,faces,mat,color)


def lathe(name, profile, mat, color, segments=32, warp=None, smooth=True):
    verts=[]
    for k,(z,r) in enumerate(profile):
        for j in range(segments):
            a=j*TAU/segments
            x,y=r*math.cos(a),r*math.sin(a)
            verts.append(warp(x,y,z,a,k) if warp else (x,y,z))
    faces=[]
    for k in range(len(profile)-1):
        for j in range(segments):
            a=k*segments+j; b=k*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    faces.extend([tuple(reversed(range(segments))),tuple(range(len(verts)-segments,len(verts)))])
    return mesh(name,verts,faces,mat,color,smooth)


def blob(name, center, scale, mat, color, segments=12, rings=6):
    verts=[]
    for k in range(rings+1):
        p=math.pi*k/rings
        for j in range(segments):
            a=j*TAU/segments
            verts.append((center[0]+scale[0]*math.sin(p)*math.cos(a),center[1]+scale[1]*math.sin(p)*math.sin(a),center[2]+scale[2]*math.cos(p)))
    faces=[]
    for k in range(rings):
        for j in range(segments):
            a=k*segments+j;b=k*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    return mesh(name,verts,faces,mat,color)


def ring(name,r,z,width,mat,color,segments=32,sides=5):
    points=[(math.cos(i*TAU/segments)*r,math.sin(i*TAU/segments)*r,z) for i in range(segments+1)]
    return tube(name,points,[width]*len(points),mat,color,sides)


def build_pedestal():
    stone=material('P3A basalt',.86,normal=.55)
    brass=material('P3A aged brass',.39,.67,normal=.19)
    rune=material('P3A rune inlay',.58,0,0.14,normal=.12)
    n=16 if MOBILE else 24
    # Bevelled plinth with recessed waist and a broad, non-luminous top surface.
    lathe('Stepped cut basalt',[(0,.59),(.025,.66),(.065,.66),(.09,.60),(.135,.57),(.17,.62),(.20,.62),(.225,.57),(.225,.001)],stone,(.055,.066,.063),n,smooth=False)
    ring('Lower brass fillet',.625,.075,.012,brass,(.43,.28,.115),n)
    ring('Inset top binding',.557,.228,.009,brass,(.47,.32,.15),n)
    ring('Carved inner channel',.39,.227,.008,stone,(.045,.053,.05),n)
    # Eight bevelled clasps and runic strokes; joins reduce to three primitives.
    for i in range(8):
        a=i*TAU/8
        points=[(.60*math.cos(a),.60*math.sin(a),.055),(.59*math.cos(a),.59*math.sin(a),.17),(.53*math.cos(a),.53*math.sin(a),.232)]
        tube('Forged rim clasp',points,[.018,.019,.014],brass,(.39,.25,.105),4)
        r=.47
        def p(u,v): return ((r+v)*math.cos(a)-u*math.sin(a),(r+v)*math.sin(a)+u*math.cos(a),.235)
        tube('Recessed rune', [p(-.025,-.025),p(0,.025),p(.025,-.025)], [.008]*3,rune,(.31,.30,.23),4)
        tube('Rune crossbar',[p(-.02,-.007),p(.02,-.007)],[.006]*2,rune,(.31,.30,.23),4)
    # Quiet central engraving remains legible even when the socket is empty.
    for i in range(3):
        a=i*TAU/3
        tube('Empty socket seal',[(.1*math.cos(a),.1*math.sin(a),.229),(0,0,.229),(.19*math.cos(a+.38),.19*math.sin(a+.38),.229)],[.007]*3,brass,(.28,.18,.08),4)


def build_chili():
    skin=material('P3A pepper skin',.43,normal=.22)
    stem=material('P3A fibrous stem',.8,normal=.45)
    ember=material('P3A ember freckles',.6,0,.12,normal=.18)
    count=28 if MOBILE else 44
    points=[];radii=[]
    # A tapered, lobed pepper with a playful recurved tip, not a uniform tube.
    for i in range(count+1):
        t=i/count
        if t<.72:
            q=t/.72
            p=(-.10-.19*math.sin(q*math.pi)+.20*q, .015*math.sin(q*5), .52-1.01*q)
        else:
            q=(t-.72)/.28; a=-math.pi/2+q*math.pi*1.1
            p=(.10+.19*math.cos(a),0,-.30+.19*math.sin(a))
        points.append(p)
        radii.append(max(.009,.215*(1-t)**.66*(.84+.16*math.sin(t*math.pi))))
    body=tube('Curled lobed pepper',points,radii,skin,lambda v:(.37+.09*math.sin(v.z*5),.018+.012*(v.z+.5),.009),12 if MOBILE else 18)
    # Longitudinal subtle lobes catch light without a painted highlight stripe.
    for i,v in enumerate(body.data.vertices):
        j=i%(12 if MOBILE else 18)
        v.co.x += .006*math.sin(j*TAU/(12 if MOBILE else 18)*5)
    tube('Bent woody stalk',[(-.10,0,.49),(-.09,0,.62),(-.01,.015,.72),(-.035,.02,.82)],[.075,.052,.043,.029],stem,(.15,.22,.04),8)
    for i in range(5):
        a=i*TAU/5
        tube('Sepal',[(-.1,0,.56),(-.1+.11*math.cos(a),.11*math.sin(a),.52),(-.1+.15*math.cos(a),.15*math.sin(a),.43)],[.055,.042,.006],stem,(.19,.25,.045),5)
    for i in range(7 if not MOBILE else 4):
        z=.36-i*.075;x=-.24+.02*math.sin(i)
        blob('Warm skin fleck',(x,-.137,z),(.013,.009,.025),ember,(.55,.105,.022),6,4)


def build_shroom():
    organic=material('P3A fungus flesh',.79,normal=.4)
    capmat=material('P3A waxy fungus cap',.62,normal=.29)
    slime=material('P3A restrained venom',.34,0,.10,normal=.1)
    n=24 if MOBILE else 40
    def stemwarp(x,y,z,a,k):return (x+.065*math.sin((z+.5)*4),y,z+.012*math.sin(a*5))
    lathe('Crooked ridged stem',[(-.52,.18),(-.49,.25),(-.34,.20),(-.13,.14),(.08,.18),(.23,.20)],organic,lambda v:(.37+.07*v.z,.30+.05*v.z,.15+.04*v.z),n,stemwarp)
    def warp(x,y,z,a,k):
        f=1+.055*math.sin(a*3+.7)+.035*math.sin(a*7)
        return (x*f,y*f,z+.025*math.sin(a*3)+.014*math.sin(a*7))
    profile=[(.13,.20),(.15,.41),(.18,.58),(.25,.63),(.34,.55),(.47,.45),(.59,.31),(.68,.12),(.68,.001)]
    lathe('Asymmetric bell cap',profile,capmat,lambda v:(.095+.045*math.sin(v.x*7+v.z*5),.17+.08*v.z,.025+.018*math.sin(v.y*9)),n,warp)
    for i in range(12 if MOBILE else 20):
        a=i*TAU/(12 if MOBILE else 20)
        tube('Under-cap gill',[(.19*math.cos(a),.19*math.sin(a),.145),(.37*math.cos(a),.37*math.sin(a),.135),(.54*math.cos(a),.54*math.sin(a),.19)],[.009,.011,.005],organic,(.29,.24,.10),4)
    spots=[(-.27,-.23,.53,.08),(.19,-.31,.50,.06),(.31,.15,.46,.075),(-.10,.19,.64,.055),(.02,-.13,.675,.065),(-.46,-.12,.37,.05)]
    for x,y,z,r in spots:
        blob('Raised cap wart',(x,y,z),(r,r*.8,r*.38),organic,(.37,.43,.12),8 if MOBILE else 12,5)
    for i,(a,length) in enumerate([(-2.0,.22),(-.9,.30),(.4,.17)]):
        x,y=.54*math.cos(a),.54*math.sin(a)
        tube('Viscous cap drip',[(x,y,.26),(x*1.04,y*1.04,.16),(x*1.03,y*1.03,.23-length)],[.04,.025,.019],slime,(.27,.38,.045),6)
        blob('Heavy venom drop',(x*1.03,y*1.03,.23-length),(.033,.033,.047),slime,(.29,.4,.055),8,5)
    for a in [-2.5,-.9,.3]:
        tube('Stem root fold',[(.06,0,-.27),(.19*math.cos(a),.19*math.sin(a),-.45),(.27*math.cos(a),.27*math.sin(a),-.51)],[.022,.031,.009],organic,(.29,.25,.12),5)


def build_shell():
    ceramic=material('P3A porous eggshell',.84,normal=.5)
    interior=material('P3A shell interior',.91,normal=.3)
    rune=material('P3A old turquoise inlay',.56,.08,.10,normal=.17)
    n=32 if MOBILE else 48
    profile=[(-.52,.12),(-.47,.24),(-.35,.34),(-.15,.41),(.08,.44),(.28,.42),(.43,.39)]
    verts=[]
    for inside in [False,True]:
        for k,(z,r) in enumerate(profile):
            for j in range(n):
                a=j*TAU/n
                jag=.11*math.sin(a*7)+.045*math.sin(a*13+.8) if k==len(profile)-1 else 0
                rr=r-(.04 if inside else 0)
                verts.append((rr*math.cos(a),rr*math.sin(a),z+jag+(.045 if inside and k==0 else 0)))
    layer=len(profile)*n
    faces=[]
    for side in range(2):
        for k in range(len(profile)-1):
            for j in range(n):
                a=side*layer+k*n+j;b=side*layer+k*n+(j+1)%n
                f=(a,b,b+n,a+n)
                faces.append(f if not side else tuple(reversed(f)))
    for j in range(n):
        a=(len(profile)-1)*n+j;b=(len(profile)-1)*n+(j+1)%n
        faces.append((a,b,b+layer,a+layer))
    faces.extend([tuple(reversed(range(n))),tuple(range(layer,layer+n))])
    body=mesh('Thick jagged eggshell',verts,faces,ceramic,lambda v:(.63+.05*math.sin(v.x*11+v.z*8),.52+.04*math.sin(v.z*12),.32+.03*math.sin(v.y*9)),variation=.055)
    body.data.materials.append(interior)
    for poly in list(body.data.polygons)[(len(profile)-1)*n:2*(len(profile)-1)*n]:poly.material_index=1
    # Dark fine fracture grooves follow the curved surface. No flat rune decal.
    def front(x,z,offset=.004):
        r=.44 if z>.0 else .41 if z>-.2 else .36
        return (x,-math.sqrt(max(.025,r*r-x*x))-offset,z)
    for pts in [[(-.17,.36),(-.23,.17),(-.11,.02),(-.19,-.18),(-.11,-.34)],[(.24,.39),(.16,.20),(.23,.09),(.15,-.06)],[(.16,.20),(.03,.28),(-.01,.41)]]:
        tube('Hairline fracture',[front(x,z) for x,z in pts],[.008]*len(pts),ceramic,(.15,.105,.053),4)
    # Shield-like inlay with branching rune, restrained mineral blue.
    for pts in [[(-.095,.07),(-.09,-.09),(0,-.19),(.09,-.09),(.095,.07),(-.095,.07)],[(0,-.12),(0,.025)],[(-.05,-.04),(0,-.085),(.05,-.04)]]:
        tube('Carved protection glyph',[front(x,z,.009) for x,z in pts],[.011]*len(pts),rune,(.12,.31,.29),5)
    for i in range(8 if MOBILE else 14):
        a=i*2.399;z=-.31+(i%5)*.125;r=.415
        blob('Mineral pore',(r*math.cos(a),r*math.sin(a),z),(.012,.012,.017),ceramic,(.34,.26,.14),6,4)


def export(name,tier,morph_vertices=None):
    # Collapse ornamentation into one mesh per material, not a draw per detail.
    vertices=[];faces=[];colors=[];uvs=[];materials=[];face_materials=[];smooth=[]
    # Explicit per-material export avoids a Blender 5.2 multi-material glTF path
    # white-filling COLOR_0 on all but the first primitive (verified on this build).
    for part in PARTS:
        offset=len(vertices)
        vertices.extend(tuple(v.co) for v in part.data.vertices)
        for mat in part.data.materials:
            if mat not in materials:materials.append(mat)
        for face in part.data.polygons:
            faces.append(tuple(i+offset for i in face.vertices))
            face_materials.append(materials.index(part.data.materials[face.material_index]))
            smooth.append(face.use_smooth)
            for li in face.loop_indices:
                colors.append(tuple(part.data.color_attributes['SurfaceColor'].data[li].color))
                uvs.append(tuple(part.data.uv_layers[0].data[li].uv))
    data=bpy.data.meshes.new(name)
    data.from_pydata(vertices,[],faces);data.update()
    for mat in materials:data.materials.append(mat)
    uv=data.uv_layers.new(name='SurfaceUV')
    data.color_attributes.new(name='SurfaceColor',type='FLOAT_COLOR',domain='CORNER')
    paint=data.color_attributes['SurfaceColor'];uv=data.uv_layers['SurfaceUV']
    for i,c in enumerate(colors):paint.data[i].color=c;uv.data[i].uv=uvs[i]
    for i,face in enumerate(data.polygons):face.material_index=face_materials[i];face.use_smooth=smooth[i]
    bpy.ops.object.select_all(action='DESELECT')
    export_objects=[]
    for mi,mat in enumerate(materials):
        subset=[p for p in data.polygons if p.material_index==mi]
        indices=sorted(set(i for p in subset for i in p.vertices));remap={old:new for new,old in enumerate(indices)}
        part=bpy.data.meshes.new(f'{name}_{mi}')
        part.from_pydata([vertices[i] for i in indices],[],[tuple(remap[i] for i in p.vertices) for p in subset]);part.update()
        part.materials.append(mat)
        part.uv_layers.new(name='SurfaceUV');part.color_attributes.new(name='SurfaceColor',type='FLOAT_COLOR',domain='CORNER')
        for new,old in zip(part.polygons,subset):
            new.use_smooth=old.use_smooth
            for ni,oi in zip(new.loop_indices,old.loop_indices):
                part.color_attributes['SurfaceColor'].data[ni].color=paint.data[oi].color
                part.uv_layers['SurfaceUV'].data[ni].uv=uv.data[oi].uv
        obj=bpy.data.objects.new(f'{name}_{mi}',part);bpy.context.collection.objects.link(obj);obj.select_set(True)
        if morph_vertices:
            obj.shape_key_add(name='Basis')
            for label,coordinates in morph_vertices.items():
                key=obj.shape_key_add(name=label)
                for local,global_index in enumerate(indices):key.data[local].co=coordinates[global_index]
        export_objects.append(obj)
        bpy.context.view_layer.objects.active=obj
    data.calc_loop_triangles()
    if morph_vertices:
        # Unwrap/bake the fully grown shape so initially tucked-in parts receive
        # real atlas space rather than black sub-pixel UV islands at level III.
        for obj in export_objects:
            obj.active_shape_key_index=len(obj.data.shape_keys.key_blocks)-1
            obj.show_only_shape_key=True
    bake_surface(name,export_objects,materials)
    if morph_vertices:
        for obj in export_objects:
            obj.active_shape_key_index=0
            obj.show_only_shape_key=False
            for key in obj.data.shape_keys.key_blocks:key.value=0
    filename=f'{name}-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=False,export_materials='EXPORT',export_vertex_color='NONE')
    return {'file':filename,'triangles':len(data.loop_triangles),'materials':len(materials),'bytes':(OUT/filename).stat().st_size,'bounds':[[min(v.co[a] for v in data.vertices) for a in range(3)],[max(v.co[a] for v in data.vertices) for a in range(3)]]}


def bake_surface(name,objects,materials):
    """Bake unlit color only: painted sculpt variation + fine porous grain.
    No lighting, AO or cast shadow is baked. Three material zones share one atlas.
    """
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.018)
    bpy.ops.object.mode_set(mode='OBJECT')
    image=bpy.data.images.new(f'{name} unlit surface',width=256 if MOBILE else 512,height=256 if MOBILE else 512)
    image.colorspace_settings.name='sRGB'
    for mat in materials:
        nodes=mat.node_tree.nodes;links=mat.node_tree.links
        vertex=next(n for n in nodes if n.type=='VERTEX_COLOR')
        noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=38;noise.inputs['Detail'].default_value=3
        ramp=nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position=.25;ramp.color_ramp.elements[0].color=(.32,.29,.25,1)
        ramp.color_ramp.elements[1].position=.75;ramp.color_ramp.elements[1].color=(1,.95,.86,1)
        links.new(noise.outputs['Fac'],ramp.inputs[0])
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=globals().get('SURFACE_GRAIN',.65)
        links.new(vertex.outputs['Color'],mix.inputs[1]);links.new(ramp.outputs[0],mix.inputs[2])
        emit=nodes.new('ShaderNodeEmission');links.new(mix.outputs[0],emit.inputs[0])
        output=nodes.get('Material Output');links.new(emit.outputs[0],output.inputs['Surface'])
        tex=nodes.new('ShaderNodeTexImage');tex.image=image;nodes.active=tex;tex.select=True
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1
    scene.render.bake.margin=4
    bpy.ops.object.bake(type='EMIT',use_clear=True)
    image.pack()
    for mat in materials:
        nodes=mat.node_tree.nodes;links=mat.node_tree.links
        bs=nodes.get('Principled BSDF');links.new(bs.outputs[0],nodes.get('Material Output').inputs['Surface'])
        tex=next(n for n in nodes if n.type=='TEX_IMAGE' and n.image==image)
        links.new(tex.outputs[0],bs.inputs['Base Color'])
        # Emissive mesh accents remain low and tinted, never a white wash.
        for link in list(bs.inputs['Emission Color'].links):links.remove(link)
        bs.inputs['Emission Color'].default_value=(.05,.12,.08,1) if 'venom' in mat.name or 'turquoise' in mat.name else (.22,.07,.015,1)


# Deterministic tiny normal texture shared by all material zones; no source art
# painted over and no offline light/shadow baked into the color data.
random.seed(3103)
MICRO=bpy.data.images.new('P3A fine surface grain',width=128,height=128)
MICRO.colorspace_settings.name='Non-Color'
pixels=[]
for y in range(128):
    for x in range(128):
        dx=.12*math.sin(x*2.17+y*.83)+random.uniform(-.035,.035)
        dy=.12*math.cos(y*2.37-x*.51)+random.uniform(-.035,.035)
        pixels.extend([.5+dx,.5+dy,1,1])
MICRO.pixels=pixels
MICRO.pack()
if __name__ == '__main__':
    manifest={'version':1,'source':'Original Blender geometry, legacy ingredient images used as design reference only','assets':[]}
    for tier in ['desktop','mobile']:
        MOBILE=tier=='mobile'
        for name,build in [('pedestal',build_pedestal),('chili',build_chili),('slime-shroom',build_shroom),('egg-shell',build_shell)]:
            reset();build()
            manifest['assets'].append(export(name,tier))
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
    print('PHASE3A_ASSET_MANIFEST',json.dumps(manifest))
