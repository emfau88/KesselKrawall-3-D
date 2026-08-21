# Blender-Hero-Asset-Pipeline

Die Skripte in diesem Ordner sind die reproduzierbare Quelle der originalen
3D-Hero-Assets. Alte 2D-Bilder und die Production-Mockups dienen ausschließlich
als Silhouetten-, Charakter-, Licht- und Kompositionsreferenz; sie werden nicht
in Runtime-Dateien eingebettet.

## Build

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' `
  --background --python art/blender/build_hero_assets.py
```

Ausgabe:

- optimierte Runtime-Modelle: `public/assets/hero/*.glb`
- neutrale Review-Renders: `art/blender/previews/*.png`

Die Modelle verwenden gemeinsame kleine PBR-Materialfamilien und benötigen
keine externen Texturen. Änderungen erfolgen im Skript und werden anschließend
neu exportiert, damit Quelldaten und Web-Build nicht auseinanderlaufen.
