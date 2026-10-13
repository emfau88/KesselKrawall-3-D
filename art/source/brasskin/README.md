# Brasskin — supplied image-to-3D source

The project owner supplied `source.glb` on 13 October 2026 as
`task_35d44f93-4d90-4cee-8096-30af097f5e88_model.glb`.

The source is retained byte-for-byte. Its SHA-256 is
`38a551e9d45d3856af33461c21ea86f4cffcd0d52476c2f241fb43ee6c2fe462`.
It contains 53,269 triangles, one material and one embedded 1024×1024 color image.

The input image, generation service and license receipt were not supplied.
This folder records provenance; it does not assert a new license or authorship
for the supplied model. On the project owner's request it is now used as the
player cauldron in the game as well as in the isolated character preview.

The reproducible derivative builder is
`art/blender/build_brasskin_morph_character.py`. It preserves the original face
and texture, generates normals, reduces geometry, removes the fixed brew surface,
adds localized facial morphs and exports desktop/mobile runtime variants.

An early replacement-face approach was rejected by the project owner and is
not part of the exported character.
