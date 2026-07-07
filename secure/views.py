from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import Client, Contract, Payment, Invoice
from .serializers import ClientSerializer, ContractSerializer, PaymentSerializer, InvoiceSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "admin"
        )


class ClientViewSet(ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return Client.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class ContractViewSet(ModelViewSet):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return Contract.objects.filter(company=self.request.user.company).select_related('client')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class PaymentViewSet(ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return Payment.objects.filter(company=self.request.user.company).select_related('client', 'contract')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class InvoiceViewSet(ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return Invoice.objects.filter(company=self.request.user.company).select_related('client', 'contract')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class CRMDashboardAPIView(APIView):
    """
    Returns aggregated CRM metrics for the admin dashboard.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        company = request.user.company

        # Client stats
        total_clients = Client.objects.filter(company=company).count()

        # Contract stats
        contracts = Contract.objects.filter(company=company)
        active_contracts = contracts.filter(status='active').count()
        total_contract_value = contracts.aggregate(total=Sum('amount'))['total'] or 0

        # Payment stats
        payments = Payment.objects.filter(company=company)
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or 0
        pending_payments = payments.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0
        recent_payments = payments.filter(
            payment_date__gte=timezone.now().date() - timedelta(days=30)
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Invoice stats
        invoices = Invoice.objects.filter(company=company)
        total_invoices = invoices.aggregate(total=Sum('amount'))['total'] or 0
        overdue_invoices = invoices.filter(status='overdue').count()
        paid_invoices = invoices.filter(status='paid').count()

        return Response({
            'total_clients': total_clients,
            'active_contracts': active_contracts,
            'total_contract_value': float(total_contract_value),
            'total_payments': float(total_payments),
            'pending_payments': float(pending_payments),
            'recent_payments_30d': float(recent_payments),
            'total_invoices': float(total_invoices),
            'overdue_invoices': overdue_invoices,
            'paid_invoices': paid_invoices,
        })