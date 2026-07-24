from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer

from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission

from .serializers import (
    UserSerializer, CompanySerializer, OrganisationSerializer,
    BillingPlanSerializer, SubscriptionSerializer, PaymentSerializer, InvoiceSerializer,
)
from .models import User, Company, Organisation, BillingPlan, Subscription, Payment, Invoice
from .services import start_trial, activate_subscription, cancel_subscription, check_subscription_access


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "admin"
        )


class UserViewSet(ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return User.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class CompanyViewSet(ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return Company.objects.filter(id=self.request.user.company_id)


class OrganisationViewSet(ModelViewSet):
    serializer_class = OrganisationSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return Organisation.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class CompanyProfileAPIView(APIView):
    """
    Get or update the current user's company profile.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"error": "No company associated with this user"}, status=404)
        serializer = CompanySerializer(company)
        return Response(serializer.data)

    def patch(self, request):
        company = request.user.company
        if not company:
            return Response({"error": "No company associated with this user"}, status=404)
        serializer = CompanySerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class BillingPlanViewSet(ReadOnlyModelViewSet):
    """
    List available billing plans (public, no auth required for pricing page).
    """
    serializer_class = BillingPlanSerializer
    permission_classes = []
    queryset = BillingPlan.objects.filter(is_active=True)


class MySubscriptionAPIView(APIView):
    """
    Get the current company's active subscription and status.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"error": "No company associated"}, status=404)

        # Check access status
        access = check_subscription_access(company)

        # Get active subscription
        active_sub = company.get_active_subscription()
        sub_data = None
        if active_sub:
            sub_data = SubscriptionSerializer(active_sub).data

        # Get all subscriptions history
        all_subs = Subscription.objects.filter(company=company)
        all_subs_data = SubscriptionSerializer(all_subs, many=True).data

        return Response({
            'access': access,
            'active_subscription': sub_data,
            'subscription_history': all_subs_data,
        })


class SubscribeAPIView(APIView):
    """
    Start a trial or activate a paid subscription.
    POST with plan_id and billing_cycle to subscribe.
    POST with no params to start a trial.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        company = request.user.company
        if not company:
            return Response({"error": "No company associated"}, status=404)

        plan_id = request.data.get('plan_id')
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        payment_method = request.data.get('payment_method')
        payment_reference = request.data.get('payment_reference')

        if plan_id:
            # Paid subscription
            try:
                plan = BillingPlan.objects.get(id=plan_id, is_active=True)
            except BillingPlan.DoesNotExist:
                return Response({"error": "Invalid plan"}, status=400)

            if billing_cycle not in ['monthly', 'quarterly', 'biannual', 'annual']:
                return Response({"error": "Invalid billing cycle"}, status=400)

            subscription = activate_subscription(
                company, plan, billing_cycle, payment_method, payment_reference
            )
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data, status=201)
        else:
            # Start trial
            subscription = start_trial(company)
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data, status=201)


class CancelSubscriptionAPIView(APIView):
    """
    Cancel the current active subscription.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        company = request.user.company
        if not company:
            return Response({"error": "No company associated"}, status=404)

        active_sub = company.get_active_subscription()
        if not active_sub:
            return Response({"error": "No active subscription found"}, status=400)

        cancel_subscription(active_sub)
        return Response({"message": "Subscription cancelled successfully"})


class BillingHistoryAPIView(APIView):
    """
    Get billing history (payments and invoices) for the company.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"error": "No company associated"}, status=404)

        payments = Payment.objects.filter(company=company)[:12]
        invoices = Invoice.objects.filter(company=company)[:12]

        return Response({
            'payments': PaymentSerializer(payments, many=True).data,
            'invoices': InvoiceSerializer(invoices, many=True).data,
        })


class LoginAPIView(APIView):

    permission_classes = []

    def post(self, request):

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),

            "user": {
                "id": user.id,
                "name": user.get_full_name(),
                "email": user.email,
                "role": user.role,
            }
        })