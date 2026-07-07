from rest_framework import serializers
from .models import Client, Contract, Payment, Invoice


class ClientSerializer(serializers.ModelSerializer):
    contract_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'email', 'phone', 'address',
            'contact_person', 'notes', 'created_at', 'updated_at',
            'contract_count',
        ]
        read_only_fields = ['created_at', 'updated_at', 'contract_count']

    def get_contract_count(self, obj):
        return obj.contracts.count()


class ContractSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'client', 'client_name', 'title', 'description',
            'amount', 'start_date', 'end_date', 'status',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'client_name']


class PaymentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    contract_title = serializers.CharField(source='contract.title', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'client', 'client_name', 'contract', 'contract_title',
            'amount', 'payment_date', 'method', 'reference',
            'status', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'client_name', 'contract_title']


class InvoiceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    contract_title = serializers.CharField(source='contract.title', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'client', 'client_name', 'contract', 'contract_title',
            'invoice_number', 'amount', 'issue_date', 'due_date',
            'status', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'client_name', 'contract_title']