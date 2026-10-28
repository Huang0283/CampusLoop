import base64
from pathlib import Path
import subprocess

from services.m8_phase4.transaction_dataset import _approval_payload


def sign_authorization(authorization, policy, directory):
    directory = Path(directory)
    signer_lines = []
    for owner in policy["requiredApprovals"]:
        approval = authorization["approvals"].get(owner)
        if not isinstance(approval, dict):
            continue
        private_key = directory / f"{owner}.key"
        subprocess.run(
            ["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(private_key)],
            check=True,
            capture_output=True,
        )
        public_key = (
            private_key.with_suffix(".key.pub").read_text(encoding="utf-8").split()
        )
        signer_lines.append(f"{owner} {public_key[0]} {public_key[1]}")
        approval["signature"] = ""
        payload = directory / f"{owner}.payload"
        payload.write_bytes(_approval_payload(authorization, owner, approval))
        subprocess.run(
            [
                "ssh-keygen",
                "-Y",
                "sign",
                "-n",
                "campusloop-m8-data-authorization",
                "-f",
                str(private_key),
                str(payload),
            ],
            check=True,
            capture_output=True,
        )
        approval["signature"] = base64.b64encode(
            payload.with_suffix(".payload.sig").read_bytes()
        ).decode("ascii")
    trusted_signers = directory / "allowed_signers"
    trusted_signers.write_text("\n".join(signer_lines) + "\n", encoding="utf-8")
    return trusted_signers
