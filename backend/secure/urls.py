from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, ContractViewSet, PaymentViewSet, InvoiceViewSet, CRMDashboardAPIView, SendInvoiceAPIView

router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='crm-clients')
router.register(r'contracts', ContractViewSet, basename='crm-contracts')
router.register(r'payments', PaymentViewSet, basename='crm-payments')
router.register(r'invoices', InvoiceViewSet, basename='crm-invoices')

urlpatterns = [
    path('crm/dashboard/', CRMDashboardAPIView.as_view(), name='crm-dashboard'),
    path('crm/invoices/<int:invoice_id>/send/', SendInvoiceAPIView.as_view(), name='send-invoice'),
]

urlpatterns += router.urls
