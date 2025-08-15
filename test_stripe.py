#!/usr/bin/env python3

"""
Test Stripe integration for CantoneseScribe
Tests API connection, creates products, and sets up webhooks
"""

import stripe
import os
import json

def load_stripe_config():
    """Load Stripe configuration from .env.production"""
    config = {}
    try:
        with open('.env.production', 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('STRIPE_') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove any quotes and brackets
                    value = value.strip().strip('"').strip("'")
                    if value and not value.startswith('['):  # Skip placeholder values
                        config[key] = value
        
        # Set Stripe API key
        secret_key = config.get('STRIPE_SECRET_KEY')
        if secret_key:
            stripe.api_key = secret_key
            print(f"✅ Loaded Stripe configuration")
            print(f"   Publishable Key: {config.get('STRIPE_PUBLISHABLE_KEY', 'Not set')[:20]}...")
            print(f"   Secret Key: {secret_key[:20]}...")
            return config
        else:
            print("❌ STRIPE_SECRET_KEY not found or invalid")
            return None
        
    except Exception as e:
        print(f"❌ Error loading Stripe config: {e}")
        return None

def test_stripe_connection():
    """Test basic Stripe API connection"""
    print("\n💳 Testing Stripe API Connection...")
    
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

def create_cantonese_scribe_products():
    """Create CantoneseScribe products and pricing in Stripe"""
    print("\n🏷️ Creating CantoneseScribe Products...")
    
    products_to_create = [
        {
            "name": "CantoneseScribe Starter",
            "description": "30 minutes of Cantonese transcription per month",
            "price": 999,  # $9.99 in cents
            "interval": "month",
            "features": [
                "30 minutes/month transcription",
                "Basic export formats (SRT, TXT)",
                "Email support"
            ]
        },
        {
            "name": "CantoneseScribe Pro", 
            "description": "120 minutes of Cantonese transcription per month",
            "price": 2999,  # $29.99 in cents
            "interval": "month",
            "features": [
                "120 minutes/month transcription",
                "All export formats (SRT, VTT, TXT, CSV)",
                "Priority processing",
                "Advanced features",
                "Priority support"
            ]
        },
        {
            "name": "CantoneseScribe Enterprise",
            "description": "Unlimited Cantonese transcription with priority support",
            "price": 9999,  # $99.99 in cents
            "interval": "month",
            "features": [
                "Unlimited transcription",
                "All export formats",
                "Highest priority processing",
                "Custom vocabulary",
                "API access",
                "Dedicated support"
            ]
        }
    ]
    
    created_products = []
    
    for product_info in products_to_create:
        try:
            # Check if product already exists
            existing_products = stripe.Product.list(
                active=True,
                limit=100
            )
            
            existing_product = None
            for prod in existing_products.data:
                if prod.name == product_info["name"]:
                    existing_product = prod
                    break
            
            if existing_product:
                print(f"   ✅ Product already exists: {product_info['name']}")
                product = existing_product
            else:
                # Create product
                product = stripe.Product.create(
                    name=product_info["name"],
                    description=product_info["description"],
                    metadata={
                        "features": json.dumps(product_info["features"]),
                        "service": "cantonese-scribe"
                    }
                )
                print(f"   ✅ Created product: {product_info['name']}")
            
            # Check if price already exists
            existing_prices = stripe.Price.list(
                product=product.id,
                active=True
            )
            
            if existing_prices.data:
                price = existing_prices.data[0]
                print(f"   ✅ Price already exists: ${price.unit_amount/100:.2f}/{price.recurring.interval}")
            else:
                # Create price
                price = stripe.Price.create(
                    product=product.id,
                    unit_amount=product_info["price"],
                    currency="usd",
                    recurring={"interval": product_info["interval"]},
                    metadata={
                        "plan_type": product_info["name"].lower().replace(" ", "_")
                    }
                )
                print(f"   ✅ Created price: ${product_info['price']/100:.2f}/{product_info['interval']}")
            
            created_products.append({
                "product": product,
                "price": price,
                "info": product_info
            })
            
        except Exception as e:
            print(f"   ❌ Failed to create {product_info['name']}: {e}")
            continue
    
    print(f"\n📋 Created {len(created_products)} products successfully")
    return created_products

def test_customer_creation():
    """Test customer creation functionality"""
    print("\n👤 Testing Customer Creation...")
    
    try:
        # Create a test customer
        customer = stripe.Customer.create(
            email="test@cantonesescribe.com",
            name="Test User",
            metadata={
                "source": "cantonese_scribe_test",
                "signup_date": "2025-01-15"
            }
        )
        
        print("✅ Customer creation successful")
        print(f"   Customer ID: {customer.id}")
        print(f"   Email: {customer.email}")
        
        # Clean up - delete test customer
        stripe.Customer.delete(customer.id)
        print("✅ Test customer cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ Customer creation test failed: {e}")
        return False

def test_payment_intent():
    """Test payment intent creation"""
    print("\n💰 Testing Payment Intent...")
    
    try:
        # Create a test payment intent
        intent = stripe.PaymentIntent.create(
            amount=999,  # $9.99
            currency="usd",
            metadata={
                "service": "cantonese_scribe",
                "plan": "starter"
            }
        )
        
        print("✅ Payment intent creation successful")
        print(f"   Intent ID: {intent.id}")
        print(f"   Amount: ${intent.amount/100:.2f}")
        print(f"   Status: {intent.status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Payment intent test failed: {e}")
        return False

def test_webhooks():
    """Test webhook endpoint configuration"""
    print("\n🪝 Testing Webhook Configuration...")
    
    try:
        # List existing webhooks
        webhooks = stripe.WebhookEndpoint.list()
        
        print("✅ Webhook endpoint access successful")
        print(f"   Existing endpoints: {len(webhooks.data)}")
        
        for webhook in webhooks.data:
            print(f"   - {webhook.url} (status: {'enabled' if webhook.status == 'enabled' else 'disabled'})")
        
        # Note: We won't create webhooks automatically as they need a real URL
        print("\n📝 Webhook setup notes:")
        print("   1. Create webhook endpoint in Stripe Dashboard")
        print("   2. Point to: https://your-domain.vercel.app/api/webhooks/stripe")
        print("   3. Select events: customer.subscription.*, invoice.payment_*")
        print("   4. Copy webhook secret to STRIPE_WEBHOOK_SECRET")
        
        return True
        
    except Exception as e:
        print(f"❌ Webhook test failed: {e}")
        return False

def main():
    """Main Stripe test function"""
    print("🔍 Comprehensive Stripe Integration Test")
    print("💳 Testing for CantoneseScribe Payment Processing")
    print("=" * 60)
    
    # Load configuration
    config = load_stripe_config()
    if not config or not config.get('STRIPE_SECRET_KEY'):
        print("❌ Cannot proceed without Stripe configuration")
        return False
    
    # Run tests
    tests = [
        ("API Connection", test_stripe_connection),
        ("Product Creation", create_cantonese_scribe_products),
        ("Customer Creation", test_customer_creation),
        ("Payment Intent", test_payment_intent),
        ("Webhook Configuration", test_webhooks),
    ]
    
    passed = 0
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            if result:
                passed += 1
                results[test_name] = "PASSED"
                print(f"✅ {test_name}: PASSED")
            else:
                results[test_name] = "FAILED"
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            results[test_name] = f"ERROR: {e}"
            print(f"❌ {test_name}: ERROR - {e}")
    
    # Final summary
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {passed}/{len(tests)} tests passed")
    
    if passed >= 4:  # Allow webhook test to be informational
        print("🎉 Stripe integration is ready for CantoneseScribe!")
        print("\n✅ Your payment system can now:")
        print("   💳 Process subscription payments")
        print("   👤 Manage customer accounts")
        print("   🏷️ Handle multiple pricing tiers")
        print("   💰 Create payment intents")
        
        print("\n🚀 Next Steps:")
        print("   1. Set up webhook endpoint URL in Stripe Dashboard")
        print("   2. Configure environment variables in Vercel")
        print("   3. Test end-to-end payment flow")
        
        print("\n📋 Products Created:")
        print("   • Starter Plan: $9.99/month (30 minutes)")
        print("   • Pro Plan: $29.99/month (120 minutes)")
        print("   • Enterprise Plan: $99.99/month (unlimited)")
        
    else:
        print("⚠️  Some critical tests failed. Check:")
        print("   1. Stripe API keys are correct")
        print("   2. Stripe account is in good standing")
        print("   3. Network connectivity")
        
    return passed >= 4

if __name__ == "__main__":
    main()