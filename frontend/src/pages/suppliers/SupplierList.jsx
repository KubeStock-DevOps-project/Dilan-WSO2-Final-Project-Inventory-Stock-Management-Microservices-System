import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Input from "../../components/common/Input";
import { supplierService } from "../../services/supplierService";
import { FiPlus, FiEdit, FiTrash2, FiMail, FiPhone } from "react-icons/fi";

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierService.getAllSuppliers();
      setSuppliers(response.data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      status: "active",
    });
    setEditingSupplier(null);
    setShowAddModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, formData);
        toast.success("Supplier updated successfully!");
      } else {
        await supplierService.createSupplier(formData);
        toast.success("Supplier created successfully!");
      }
      resetForm();
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error(error.response?.data?.message || "Failed to save supplier");
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address || "",
      status: supplier.status,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        await supplierService.deleteSupplier(id);
        toast.success("Supplier deleted successfully");
        fetchSuppliers();
      } catch (error) {
        console.error("Error deleting supplier:", error);
        
        // Handle different error responses
        if (error.response?.status === 409) {
          toast.error(
            error.response?.data?.message || 
            "Cannot delete supplier with existing purchase orders"
          );
        } else if (error.response?.status === 404) {
          toast.error("Supplier not found");
        } else {
          toast.error(
            error.response?.data?.message || 
            "Failed to delete supplier"
          );
        }
      }
    }
  };

  const columns = [
    {
      header: "ID",
      accessor: "id",
    },
    {
      header: "Name",
      accessor: "name",
      render: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      header: "Contact Person",
      accessor: "contact_person",
    },
    {
      header: "Email",
      accessor: "email",
      render: (row) => (
        <a
          href={`mailto:${row.email}`}
          className="text-primary hover:underline flex items-center"
        >
          <FiMail className="mr-1" /> {row.email}
        </a>
      ),
    },
    {
      header: "Phone",
      accessor: "phone",
      render: (row) => (
        <span className="flex items-center">
          <FiPhone className="mr-1" /> {row.phone}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => (
        <Badge variant={row.status === "active" ? "success" : "danger"}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Rating",
      accessor: "average_rating",
      render: (row) => (
        <div className="flex items-center gap-1">
          <span className="text-yellow-400">★</span>
          <span className="font-medium">
            {row.average_rating
              ? parseFloat(row.average_rating).toFixed(2)
              : "N/A"}
          </span>
          {row.total_ratings > 0 && (
            <span className="text-xs text-gray-500">({row.total_ratings})</span>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            <FiEdit className="mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row.id)}
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark-900">
          Suppliers Management
        </h1>
        <Button onClick={() => setShowAddModal(true)}>
          <FiPlus className="mr-2" /> Add Supplier
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <p className="text-dark-600">
            Total Suppliers:{" "}
            <span className="font-semibold">{suppliers.length}</span>
          </p>
        </div>
        <Table columns={columns} data={suppliers} />
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-dark-900 mb-4">
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Supplier Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter supplier name"
                />
                <Input
                  label="Contact Person *"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter contact person"
                />
                <Input
                  label="Email *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="supplier@example.com"
                />
                <Input
                  label="Phone *"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="+1234567890"
                />
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter supplier address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-dark-300 rounded-lg"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSupplier ? "Update Supplier" : "Create Supplier"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierList;
