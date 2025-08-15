#!/usr/bin/env python3

"""
Debug Stripe API key and connection
"""

import stripe
import os

# Test with hardcoded keys first
STRIPE_SECRET_KEY = "sk_test_***************"
STRIPE_PUBLISHABLE_KEY = "pk_test_51RwLYuICypWYw6CLcRdEWa8Xoke1TAmB4cUUAdYSQRmbKTbXXoWE2OhAFy4nKkFJE0ffhVDsPPNxDEVSZg4161pI00aFurMf3N"

print("🔍 Debugging Stripe Configuration")
print("="*50)

print(f"Secret Key: {STRIPE_SECRET_KEY[:20]}...")
print(f"Publishable Key: {STRIPE_PUBLISHABLE_KEY[:20]}...")

# Set the API key
stripe.api_key = STRIPE_SECRET_KEY

print(f"\nStripe API Key Set: {stripe.api_key[:20]}...")

try:
    print("\n1. Testing basic API call...")
    account = stripe.Account.retrieve()
    print(f"✅ Success! Account ID: {account.id}")
    print(f"   Display Name: {account.display_name}")
    print(f"   Country: {account.country}")
    
except stripe.error.AuthenticationError as e:
    print(f"❌ Authentication Error: {e}")
    print("   This usually means the API key is invalid")
    
except stripe.error.APIConnectionError as e:
    print(f"❌ Connection Error: {e}")
    print("   Check your internet connection")
    
except Exception as e:
    print(f"❌ Unexpected Error: {e}")
    print(f"   Error type: {type(e)}")

try:
    print("\n2. Testing simple API call...")
    balance = stripe.Balance.retrieve()
    print(f"✅ Balance retrieved successfully")
    print(f"   Available: ${balance.available[0].amount / 100:.2f}")
    
except Exception as e:
    print(f"❌ Balance retrieval failed: {e}")

try:
    print("\n3. Testing customer creation...")
    customer = stripe.Customer.create(
        email="debug@test.com",
        name="Debug Test"
    )
    print(f"✅ Customer created: {customer.id}")
    
    # Clean up
    stripe.Customer.delete(customer.id)
    print("✅ Customer deleted")
    
except Exception as e:
    print(f"❌ Customer test failed: {e}")

print("\n" + "="*50)
print("Debug complete!")