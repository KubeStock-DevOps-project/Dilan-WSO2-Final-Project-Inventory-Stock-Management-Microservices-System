import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiMail, FiPhone, FiTrash2, FiUser, FiUserPlus } from "react-icons/fi";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Modal from "../../components/common/Modal";
import Table from "../../components/common/Table";
import { useAuth } from "../../hooks/useAuth";
import { identityService } from "../../services/identityService";

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  // Check if user is admin
  const isAdmin = user?.roles?.includes("admin");

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await identityService.listWarehouseStaff();
      setStaff(response.data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      if (error.response?.status === 403) {
        toast.error("You don't have permission to view warehouse staff");
      } else {
        toast.error("Failed to load warehouse staff");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id, email) => {
    setStaffToDelete({ id, email });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;

    try {
      await identityService.deleteUser(staffToDelete.id);
      toast.success("Staff member deleted successfully");
      setShowDeleteModal(false);
      setStaffToDelete(null);
      fetchStaff();
    } catch (error) {
      console.error("Error deleting staff member:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete staff member"
      );
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      await identityService.createWarehouseStaff(formData);
      toast.success(
        "Staff member created successfully. They will receive a password reset email."
      );
      setShowAddModal(false);
      setFormData({ email: "", firstName: "", lastName: "", phone: "" });
      fetchStaff();
    } catch (error) {
      console.error("Error creating staff member:", error);
      if (error.response?.status === 409) {
        toast.error("A user with this email already exists");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to create staff member"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "User",
      accessor: "displayName",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <FiUser className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {row.displayName || `${row.firstName} ${row.lastName}`}
            </p>
            <p className="text-sm text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Email",
      accessor: "email",
      render: (row) => (
        <a
          href={`mailto:${row.email}`}
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          <FiMail className="w-4 h-4" /> {row.email}
        </a>
      ),
    },
    {
      header: "Phone",
      accessor: "phone",
      render: (row) => (
        <span className="flex items-center gap-1">
          <FiPhone className="w-4 h-4" /> {row.phone || "-"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "active",
      render: (row) => (
        <Badge variant={row.active ? "success" : "danger"}>
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Created",
      accessor: "createdAt",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(row.id, row.email)}
            title="Delete staff member"
          >
            <FiTrash2 />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          You don't have permission to manage warehouse staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Staff</h1>
          <p className="text-gray-500 mt-1">Manage warehouse staff accounts</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
        >
          <FiUserPlus className="w-4 h-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Warehouse staff are users managed through
          Asgardeo. When you add staff, they will receive an email to set their
          password and can then log in to manage inventory and process orders.
        </p>
      </div>

      <Card>
        <Table columns={columns} data={staff} />
        {staff.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No warehouse staff found</p>
            <Button onClick={() => setShowAddModal(true)} className="mt-4">
              Add Your First Staff Member
            </Button>
          </div>
        )}
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Staff Member"
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="staff@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              The staff member will receive an email to set their password and
              activate their account.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Staff Member"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setStaffToDelete(null);
        }}
        title="Delete Staff Member"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete staff member{" "}
            <strong>{staffToDelete?.email}</strong>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              This action cannot be undone. The staff member will be permanently
              removed from the system.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setStaffToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
            >
              Delete Staff Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffList;
