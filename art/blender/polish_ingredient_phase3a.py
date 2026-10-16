"""Phase 3A polish. Reuses the existing mesh/bake/export pipeline.
Three material zones, one color atlas per ingredient/LOD, shared topology for
levels I/II/III. Morph targets change silhouettes without additional draw calls.
No original GLB, lighting or texture is overwritten. Blender 5.2.
"""
import importlib.util
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector

spec=importlib.util.spec_from_file_location('phase3a',Path(__file__).with_name('build_ingredient_phase3a.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
p.OUT=p.ROOT/'public/assets/ingredient-phase3a-polish';p.OUT.mkdir(parents=True,exist_ok=True)
p.SURFACE_GRAIN=.30
TAU=math.tau
LEVEL=1


def leaf(name,origin,direction,length,width,mat,color):
    verts=[]
    for i in range(6):
        t=i/5;w=width*math.sin(math.pi*t)
        for j in [-1,0,1]:
            u=length*t;v=w*j
            verts.append((origin[0]+math.cos(direction)*u-math.sin(direction)*v,
                          origin[1]+math.sin(direction)*u+math.cos(direction)*v,
                          origin[2]-.09*math.sin(t*math.pi*.8)+.035*t-(abs(j)*.018)))
    faces=[]
    for i in range(5):
        for j in range(2):
            a=i*3+j;faces.append((a,a+1,a+4,a+3))
    # A small thickness at the edge avoids one-sided vanishing leaves.
    obj=p.mesh(name,verts,faces,mat,color,variation=.025)
    mat.use_nodes=True;mat.use_backface_culling=False
    return obj


def pepper():
    skin=p.material('Polish satin scarlet skin',.48,normal=.10)
    stem=p.material('Polish fibrous calyx',.77,normal=.18)
    detail=p.material('Polish amber ripening marks',.58,normal=.09)
    count=24 if p.MOBILE else 32;sides=12 if p.MOBILE else 16
    points=[];radii=[]
    for i in range(count+1):
        t=i/count
        if t<.70:
            q=t/.70
            pt=(-.10-.16*math.sin(q*math.pi)+.22*q,.015*math.sin(q*5),.63-1.14*q)
        else:
            q=(t-.70)/.30;a=-math.pi/2+q*math.pi*1.23
            pt=(.12+.24*math.cos(a),.006,-.27+.24*math.sin(a))
        points.append(pt)
        radius=.285*(1-t)**.78*(.93+.13*math.sin(t*math.pi))*min(1,.22+t/.10)
        radii.append(max(.008,radius*(1+(LEVEL-1)*.08)))
    def red(v):
        lobe=.5+.5*math.sin(math.atan2(v.y,v.x+.1)*3+v.z*1.8)
        return (.32+.13*lobe+.05*(v.z+.5),.012+.024*lobe,.009+.008*lobe)
    body=p.tube('Full curled pepper',points,radii,skin,red,sides)
    for i,v in enumerate(body.data.vertices):
        t=(i//sides)/count;a=i%sides*TAU/sides
        v.co.x+=.009*math.sin(a*3+t*4)*math.sin(math.pi*t)
    p.tube('Curving woody stem',[(-.1,0,.60),(-.12,0,.70),(-.04,.015,.82),(.035,.025,.85),(.06,.025,.80)],
           [.080,.056,.044,.032,.024],stem,(.13,.19,.035),7)
    for i in range(5):
        leaf('Flared calyx',(-.1,0,.67),i*TAU/5+.1,.29+.035*(LEVEL-1),.065+.008*(LEVEL-1),stem,(.15,.245,.035))
    # A second, attached fruit unfolds only at level III, not a floating badge.
    emergence=1 if LEVEL==3 else .002
    qpts=[];qradii=[]
    for i in range(17):
        t=i/16
        qpts.append((-.1-.42*math.sin(t*math.pi*.76),-.02-.08*t,.59-.66*t))
        qradii.append(max(.007,.14*math.sin(math.pi*t)**.7))
    qpts=[(-.10+(x+.10)*emergence,y*emergence,.35+(z-.35)*emergence) for x,y,z in qpts]
    p.tube('Ascended twin fruit',qpts,[r*emergence for r in qradii],skin,red,10 if not p.MOBILE else 8)
    # Restrained amber freckles follow the body, never emissive flames.
    for i in range(4):
        z=.36-i*.15
        p.blob('Ripening freckle',(-.22,-.20+i*.018,z),(.014,.008,.021),detail,(.48,.12,.025),6,3)


def fungus():
    flesh=p.material('Polish ivory gills and stem',.82,normal=.14)
    cap=p.material('Polish matte olive cap',.63,normal=.095)
    wet=p.material('Polish wet venom rim',.31,0,.035,normal=.055)
    n=24 if p.MOBILE else 32
    def stemwarp(x,y,z,a,k):
        fold=1+.055*math.sin(a*7+z*3)
        return (x*fold+.055*math.sin((z+.52)*4),y*fold,z)
    def cream(v):
        crease=.5+.5*math.sin(math.atan2(v.y,v.x-.04)*7+v.z*2)
        return (.39+.15*crease,.32+.12*crease,.16+.07*crease)
    p.lathe('Bent fibrous stem',[(-.52,.18),(-.49,.235),(-.35,.205),(-.13,.15),(.10,.16),(.24,.20)],flesh,cream,n,stemwarp)
    # Round shoulder, rolled drooping edge, off-centre crown: no conical rock cap.
    profile=[(.16,.18),(.13,.35),(.14,.49),(.18,.56),(.25,.585),(.36,.56),(.49,.48),(.60,.34),(.68,.18),(.71,.075),(.71,.001)]
    def warp(x,y,z,a,k):
        f=1+.035*math.sin(a*3+.7)+.025*math.sin(a*5)
        dome=max(0,(z-.24)/.51)
        droop=.065*math.sin(a+.3)+.025*math.sin(a*5)
        return (x*f-.095*dome,y*f,z+droop*(1-dome)+.045*(LEVEL-1)*dome)
    def olive(v):
        crown=max(0,min(1,(v.z-.20)/.56));streak=.5+.5*math.sin(math.atan2(v.y,v.x)*9+v.z*2)
        return (.075+.13*crown+.025*streak,.13+.11*crown+.028*streak,.018+.022*crown)
    obj=p.lathe('Soft asymmetric poison bell',profile,cap,olive,n,warp)
    obj.data.materials.append(flesh)
    for poly in list(obj.data.polygons)[:n*2]:poly.material_index=1
    for i in range(12 if p.MOBILE else 16):
        a=i*TAU/(12 if p.MOBILE else 16)
        p.tube('Radiating cream gill',[(.19*math.cos(a),.19*math.sin(a),.175),(.34*math.cos(a),.34*math.sin(a),.14),(.48*math.cos(a),.48*math.sin(a),.15)],
               [.012,.014,.005],flesh,(.42,.32,.13),4)
    # The wet skirt hugs the rolled cap edge and feeds the irregular droplets.
    pts=[warp(.565*math.cos(i*TAU/n),.565*math.sin(i*TAU/n),.185,i*TAU/n,3) for i in range(n+1)]
    p.tube('Wet rolled skirt',pts,[.022]*len(pts),wet,(.15,.24,.027),5)
    for a,length in [(-2.3,.23),(-.85,.31),(.45,.17)]:
        x,y,z=warp(.55*math.cos(a),.55*math.sin(a),.205,a,3)
        p.tube('Heavy irregular slime',[(x,y,z+.03),(x*1.02,y*1.02,z-.06),(x*1.025,y*1.025,z-length)],
               [.039,.024,.016],wet,(.29,.36,.035),6)
        p.blob('Rounded hanging drop',(x*1.025,y*1.025,z-length),(.03,.03,.044),wet,(.29,.36,.035),7,4)
    # Broad lenticels read from the gameplay camera, unlike tiny stone-like warts.
    for angle,radius,size in [(-2.3,.30,.077),(-.85,.38,.085),(.35,.46,.06),(2.2,.18,.06),(-2.9,.48,.06)]:
        z=.24;slope=1
        for (za,ra),(zb,rb) in zip(profile[4:],profile[5:]):
            if rb<=radius<=ra:z=za+(zb-za)*(ra-radius)/(ra-rb);slope=(zb-za)/(ra-rb);break
        x,y,z=warp(radius*math.cos(angle),radius*math.sin(angle),z,angle,0)
        center=Vector((x,y,z+.006));normal=Vector((math.cos(angle)*slope,math.sin(angle)*slope,1)).normalized()
        spot=p.blob('Golden cap lenticel',center,(size,size*.72,.014),wet,(.57,.51,.15),8,4)
        rotation=Vector((0,0,1)).rotation_difference(normal)
        for v in spot.data.vertices:v.co=center+rotation@(v.co-center)
    for i,side in enumerate([-1,1]):
        growth=(.70 if i==0 else .002) if LEVEL==2 else 1 if LEVEL==3 else .002
        x=side*.32;y=-.24;z=-.18+i*.10
        p.tube('Attached bud stem',[(.04,0,-.35),(x*growth,y*growth,z)], [.045*growth,.028*growth],flesh,cream,6)
        p.lathe('Maturing daughter cap',[(0,.025),(.01,.17),(.065,.19),(.15,.13),(.19,.035),(.19,.001)],cap,olive,12 if p.MOBILE else 16,
                lambda u,v,w,a,k:(x*growth+u*growth,y*growth+v*growth,-.30+(z+.30+w)*growth))


def shell():
    # Preserve the Phase-3A shell profile and its thick jagged double wall.
    p.build_shell()
    body=p.PARTS[0]
    discard=[obj for obj in p.PARTS if obj.name.startswith(('Hairline fracture','Carved protection glyph','Mineral pore'))]
    for obj in discard:p.PARTS.remove(obj);bpy.data.objects.remove(obj,do_unlink=True)
    ceramic=body.data.materials[0];inside=body.data.materials[1]
    ceramic.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.80
    for mat in [ceramic,inside]:
        next(n for n in mat.node_tree.nodes if n.type=='NORMAL_MAP').inputs['Strength'].default_value=.18
    rune=p.material('Polish mineral protection inlay',.57,.12,.035,normal=.07)
    # Modest rim growth, not a replacement egg silhouette.
    for v in body.data.vertices:
        if v.co.z>.30:v.co.z+=(LEVEL-1)*.034*(v.co.z-.30)/.24
    profile=[(-.52,.12),(-.47,.24),(-.35,.34),(-.15,.41),(.08,.44),(.28,.42),(.55,.39)]
    def front(x,z):
        r=.39
        for (za,ra),(zb,rb) in zip(profile,profile[1:]):
            if za<=z<=zb:r=ra+(rb-ra)*(z-za)/(zb-za);break
        return (x,-math.sqrt(max(.002,r*r-x*x))-.0045,z)
    def ribbon(name,coords,width,mat,color):
        # Flat, surface-following ribbons replace the raised dark tube seams.
        pts=[]
        for (x,z),(xx,zz) in zip(coords,coords[1:]):
            for i in range(5):
                t=i/5;pts.append((x+(xx-x)*t,z+(zz-z)*t))
        pts.append(coords[-1]);verts=[]
        for i,(x,z) in enumerate(pts):
            w=width*(.5+.5*math.sin(math.pi*i/(len(pts)-1)))
            a=pts[max(0,i-1)];b=pts[min(len(pts)-1,i+1)]
            dx,dz=b[0]-a[0],b[1]-a[1];length=max(.000001,math.hypot(dx,dz))
            nx,nz=-dz/length,dx/length
            verts.extend([front(x-w*nx,z-w*nz),front(x+w*nx,z+w*nz)])
        p.mesh(name,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(pts)-1)],mat,color,variation=.045)
    for pts in [[(-.17,.36),(-.23,.17),(-.11,.02),(-.19,-.18),(-.11,-.34)],[(.24,.39),(.16,.20),(.23,.09),(.15,-.06)],[(.16,.20),(.03,.28),(-.01,.41)]]:
        ribbon('Fine integrated fracture',pts,.0038,ceramic,(.27,.20,.10))
    # One clear dark teal shield silhouette; large enough to survive mobile LOD.
    s=1.30+.08*(LEVEL-1)
    glyphs=[[(-.095,.07),(-.09,-.09),(0,-.19),(.09,-.09),(.095,.07),(-.095,.07)],[(0,-.12),(0,.025)],[(-.05,-.04),(0,-.085),(.05,-.04)]]
    for pts in glyphs:
        ribbon('Inlaid shield rune',[(x*s,z*s) for x,z in pts],.011,rune,(.035,.20,.19))
    # At III, paired mineral wings frame the same shield rather than a new symbol.
    grow=1 if LEVEL==3 else .002
    for side in [-1,1]:
        ribbon('Awakened shield wings',[(side*(.14+x*grow),-.10+z*grow) for x,z in [(0,0),(.08,.12),(.13,.09),(.07,-.04),(0,0)]],.009*grow,rune,(.075,.28,.26))
    for x,z in [(-.28,.11),(.31,.13),(-.23,-.24),(.20,-.31),(.09,.30),(-.04,-.37)]:
        center=Vector(front(x,z));normal=Vector((center.x,center.y,0)).normalized()
        pore=p.blob('Embedded mineral fleck',center,(.014,.020,.0025),ceramic,(.36,.28,.15),6,3)
        rotation=Vector((0,0,1)).rotation_difference(normal)
        for v in pore.data.vertices:v.co=center+rotation@(v.co-center)


def mount():
    brass=p.material('Polish forged tier brass',.43,.65,normal=.15)
    rune=p.material('Polish tier rune inlay',.60,0,.12,normal=.07)
    n=16 if p.MOBILE else 24
    p.ring('Refined waist binding',.61,.135,.018,brass,(.4,.25,.10),n,5)
    # Low crown shoulders, outside the ingredient, below the cooldown dial.
    for i in range(6):
        a=i*TAU/6;h=.055 if LEVEL<3 else .18
        def pos(r,z,u=0):return (r*math.cos(a)-u*math.sin(a),r*math.sin(a)+u*math.cos(a),z)
        p.tube('Forged crown shoulder',[pos(.61,.09),pos(.625,.17),pos(.60,.17+h),pos(.55,.18+h*.62)],
               [.023,.024,.020,.009],brass,(.40,.26,.10),4)
        p.blob('Family enamel stud',pos(.631,.172+h*.35),(.019,.019,.028 if LEVEL<3 else .043),rune,(.32,.32,.27),6,4)


original_bake=p.bake_surface
def bake(name,objects,materials):
    if name=='tier-mount':
        for mat in materials:
            bs=mat.node_tree.nodes.get('Principled BSDF')
            for link in list(bs.inputs['Base Color'].links):mat.node_tree.links.remove(link)
            bs.inputs['Base Color'].default_value=(.4,.25,.10,1) if 'brass' in mat.name else (.32,.32,.27,1)
            for link in list(bs.inputs['Emission Color'].links):mat.node_tree.links.remove(link)
            bs.inputs['Emission Color'].default_value=(.12,.12,.09,1)
        return
    # Reuse the atlas bake, with finer/softer grain instead of a rock-like wash.
    original_bake(name,objects,materials)

p.bake_surface=bake
manifest={'version':1,'baseline':'1539387','source':'Reproducible polish using the Phase 3A Blender pipeline; no paid inputs','assets':[]}
for tier in ['desktop','mobile']:
    p.MOBILE=tier=='mobile'
    for name,build in [('chili',pepper),('slime-shroom',fungus),('egg-shell',shell),('tier-mount',mount)]:
        levels={}
        for LEVEL in [2,3,1]:
            p.reset();build()
            levels[LEVEL]=[tuple(v.co) for obj in p.PARTS for v in obj.data.vertices]
        assert len(levels[1])==len(levels[2])==len(levels[3]),name
        item=p.export(name,tier,{'LevelII':levels[2],'LevelIII':levels[3]})
        item['restBottom']=[-min(v[2] for v in levels[level]) for level in [1,2,3]]
        manifest['assets'].append(item)
(p.OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
print('POLISH_MANIFEST',json.dumps(manifest))
