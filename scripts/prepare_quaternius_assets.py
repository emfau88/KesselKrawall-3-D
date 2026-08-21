"""Prepare a deliberately small Quaternius runtime set from the source ZIPs.

The three full CC0 packs stay outside git. This script copies only the models
approved by the Phase-2 visual bake-off, keeps their original glTF structure,
and downsizes shared textures for browser/mobile delivery.
"""

from __future__ import annotations

import argparse
import io
import json
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = REPO_ROOT / "public" / "assets" / "quaternius"


@dataclass(frozen=True)
class Pack:
    key: str
    zip_name: str
    gltf_root: PurePosixPath
    license_path: PurePosixPath
    label: str
    models: tuple[str, ...]
    texture_limit: int = 512


PACKS = (
    Pack(
        key="fantasy",
        zip_name="Fantasy Props MegaKit[Standard].zip",
        gltf_root=PurePosixPath("Exports/glTF"),
        license_path=PurePosixPath("License_Standard.txt"),
        label="Quaternius Fantasy Props MegaKit Standard",
        models=(
            "Banner_1",
            "Barrel",
            "Bookcase_2",
            "BookStand",
            "CandleStick_Triple",
            "Cauldron",
            "Chest_Wood",
            "Lantern_Wall",
            "Potion_1",
            "Potion_2",
            "Shelf_Small_Bottles",
            "Torch_Metal",
            "Workbench",
        ),
    ),
    Pack(
        key="village",
        zip_name="Medieval Village MegaKit[Standard].zip",
        gltf_root=PurePosixPath("Medieval Village MegaKit[Standard]/glTF"),
        license_path=PurePosixPath("Medieval Village MegaKit[Standard]/License_Standard.txt"),
        label="Quaternius Medieval Village MegaKit Standard",
        models=(
            "DoorFrame_Round_Brick",
            "Floor_UnevenBrick",
            "Prop_Vine5",
            "Wall_UnevenBrick_Straight",
        ),
    ),
    Pack(
        key="nature",
        zip_name="Stylized Nature MegaKit[Standard].zip",
        gltf_root=PurePosixPath("glTF"),
        license_path=PurePosixPath("License_Standard.txt"),
        label="Quaternius Stylized Nature MegaKit Standard",
        models=(
            "DeadTree_3",
            "Mushroom_Common",
            "Mushroom_Laetiporus",
            "Plant_7_Big",
            "Rock_Medium_2",
        ),
    ),
)


def archive_bytes(archive: zipfile.ZipFile, path: PurePosixPath) -> bytes:
    try:
        return archive.read(path.as_posix())
    except KeyError as error:
        raise RuntimeError(f"Missing required archive entry: {path}") from error


def write_bytes(path: Path, data: bytes) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return len(data)


def resize_png(data: bytes, limit: int) -> tuple[bytes, tuple[int, int], tuple[int, int]]:
    with Image.open(io.BytesIO(data)) as source:
        source.load()
        original_size = source.size
        image = source.copy()
    image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True, compress_level=9)
    return buffer.getvalue(), original_size, image.size


def prepare_pack(pack: Pack) -> dict[str, object]:
    zip_path = REPO_ROOT / pack.zip_name
    if not zip_path.is_file():
        raise RuntimeError(f"Source pack not found: {zip_path}")

    destination = OUTPUT_ROOT / pack.key
    destination.mkdir(parents=True, exist_ok=True)
    copied_files: set[str] = set()
    texture_report: dict[str, dict[str, object]] = {}
    source_bytes = 0
    runtime_bytes = 0

    with zipfile.ZipFile(zip_path) as archive:
        license_data = archive_bytes(archive, pack.license_path)
        runtime_bytes += write_bytes(destination / "LICENSE.txt", license_data)
        source_bytes += len(license_data)
        copied_files.add("LICENSE.txt")

        for model in pack.models:
            gltf_archive_path = pack.gltf_root / f"{model}.gltf"
            gltf_data = archive_bytes(archive, gltf_archive_path)
            gltf = json.loads(gltf_data)
            runtime_bytes += write_bytes(destination / f"{model}.gltf", gltf_data)
            source_bytes += len(gltf_data)
            copied_files.add(f"{model}.gltf")

            referenced_uris: list[str] = []
            referenced_uris.extend(buffer["uri"] for buffer in gltf.get("buffers", []) if "uri" in buffer)
            referenced_uris.extend(image["uri"] for image in gltf.get("images", []) if "uri" in image)

            for uri in referenced_uris:
                if uri.startswith("data:"):
                    continue
                archive_path = pack.gltf_root / PurePosixPath(uri)
                data = archive_bytes(archive, archive_path)
                source_bytes += len(data)
                if uri in copied_files:
                    continue

                if uri.lower().endswith(".png"):
                    resized, source_size, runtime_size = resize_png(data, pack.texture_limit)
                    runtime_bytes += write_bytes(destination / uri, resized)
                    texture_report[uri] = {
                        "sourceDimensions": list(source_size),
                        "runtimeDimensions": list(runtime_size),
                        "sourceBytes": len(data),
                        "runtimeBytes": len(resized),
                    }
                else:
                    runtime_bytes += write_bytes(destination / uri, data)
                copied_files.add(uri)

    return {
        "label": pack.label,
        "sourceZip": pack.zip_name,
        "license": "CC0-1.0",
        "models": list(pack.models),
        "textureLimit": pack.texture_limit,
        "sourceBytesReferenced": source_bytes,
        "runtimeBytes": runtime_bytes,
        "textures": texture_report,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Remove only the generated Quaternius runtime directory before rebuilding it.",
    )
    args = parser.parse_args()

    if args.clean and OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    packs = {pack.key: prepare_pack(pack) for pack in PACKS}
    manifest = {
        "generatedBy": "scripts/prepare_quaternius_assets.py",
        "purpose": "KesselKrawall 3D Phase-2 Golden Slice",
        "packs": packs,
    }
    manifest_path = OUTPUT_ROOT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    total_models = sum(len(pack.models) for pack in PACKS)
    total_runtime = sum(int(pack["runtimeBytes"]) for pack in packs.values())
    print(f"Prepared {total_models} models in {OUTPUT_ROOT}")
    print(f"Runtime payload: {total_runtime / 1024 / 1024:.2f} MiB")


if __name__ == "__main__":
    main()
