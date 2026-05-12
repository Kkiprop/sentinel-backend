from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import Company

from .models import Checkpoint, PatrolLog, Route, Shift, Site
from .serializers import CheckpointAdminSerializer
from .services import process_qr_scan
from .views import DashboardAPIView


User = get_user_model()


class CheckpointWorkflowTests(TestCase):
	def setUp(self):
		self.company = Company.objects.create(name="Acme Security")
		self.guard = User.objects.create_user(
			email="guard@example.com",
			password="password123",
			role="guard",
			company=self.company,
		)
		self.primary_site = Site.objects.create(
			name="HQ",
			location_name="Main Gate",
			latitude=1.0,
			longitude=36.0,
			company=self.company,
		)
		self.secondary_site = Site.objects.create(
			name="Warehouse",
			location_name="Back Gate",
			latitude=2.0,
			longitude=37.0,
			company=self.company,
		)
		self.primary_route = Route.objects.create(name="Perimeter", site=self.primary_site)
		self.secondary_route = Route.objects.create(name="Yard", site=self.secondary_site)
		self.shift = Shift.objects.create(
			guard=self.guard,
			site=self.primary_site,
			start_time=timezone.now(),
			status="active",
		)

	def test_checkpoint_serializer_returns_qr_image(self):
		checkpoint = Checkpoint.objects.create(
			name="Gate A",
			route=self.primary_route,
			latitude=1.0001,
			longitude=36.0001,
			order=1,
		)

		serializer = CheckpointAdminSerializer(checkpoint)

		self.assertTrue(checkpoint.qr_code.startswith("checkpoint:"))
		self.assertTrue(
			serializer.data["qr_code_image"].startswith("data:image/png;base64,")
		)

	def test_scan_rejects_checkpoint_from_other_site(self):
		checkpoint = Checkpoint.objects.create(
			name="Warehouse Door",
			route=self.secondary_route,
			latitude=2.0001,
			longitude=37.0001,
			order=1,
		)

		with self.assertRaisesMessage(Exception, "Checkpoint does not belong to the active shift site"):
			process_qr_scan(
				self.guard,
				{
					"checkpoint_qr": checkpoint.qr_code,
					"latitude": 2.0001,
					"longitude": 37.0001,
					"scanned_at": timezone.now(),
					"client_id": "scan-1",
				},
			)

	def test_scan_stores_checkpoint_coordinate_snapshot(self):
		checkpoint = Checkpoint.objects.create(
			name="Gate B",
			route=self.primary_route,
			latitude=1.1234,
			longitude=36.5678,
			order=2,
		)

		patrol_log = process_qr_scan(
			self.guard,
			{
				"checkpoint_qr": checkpoint.qr_code,
				"latitude": 1.12345,
				"longitude": 36.56781,
				"scanned_at": timezone.now(),
				"client_id": "scan-2",
			},
		)

		saved_log = PatrolLog.objects.get(id=patrol_log.id)
		self.assertEqual(saved_log.checkpoint_id, checkpoint.id)
		self.assertEqual(saved_log.checkpoint_latitude, checkpoint.latitude)
		self.assertEqual(saved_log.checkpoint_longitude, checkpoint.longitude)


class DashboardStatsTests(TestCase):
	def setUp(self):
		self.factory = APIRequestFactory()
		self.company = Company.objects.create(name="Ops Company")
		self.admin_user = User.objects.create_user(
			email="admin@example.com",
			password="password123",
			role="admin",
			company=self.company,
		)
		self.guard = User.objects.create_user(
			email="guard@example.com",
			password="password123",
			role="guard",
			company=self.company,
		)
		self.other_company = Company.objects.create(name="Other Company")
		self.other_guard = User.objects.create_user(
			email="other@example.com",
			password="password123",
			role="guard",
			company=self.other_company,
		)

		self.site = Site.objects.create(
			name="HQ",
			location_name="Main Gate",
			latitude=1.0,
			longitude=36.0,
			company=self.company,
		)
		self.other_site = Site.objects.create(
			name="Remote",
			location_name="Yard",
			latitude=2.0,
			longitude=37.0,
			company=self.other_company,
		)
		self.route = Route.objects.create(name="Route A", site=self.site)
		self.other_route = Route.objects.create(name="Route B", site=self.other_site)
		self.checkpoint = Checkpoint.objects.create(
			name="Gate A",
			route=self.route,
			latitude=1.0001,
			longitude=36.0001,
			order=1,
		)
		self.other_checkpoint = Checkpoint.objects.create(
			name="Gate B",
			route=self.other_route,
			latitude=2.0001,
			longitude=37.0001,
			order=1,
		)

		self.active_shift = Shift.objects.create(
			guard=self.guard,
			site=self.site,
			start_time=timezone.now(),
			status="active",
		)
		self.other_shift = Shift.objects.create(
			guard=self.other_guard,
			site=self.other_site,
			start_time=timezone.now(),
			status="active",
		)

		PatrolLog.objects.create(
			shift=self.active_shift,
			checkpoint=self.checkpoint,
			scanned_at=timezone.now(),
			latitude=1.0,
			longitude=36.0,
			checkpoint_latitude=self.checkpoint.latitude,
			checkpoint_longitude=self.checkpoint.longitude,
			is_valid=True,
		)
		PatrolLog.objects.create(
			shift=self.active_shift,
			checkpoint=self.checkpoint,
			scanned_at=timezone.now(),
			latitude=1.0,
			longitude=36.0,
			checkpoint_latitude=self.checkpoint.latitude,
			checkpoint_longitude=self.checkpoint.longitude,
			is_valid=False,
		)
		PatrolLog.objects.create(
			shift=self.other_shift,
			checkpoint=self.other_checkpoint,
			scanned_at=timezone.now(),
			latitude=2.0,
			longitude=37.0,
			checkpoint_latitude=self.other_checkpoint.latitude,
			checkpoint_longitude=self.other_checkpoint.longitude,
			is_valid=True,
		)

	def test_admin_dashboard_uses_company_scoped_logs(self):
		request = self.factory.get("/api/patrols/dashboard/")
		force_authenticate(request, user=self.admin_user)

		response = DashboardAPIView.as_view()(request)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["total_patrol_logs"], 2)
		self.assertEqual(response.data["valid_patrol_logs"], 1)
		self.assertEqual(response.data["invalid_patrol_logs"], 1)
		self.assertTrue(response.data["active_shift"])
