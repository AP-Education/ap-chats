#!/usr/bin/env python3
"""
Dynamic inventory backed by `terraform output -json` for a single-droplet root.

Whichever tenant's backend was last selected via
`terraform init -backend-config=...` in the target workdir is what this
reflects — the script itself is tenant-agnostic.
"""
import json
import os
import subprocess
from pathlib import Path


def load_outputs(workdir: Path) -> dict:
    cmd = ["terraform", f"-chdir={workdir}", "output", "-json"]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, env=os.environ)
    except FileNotFoundError as exc:
        raise RuntimeError("terraform binary not found in PATH") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"Failed to execute {' '.join(cmd)}: {exc.stderr.strip()}") from exc

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to parse terraform output: {exc}") from exc


def extract_inventory(outputs: dict, group_name: str = "web") -> dict:
    """Build an inventory grouped under `group_name`.

    group_name should be the tenant slug (e.g. "prod") so each tenant's
    inventory script yields a differently-named group — that lets
    group_vars/<tenant>/ stay isolated even though every tenant otherwise
    runs the same single-host "web" role layout.
    """
    inventory = {
        "_meta": {"hostvars": {}},
        group_name: {"hosts": []},
        "all": {"children": [group_name]},
    }

    if not outputs:
        return inventory

    name = outputs.get("web_droplet_name", {}).get("value")
    public_ip = outputs.get("web_droplet_public_ip", {}).get("value")
    private_ip = outputs.get("web_droplet_private_ip", {}).get("value")
    vpc_cidr = outputs.get("vpc_cidr", {}).get("value")

    if not name or not public_ip:
        return inventory

    if vpc_cidr:
        inventory[group_name]["vars"] = {"vpc_cidr": vpc_cidr}

    inventory[group_name]["hosts"].append(name)
    hostvars = {
        "ansible_host": public_ip,
        "ansible_user": os.environ.get("ANSIBLE_SSH_USER", "runner"),
    }
    if private_ip:
        hostvars["private_ip"] = private_ip
    inventory["_meta"]["hostvars"][name] = hostvars

    return inventory
