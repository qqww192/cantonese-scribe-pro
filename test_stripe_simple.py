#!/usr/bin/env python3

"""
Simple Stripe integration test for CantoneseScribe
"""

import stripe
import os

# Set Stripe API key directly
stripe.api_key = "sk_test_***************"

def test_stripe_connection():
    """Test basic Stripe API connection"""
    print("💳 Testing Stripe API Connection...")
    
    try:
        # Test API connection by retrieving account info
        account = stripe.Account.retrieve()
        
        print("✅ Stripe API connection successful")
        print(f"   Account ID: {account.id}")
        print(f"   Display Name: {account.display_name or 'Not set'}")
        print(f"   Country: {account.country}")
        print(f"   Test Mode: {'Yes' if account.id.startswith('acct_') else 'No'}")
        
        return True
        
    except stripe.error.AuthenticationError as e:
        print(f"❌ Authentication failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

def test_create_customer():
    """Test customer creation"""
    print("\n👤 Testing Customer Creation...")
    
    try:
        customer = stripe.Customer.create(
            email="test@cantonesescribe.com",
            name="Test User",
            metadata={
                "source": "cantonese_scribe_test"
            }
        )
        
        print("✅ Customer creation successful")
        print(f"   Customer ID: {customer.id}")
        print(f"   Email: {customer.email}")
        
        # Clean up
        stripe.Customer.delete(customer.id)
        print("✅ Test customer cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ Customer creation failed: {e}")
        return False

def test_payment_intent():
    """Test payment intent creation"""
    print("\n💰 Testing Payment Intent...")
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=999,  # $9.99
            currency="usd",
            metadata={
                "service": "cantonese_scribe"
            }
        )
        
        print("✅ Payment intent creation successful")
        print(f"   Intent ID: {intent.id}")
        print(f"   Amount: ${intent.amount/100:.2f}")
        print(f"   Status: {intent.status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Payment intent failed: {e}")
        return False

def main():
    print("🔍 Simple Stripe Integration Test")
    print("=" * 50)
    
    tests = [
        test_stripe_connection,
        test_create_customer,
        test_payment_intent
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 Stripe integration is working correctly!")
    else:
        print("⚠️ Some tests failed. Check your Stripe configuration.")

if __name__ == "__main__":
    main()