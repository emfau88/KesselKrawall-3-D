# KesselKrawall · codebasierter PlayCanvas-Bakeoff

Dieses Unterpackage ist der isolierte Rendering-Versuch aus
[`docs/PLAYCANVAS_CODE_BAKEOFF_PLAN.md`](../../docs/PLAYCANVAS_CODE_BAKEOFF_PLAN.md).
Es ersetzt weder die R3F-Anwendung noch den renderer-neutralen Core.

## Aktueller Umfang: PC-C2

- offizielles PlayCanvas-React-/TypeScript-Scaffold;
- vollständig codebasiert, ohne Editor und MCP;
- eigene Abhängigkeiten, Lockdatei, TypeScript- und Vite-Konfiguration;
- relativer statischer Build für einen späteren `/playcanvas/`-Unterpfad;
- minimale technische Bühne mit Camera, Light und Render Component;
- eigener Isolationstest und verständliche Initialisierungsfehleranzeige.
- fünf direkt aus dem produktiven `public/assets` geladene Referenzmodelle;
- zentrale Bounds-, Kalibrierungs- und Slotdaten ohne Änderung der GLBs;
- deterministische Golden-Belegung mit Glut-Chili, Schleimpilz und Runenschale.

Responsive Kameraarbeit und Art Direction beginnen mit PC-C3. Der Core wird vor
einem bestandenen Rendering-Gate nicht importiert.

## Isolation

- Produktive Anwendung: Repository-Root unter `src/`
- Experiment: ausschließlich dieser Ordner
- Gemeinsame Runtime-Assets: später lesend aus `../../public/assets/`
- Core: frühestens PC-C7, ohne Kopie und nur über einen engen Adapter

## Prerequisites

Node.js 22.12 oder neuer. Das einmalig verwendete offizielle
`create-playcanvas`-Generatorwerkzeug benötigte Node.js 22.23.2 und wurde mit
der gebündelten Node-24-Runtime ausgeführt; für dieses erzeugte Projekt ist der
Generator keine Runtime-Abhängigkeit.

## Getting started

Vom Repository-Root:

```bash
npm run pc:install
npm run pc:dev
```

Die technische Bühne läuft standardmäßig unter <http://127.0.0.1:5190/>.

## Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start the Vite development server |
| `npm run build`     | Build for production              |
| `npm run start`     | Produktionsbuild lokal anzeigen   |
| `npm test`          | Isolationstests ausführen         |
| `npm run lint`      | Run ESLint                        |
| `npm run fmt`       | Check formatting                  |
| `npm run typecheck` | Run TypeScript checks             |

`npm run build` erzeugt eine eigenständige statische Seite unter `dist/`.
Dieser Ordner wird noch nicht automatisch in die produktive GitHub-Pages-Seite
übernommen.

## Further reading

- [PlayCanvas React manual](https://developer.playcanvas.com/user-manual/react/)
- [React documentation](https://react.dev/)
- [Vite documentation](https://vite.dev/)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
