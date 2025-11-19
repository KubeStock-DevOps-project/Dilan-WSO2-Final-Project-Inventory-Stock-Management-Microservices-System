import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const SupplierProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      // Check if token exists
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        toast.error("Please login to view your profile");
        return;
      }

      console.log(
        "Fetching profile with token:",
        token ? "Token exists" : "No token"
      );

      const response = await fetch(
        "http://localhost:3004/api/suppliers/profile/me",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      // Handle specific error codes
      if (response.status === 401) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unauthorized" }));
        console.error("Authentication error:", errorData);
        toast.error(
          `Authentication failed: ${
            errorData.message || "Invalid or expired token"
          }. Please login again.`
        );
        localStorage.removeItem("token");
        return;
      }

      if (response.status === 404) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Not Found" }));
        console.error("Profile not found:", errorData);
        toast.error(
          `Profile not found: ${
            errorData.message || "Supplier profile does not exist"
          }. Please contact support.`
        );
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        console.error("Server error:", errorData);
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Profile data received:", data);

      if (!data.success || !data.data) {
        console.error("Invalid response format:", data);
        throw new Error("Invalid response format from server");
      }

      setProfile(data.data);
      setFormData({
        contact_person: data.data.contact_person || "",
        email: data.data.email || "",
        phone: data.data.phone || "",
        address: data.data.address || "",
      });

      toast.success("Profile loaded successfully");
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error(`Failed to load profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to update your profile");
        return;
      }

      console.log("Updating profile with data:", formData);

      const response = await fetch(
        "http://localhost:3004/api/suppliers/profile/me",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      console.log("Update response status:", response.status);

      // Handle specific error codes
      if (response.status === 401) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unauthorized" }));
        console.error("Authentication error:", errorData);
        toast.error(
          `Authentication failed: ${
            errorData.message || "Invalid token"
          }. Please login again.`
        );
        localStorage.removeItem("token");
        return;
      }

      if (response.status === 404) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Not Found" }));
        console.error("Profile not found:", errorData);
        toast.error(`Profile not found: ${errorData.message}`);
        return;
      }

      if (response.status === 400) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Bad Request" }));
        console.error("Validation error:", errorData);
        toast.error(`Validation error: ${errorData.message}`);
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        console.error("Server error:", errorData);
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Profile updated:", data);

      toast.success("Profile updated successfully!");
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(`Failed to update profile: ${error.message}`);
    }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-900">My Profile</h1>
        <p className="text-dark-600 mt-2">Manage your supplier information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Contact Information</h2>
              {!editing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Contact Person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contact_person: e.target.value,
                    }))
                  }
                  placeholder="John Doe"
                />
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="contact@supplier.com"
                />
                <Input
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+1 234 567 8900"
                />
                <Input
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  multiline
                  rows={3}
                  placeholder="Full address..."
                />
                <div className="flex gap-3">
                  <Button type="submit" variant="primary">
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        contact_person: profile.contact_person || "",
                        email: profile.email || "",
                        phone: profile.phone || "",
                        address: profile.address || "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="text-primary" size={20} />
                  <div>
                    <p className="text-sm text-dark-600">Contact Person</p>
                    <p className="font-medium">
                      {profile?.contact_person || "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="text-primary" size={20} />
                  <div>
                    <p className="text-sm text-dark-600">Email</p>
                    <p className="font-medium">{profile?.email || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="text-primary" size={20} />
                  <div>
                    <p className="text-sm text-dark-600">Phone</p>
                    <p className="font-medium">{profile?.phone || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="text-primary" size={20} />
                  <div>
                    <p className="text-sm text-dark-600">Address</p>
                    <p className="font-medium">
                      {profile?.address || "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <h2 className="text-xl font-semibold mb-4">Company Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-dark-600">Company Name</p>
                <p className="font-medium">{profile?.name}</p>
              </div>
              <div>
                <p className="text-sm text-dark-600">Country</p>
                <p className="font-medium">{profile?.country || "Not set"}</p>
              </div>
              <div>
                <p className="text-sm text-dark-600">Payment Terms</p>
                <p className="font-medium">
                  {profile?.payment_terms || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-600">Rating</p>
                <p className="font-medium">
                  {profile?.rating
                    ? `${parseFloat(profile.rating).toFixed(2)} / 5.0`
                    : "No rating"}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-600">Status</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-sm ${
                    profile?.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {profile?.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupplierProfile;
