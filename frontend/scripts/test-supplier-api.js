/**
 * Test Script for Supplier Profile API
 * Run this in browser console to test the API endpoint
 */

async function testSupplierAPI() {
  console.log("=== Supplier Profile API Test ===\n");

  // Check token
  const token = localStorage.getItem("token");
  console.log("1. Token Check:");
  console.log("   Token exists:", !!token);
  if (token) {
    console.log("   Token length:", token.length);
    console.log("   Token preview:", token.substring(0, 20) + "...");

    // Try to decode JWT (basic check)
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        console.log("   Token format: Valid JWT structure (3 parts)");
        const payload = JSON.parse(atob(parts[1]));
        console.log("   Token payload:", payload);
      } else {
        console.log("   Token format: INVALID - Not a proper JWT!");
      }
    } catch (e) {
      console.log("   Token format: INVALID - Cannot decode:", e.message);
    }
  } else {
    console.log("   ❌ No token found in localStorage");
    console.log("\n   Please login first!");
    return;
  }

  // Test API endpoint
  console.log("\n2. Testing API Endpoint:");
  console.log("   URL: http://localhost:3004/api/suppliers/profile/me");

  try {
    const response = await fetch(
      "http://localhost:3004/api/suppliers/profile/me",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("\n3. Response Details:");
    console.log("   Status:", response.status);
    console.log("   Status Text:", response.statusText);
    console.log("   OK:", response.ok);

    const data = await response.json();
    console.log("\n4. Response Data:");
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("\n✅ API call successful!");
    } else {
      console.log("\n❌ API call failed!");
      if (response.status === 401) {
        console.log(
          "   Issue: Authentication failed - token is invalid or expired"
        );
        console.log("   Solution: Please login again to get a fresh token");
      } else if (response.status === 404) {
        console.log("   Issue: Supplier profile not found");
        console.log(
          "   Solution: Ensure you're logged in with a supplier account"
        );
      }
    }
  } catch (error) {
    console.log("\n❌ Network Error:");
    console.log("   Error:", error.message);
    console.log("   Make sure the supplier service is running on port 3004");
  }
}

// Instructions
console.log("To test the Supplier Profile API, run: testSupplierAPI()");
console.log("Or copy this entire script into the browser console");

// Auto-run if called directly
if (typeof window !== "undefined") {
  window.testSupplierAPI = testSupplierAPI;
}
