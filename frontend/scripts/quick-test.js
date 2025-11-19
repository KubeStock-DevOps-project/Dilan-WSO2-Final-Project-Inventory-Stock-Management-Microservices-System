// Quick Test - Copy this into Browser Console (F12)

console.clear();
console.log("🔍 Supplier Profile API Diagnostic\n");

// 1. Check Token
const token = localStorage.getItem("token");
console.log("1️⃣ TOKEN CHECK");
console.log("   Exists:", !!token);

if (token) {
  const parts = token.split(".");
  console.log(
    "   Parts:",
    parts.length,
    parts.length === 3 ? "✅ Valid JWT structure" : "❌ Invalid JWT"
  );

  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]));
      console.log("   User ID:", payload.id || payload.userId);
      console.log("   Username:", payload.username);
      console.log("   Role:", payload.role);
      console.log(
        "   Issued:",
        payload.iat ? new Date(payload.iat * 1000).toLocaleString() : "N/A"
      );
      console.log(
        "   Expires:",
        payload.exp ? new Date(payload.exp * 1000).toLocaleString() : "N/A"
      );
    } catch (e) {
      console.log("   ❌ Cannot decode:", e.message);
    }
  }
} else {
  console.log("   ❌ No token - Please login\n");
}

// 2. Test API
if (token) {
  console.log("\n2️⃣ API TEST");
  fetch("http://localhost:3004/api/suppliers/profile/me", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then(async (response) => {
      console.log("   Status:", response.status, response.statusText);
      const data = await response.json();
      console.log("   Response:", data);

      if (response.ok) {
        console.log("\n✅ SUCCESS - Profile loaded");
      } else if (response.status === 401) {
        console.log("\n❌ AUTHENTICATION FAILED");
        console.log("   Issue: Token is invalid/expired/malformed");
        console.log("   Fix: Run: localStorage.clear(); location.reload();");
      } else if (response.status === 404) {
        console.log("\n❌ PROFILE NOT FOUND");
        console.log("   Issue: No supplier profile for this user");
        console.log("   Check: User role and supplier table");
      }
    })
    .catch((err) => {
      console.log("\n❌ NETWORK ERROR:", err.message);
      console.log("   Check: Is supplier-service running on port 3004?");
    });
}

console.log("\n📖 See docs/SUPPLIER_PROFILE_404_DEBUG.md for full guide");
