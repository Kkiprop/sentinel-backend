from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission

from .serializers import UserSerializer, CompanySerializer, OrganisationSerializer, SubscriptionSerializer
from .models import User, Company, Organisation, Subscription


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


class SubscriptionAPIView(APIView):
    """
    Get or update the current user's company subscription.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"error": "No company associated with this user"}, status=404)
        try:
            subscription = Subscription.objects.get(company=company)
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response(None)

    def post(self, request):
        company = request.user.company
        if not company:
            return Response({"error": "No company associated with this user"}, status=404)

        # Check if subscription already exists
        try:
            subscription = Subscription.objects.get(company=company)
            serializer = SubscriptionSerializer(subscription, data=request.data, partial=True)
        except Subscription.DoesNotExist:
            serializer = SubscriptionSerializer(data={**request.data, "company": company.id})

        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


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