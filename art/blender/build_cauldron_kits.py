"""Export reusable character attachments for the Quaternius cauldron donor.

The former hero GLBs contained an entirely procedural vessel.  Phase 2 keeps
the character-specific face, footwear, runes and Moor growth, but removes the
old bodies/rims so these modules can be kitbashed onto the authored CC0 donor
mesh at runtime without duplicating its texture set in every character GLB.
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy


SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from build_hero_assets import (  # noqa: E402
    build_moor_cauldron,
    build_player_cauldron,
    export_glb,
    reset_scene,
)


def remove_objects(*, exact: set[str], prefixes: tuple[str, ...]) -> None:
    for obj in list(bpy.context.scene.objects):
        if obj.name in exact or obj.name.startswith(prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def build_player_kit() -> None:
    build_player_cauldron()
    remove_objects(
        exact={
            "Hero_body",
            "Hero_belly_plate",
            "Hero_rim_outer",
            "Hero_rim_inner",
            "Hero_liquid",
        },
        prefixes=("Rivet_", "Hero_handle_", "Hero_handle_mount_"),
    )
    export_glb("hero-cauldron-player-kit")


def build_moor_kit() -> None:
    build_moor_cauldron()
    remove_objects(
        exact={
            "Moor_body",
            "Moor_belly_wear",
            "Moor_rim",
            "Moor_inner_rim",
            "Moor_liquid",
        },
        prefixes=("Rivet_", "Moor_bubble_", "Moor_mushroom_", "Moor_foot_fungus_"),
    )
    export_glb("hero-cauldron-moor-kit")


def main() -> None:
    reset_scene()
    build_player_kit()
    reset_scene()
    build_moor_kit()
    print("Exported modular Quaternius cauldron character kits")


if __name__ == "__main__":
    main()
