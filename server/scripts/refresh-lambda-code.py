"""Refresh application files in an already built Linux Lambda ZIP.

The dependency manifest must match; otherwise run package-lambda.ps1 first.
Native dependencies and their ZIP metadata are preserved unchanged.
"""
import json
import pathlib
import sys
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "lambda.zip"
target = root / "lambda-recent.zip"
if source.resolve() == target.resolve():
    raise ValueError("Input and output ZIP must differ")
with zipfile.ZipFile(source) as archive:
    manifest = json.loads(archive.read("package.json"))
    local = json.loads((root / "package.json").read_text(encoding="utf-8"))
    if manifest["dependencies"] != local["dependencies"]:
        raise ValueError("Dependencies changed; build a fresh Linux package first")
    for required in ["node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64.node",
                     "node_modules/argon2/prebuilds/linux-x64/argon2.glibc.node"]:
        archive.getinfo(required)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for info in archive.infolist():
            if info.filename.startswith(("dist/", "assets/")):
                continue
            output.writestr(info, archive.read(info))
        for folder in ["dist", "assets"]:
            for path in (root / folder).rglob("*"):
                if path.is_file():
                    output.write(path, path.relative_to(root).as_posix())
with zipfile.ZipFile(target) as archive:
    if sum(i.file_size for i in archive.infolist()) >= 250 * 1024 * 1024:
        raise ValueError("Package exceeds Lambda's uncompressed size limit")
print(f"Created {target.name}: {target.stat().st_size} bytes")
