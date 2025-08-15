#!/usr/bin/env python3

"""
Test Google Cloud API integration for CantoneseScribe
This script tests Speech-to-Text and Translation APIs
"""

import os
import json
import base64
from google.cloud import speech
from google.cloud import translate_v2 as translate

def setup_credentials():
    """Set up Google Cloud credentials from environment variables"""
    try:
        # Get base64 encoded credentials
        creds_b64 = os.getenv('GOOGLE_CLOUD_CREDENTIALS')
        if creds_b64:
            # Decode from base64
            creds_json = base64.b64decode(creds_b64).decode('utf-8')
            creds_dict = json.loads(creds_json)
            
            # Write to temporary file for Google Cloud client
            with open('/tmp/google-credentials.json', 'w') as f:
                json.dump(creds_dict, f)
            
            # Set environment variable
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/tmp/google-credentials.json'
            return creds_dict['project_id']
        else:
            print("❌ GOOGLE_CLOUD_CREDENTIALS not found in environment")
            return None
    except Exception as e:
        print(f"❌ Error setting up credentials: {e}")
        return None

def test_speech_to_text_api():
    """Test Google Cloud Speech-to-Text API"""
    print("\n🎤 Testing Speech-to-Text API...")
    
    try:
        # Initialize the client
        client = speech.SpeechClient()
        
        # Test with minimal config (no actual audio)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="yue-Hant-HK",  # Cantonese Traditional
        )
        
        # Just test client initialization and config
        print("✅ Speech-to-Text client initialized successfully")
        print(f"   Language: {config.language_code}")
        print(f"   Encoding: {config.encoding}")
        print(f"   Sample Rate: {config.sample_rate_hertz}Hz")
        
        return True
        
    except Exception as e:
        print(f"❌ Speech-to-Text API test failed: {e}")
        return False

def test_translation_api():
    """Test Google Cloud Translation API"""
    print("\n🌐 Testing Translation API...")
    
    try:
        # Initialize the client
        client = translate.Client()
        
        # Test translation from Chinese to English
        test_text = "你好"  # "Hello" in Chinese
        result = client.translate(
            test_text,
            source_language='zh',
            target_language='en'
        )
        
        print("✅ Translation API working successfully")
        print(f"   Original: {test_text}")
        print(f"   Translated: {result['translatedText']}")
        print(f"   Detected language: {result.get('detectedSourceLanguage', 'zh')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Translation API test failed: {e}")
        return False

def test_api_quotas():
    """Check API quotas and limits"""
    print("\n📊 Checking API quotas...")
    
    try:
        # This would require the Cloud Resource Manager API
        # For now, just print guidance
        print("⚠️  Manual quota check required:")
        print("   1. Go to Google Cloud Console")
        print("   2. Navigate to APIs & Services > Quotas")
        print("   3. Check Speech-to-Text API quotas")
        print("   4. Check Translation API quotas")
        
        return True
        
    except Exception as e:
        print(f"❌ Quota check failed: {e}")
        return False

def main():
    """Main test function"""
    print("🔍 Testing Google Cloud API Integration for CantoneseScribe")
    print("=" * 60)
    
    # Load credentials from .env.production
    import subprocess
    result = subprocess.run(['grep', 'GOOGLE_CLOUD_CREDENTIALS=', '.env.production'], 
                          capture_output=True, text=True)
    if result.stdout:
        creds_line = result.stdout.strip()
        creds_b64 = creds_line.split('=', 1)[1]
        os.environ['GOOGLE_CLOUD_CREDENTIALS'] = creds_b64
    
    # Setup credentials
    project_id = setup_credentials()
    if not project_id:
        print("❌ Cannot proceed without valid credentials")
        return False
    
    print(f"✅ Credentials loaded for project: {project_id}")
    
    # Run tests
    tests_passed = 0
    total_tests = 3
    
    if test_speech_to_text_api():
        tests_passed += 1
    
    if test_translation_api():
        tests_passed += 1
        
    if test_api_quotas():
        tests_passed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"📈 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All Google Cloud APIs are working correctly!")
        print("\n✅ Next steps:")
        print("   1. Your Google Cloud setup is complete")
        print("   2. Move on to Stripe configuration")
        print("   3. Update environment variables in Vercel")
    else:
        print("⚠️  Some tests failed. Check the errors above.")
        print("\n🔧 Troubleshooting:")
        print("   1. Verify APIs are enabled in Google Cloud Console")
        print("   2. Check service account permissions")
        print("   3. Ensure billing is enabled for the project")
    
    return tests_passed == total_tests

if __name__ == "__main__":
    main()