"""Operator workflow for pilot requests; never marks payment automatically."""
import argparse
import json

from sqlalchemy.orm import Session
from app.database import engine
from app.models import workspace  # noqa: F401
from app.models.workspace import PilotRequest
from app.models.organization import Organization
from app.security import audit


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["list", "invoice", "paid", "enable", "disable"])
    parser.add_argument("--id")
    parser.add_argument("--reference")
    parser.add_argument("--organization-id")
    args = parser.parse_args()
    with Session(engine) as db:
        if args.action == "list":
            rows = db.query(PilotRequest).order_by(PilotRequest.created_at.desc()).all()
            print(json.dumps([{"id": row.id, "company": row.company, "email": row.email,
                               "goal": row.goal, "team_size": row.team_size, "state": row.state,
                               "invoice_reference": row.invoice_reference} for row in rows], indent=2))
            return
        if args.action == "disable":
            org = db.get(Organization, args.organization_id)
            if not org:
                parser.error("A valid --organization-id is required.")
            org.processing_enabled = False
            audit(db, None, "processing_disabled", organization_id=org.id)
            db.commit()
            print(json.dumps({"organization_id": org.id, "processing_enabled": False}))
            return
        row = db.get(PilotRequest, args.id)
        if not row:
            parser.error("A valid --id is required.")
        if args.action == "invoice":
            if row.state == "paid":
                parser.error("A paid pilot cannot be returned to invoiced.")
            if not args.reference or not args.reference.strip() or len(args.reference) > 100:
                parser.error("Record the externally issued invoice using --reference.")
            row.invoice_reference, row.state = args.reference.strip(), "invoiced"
        elif args.action == "enable":
            if row.state != "paid":
                parser.error("Confirm actual pilot payment before enabling processing.")
            org = db.get(Organization, args.organization_id)
            if not org or (row.organization_id and row.organization_id != org.id):
                parser.error("Choose the verified pilot workspace using --organization-id.")
            row.organization_id, org.processing_enabled = org.id, True
            audit(db, None, "processing_enabled", {"pilot_request_id": row.id}, org.id)
        elif not row.invoice_reference or row.state != "invoiced":
            parser.error("Record an issued invoice before confirming its payment.")
        else:
            row.state = "paid"
        db.commit()
        print(json.dumps({"id": row.id, "state": row.state}))


if __name__ == "__main__":
    main()
