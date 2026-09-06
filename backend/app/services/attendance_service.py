from math import asin, cos, radians, sin, sqrt

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.timezone import now_ist, to_ist, today_ist
from app.models import Attendance, AttendanceStatus, Employee
from app.services.calendar_sync_service import sync_attendance_event

_EARTH_RADIUS_M = 6_371_000.0


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lng points, in meters."""
    lat1_r, lon1_r, lat2_r, lon2_r = map(radians, (lat1, lon1, lat2, lon2))
    d_lat = lat2_r - lat1_r
    d_lon = lon2_r - lon1_r
    a = sin(d_lat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(d_lon / 2) ** 2
    return 2 * _EARTH_RADIUS_M * asin(sqrt(a))


def _distance_from_office_m(latitude: float, longitude: float) -> float:
    settings = get_settings()
    return haversine_distance_m(latitude, longitude, settings.office_latitude, settings.office_longitude)


def _require_within_geofence(latitude: float, longitude: float) -> float:
    settings = get_settings()
    distance_m = _distance_from_office_m(latitude, longitude)
    if distance_m > settings.office_geofence_radius_m:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"You are {distance_m:.0f}m from the office, which is outside the "
                f"{settings.office_geofence_radius_m:.0f}m allowed range."
            ),
        )
    return distance_m


def _employee_for_user(db: Session, user_employee_id: int | None) -> Employee:
    if user_employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not linked to an employee record.",
        )
    employee = db.get(Employee, user_employee_id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not linked to an employee record.",
        )
    return employee


def check_in(db: Session, *, user_employee_id: int | None, latitude: float, longitude: float) -> Attendance:
    employee = _employee_for_user(db, user_employee_id)

    latest_record = db.scalar(
        select(Attendance)
        .where(Attendance.employee_id == employee.id)
        .order_by(Attendance.id.desc())
    )
    if latest_record is not None and latest_record.status == AttendanceStatus.open:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an open check-in. Check out before checking in again.",
        )
    # One check-in/check-out cycle per employee per IST calendar day —
    # once today's cycle is completed, another check-in has to wait
    # until tomorrow rather than starting a second cycle today.
    if latest_record is not None and to_ist(latest_record.check_in_at).date() == today_ist():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You've already checked in and checked out today. Try again tomorrow.",
        )

    distance_m = _require_within_geofence(latitude, longitude)

    record = Attendance(
        employee_id=employee.id,
        check_in_at=now_ist(),
        check_in_latitude=latitude,
        check_in_longitude=longitude,
        check_in_distance_m=distance_m,
        status=AttendanceStatus.open,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    synced = sync_attendance_event(
        employee_id=employee.id,
        employee_name=employee.full_name,
        event_type="check_in",
        timestamp_iso=record.check_in_at.isoformat(),
    )
    if synced:
        record.calendar_synced = True
        db.commit()
        db.refresh(record)

    return record


def check_out(db: Session, *, user_employee_id: int | None, latitude: float, longitude: float) -> Attendance:
    employee = _employee_for_user(db, user_employee_id)

    record = db.scalar(
        select(Attendance)
        .where(Attendance.employee_id == employee.id, Attendance.status == AttendanceStatus.open)
        .order_by(Attendance.id.desc())
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You don't have an open check-in to check out from.",
        )

    distance_m = _require_within_geofence(latitude, longitude)

    record.check_out_at = now_ist()
    record.check_out_latitude = latitude
    record.check_out_longitude = longitude
    record.check_out_distance_m = distance_m
    record.status = AttendanceStatus.completed
    db.commit()
    db.refresh(record)

    sync_attendance_event(
        employee_id=employee.id,
        employee_name=employee.full_name,
        event_type="check_out",
        timestamp_iso=record.check_out_at.isoformat(),
    )

    return record
