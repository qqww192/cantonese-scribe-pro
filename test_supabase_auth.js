#!/usr/bin/env node

// Proper Supabase Auth test using the official client
// This will help diagnose the real issue

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bpqcsrefrdesewgkwrtl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcWNzcmVmcmRlc2V3Z2t3cnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTY0MjIsImV4cCI6MjA3MDU3MjQyMn0.iMCI0IVqN-PH3lZaWSNiOaSysy7TN4hGDQOu7ej-abo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('🔍 Testing Supabase Auth Configuration...\n');
  
  // Test 1: Basic connection
  console.log('1. Testing connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('✅ Connection successful');
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return;
  }
  
  // Test 2: Check auth settings
  console.log('\n2. Checking auth settings...');
  const testEmail = `test+${Date.now()}@cantonesescribe.com`;
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        emailRedirectTo: undefined // Disable email confirmation for test
      }
    });
    
    if (error) {
      console.log('❌ Signup failed:', error.message);
      console.log('Error details:', error);
      
      // Common issues and solutions
      if (error.message.includes('Email not confirmed')) {
        console.log('\n💡 SOLUTION: Email confirmation is required.');
        console.log('   Go to Supabase Dashboard > Authentication > Settings');
        console.log('   Turn OFF "Enable email confirmations"');
      } else if (error.message.includes('Database error')) {
        console.log('\n💡 SOLUTION: Database trigger issue.');
        console.log('   The users table or trigger has a problem.');
      }
    } else {
      console.log('✅ Signup successful!');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
    }
    
  } catch (error) {
    console.log('❌ Signup request failed:', error.message);
  }
  
  // Test 3: Check if users table is accessible
  console.log('\n3. Testing database access...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (error) {
      console.log('❌ Database access failed:', error.message);
      if (error.message.includes('relation "users" does not exist')) {
        console.log('\n💡 SOLUTION: Users table not created.');
        console.log('   Run the database schema scripts first.');
      }
    } else {
      console.log('✅ Database access successful');
    }
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Check Supabase Dashboard > Authentication > Settings');
  console.log('2. Ensure "Enable email confirmations" is OFF for testing');
  console.log('3. Verify database schema is properly installed');
  console.log('4. Check auth triggers in SQL Editor');
}

// Run the test
testAuth().catch(console.error);