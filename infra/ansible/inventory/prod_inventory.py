#!/usr/bin/env python3
"""Ansible dynamic inventory for the prod tenant's terraform root.

Usage: inventory/prod_inventory.py --list
"""
import argparse
import importlib.util
import json
from pathlib import Path


def load_terraform_state():
    module_path = Path(__file__).resolve().parent / "terraform_state.py"
    spec = importlib.util.spec_from_file_location("terraform_state", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--list", action="store_true")
    group.add_argument("--host")
    args = parser.parse_args()

    if args.host:
        print(json.dumps({}))
        return

    workdir = Path(__file__).resolve().parents[1] / "terraform" / "prod"
    tf_state = load_terraform_state()
    outputs = tf_state.load_outputs(workdir)
    inventory = tf_state.extract_inventory(outputs, group_name="prod")
    if not inventory["prod"]["hosts"]:
        raise RuntimeError(
            "No web host in terraform output — run `terraform apply` in "
            "infra/terraform/prod first."
        )
    print(json.dumps(inventory))


if __name__ == "__main__":
    main()
