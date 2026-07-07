from django.utils import timezone
from .models import Checkpoint, Incident, PatrolLog, Shift, Site, GuardLocation
from .utils import calculate_distance


MAX_DISTANCE_METERS = 100


def start_shift(user, data):

    existing_shift = Shift.objects.filter(
        guard=user,
        status='active'
    ).first()

    if existing_shift:
        raise Exception(
            "Guard already has active shift"
        )

    site = Site.objects.get(id=data['site_id'])

    shift = Shift.objects.create(
        guard=user,
        site=site,
        start_time=timezone.now(),

        start_latitude=data['latitude'],
        start_longitude=data['longitude'],
    )

    # Also create/update GuardLocation for live tracking
    try:
        GuardLocation.objects.update_or_create(
            guard=user,
            defaults={
                'latitude': data['latitude'],
                'longitude': data['longitude'],
            }
        )
    except Exception:
        pass

    return shift


def end_shift(user, data):

    shift = Shift.objects.filter(guard=user, status='active').first()

    if not shift:
        raise Exception(
            "No active shift found"
        )

    shift.status = 'completed'

    shift.end_time = timezone.now()

    shift.end_latitude = data['latitude']
    shift.end_longitude = data['longitude']

    shift.save()

    return shift


def process_patrol_log(user, data):
    checkpoint = Checkpoint.objects.get(
        qr_code=data["checkpoint_qr"]
    )

    shift = Shift.objects.filter(
        guard=user,
        status="active"
    ).first()

    if not shift:
        raise Exception("No active shift found")

    distance = calculate_distance(
        data["latitude"],
        data["longitude"],
        checkpoint.latitude,
        checkpoint.longitude,
    )

    is_valid = distance <= MAX_DISTANCE_METERS

    patrol_log = PatrolLog.objects.create(
        shift=shift,
        checkpoint=checkpoint,
        latitude=data["latitude"],
        longitude=data["longitude"],
        scanned_at=data["scanned_at"],
        distance_meters=distance,
        is_valid=is_valid,
    )

    return patrol_log


def process_qr_scan(user, data):

    # CHECK ACTIVE SHIFT
    shift = Shift.objects.filter(
        guard=user,
        status='active'
    ).first()

    if not shift:
        raise Exception(
            "No active shift found"
        )

    # PREVENT DUPLICATES
    existing = PatrolLog.objects.filter(
        client_id=data['client_id']
    ).first()

    if existing:
        return existing

    # FIND CHECKPOINT
    checkpoint = Checkpoint.objects.filter(
        qr_code=data['checkpoint_qr']
    ).first()

    if not checkpoint:
        raise Exception(
            "Invalid checkpoint QR"
        )

    if checkpoint.site_id != shift.site_id:
        raise Exception(
            "Checkpoint does not belong to the active shift site"
        )

    # CALCULATE DISTANCE
    distance = calculate_distance(
        data['latitude'],
        data['longitude'],
        checkpoint.latitude,
        checkpoint.longitude
    )

    is_valid = True
    invalid_reason = None

    if distance > MAX_DISTANCE_METERS:

        is_valid = False

        invalid_reason = (
            f"Guard too far from checkpoint "
            f"({round(distance)}m)"
        )

    # SAVE PATROL LOG
    patrol_log = PatrolLog.objects.create(
        shift=shift,
        checkpoint=checkpoint,

        scanned_at=data['scanned_at'],

        latitude=data['latitude'],
        longitude=data['longitude'],

        checkpoint_latitude=checkpoint.latitude,
        checkpoint_longitude=checkpoint.longitude,

        distance_meters=distance,

        is_valid=is_valid,
        invalid_reason=invalid_reason,

        client_id=data['client_id']
    )

    # Also update GuardLocation on each QR scan for live tracking
    try:
        GuardLocation.objects.update_or_create(
            guard=user,
            defaults={
                'latitude': data['latitude'],
                'longitude': data['longitude'],
            }
        )
    except Exception:
        pass

    return patrol_log


def create_incident_report(user, data):

    shift = Shift.objects.filter(
        guard=user,
        status='active'
    ).first()

    if not shift:
        raise Exception(
            "No active shift found"
        )

    existing = Incident.objects.filter(
        client_id=data['client_id']
    ).first()

    if existing:
        return existing

    incident = Incident.objects.create(
        guard=user,
        shift=shift,
        type=data['type'],
        description=data['description'],
        latitude=data['latitude'],
        longitude=data['longitude'],
        created_at=data['created_at'],
        client_id=data['client_id'],
        image=data.get('image'),
        audio=data.get('audio'),
        video=data.get('video'),
        attachment=data.get('attachment')
    )

    return incident