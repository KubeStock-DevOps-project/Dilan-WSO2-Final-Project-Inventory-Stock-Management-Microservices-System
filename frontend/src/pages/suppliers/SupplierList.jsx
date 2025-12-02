import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { supplierService } from "../../services/supplierService";
import { useAuth } from "../../context/AsgardeoAuthContext";
import { FiEdit, FiTrash2, FiMail, FiPhone, FiExternalLink, FiUserPlus } from "react-icons/fi";

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openUserManagement } = useAuth();

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
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        await supplierService.deleteSupplier(id);
        toast.success("Supplier deleted successfully");
        fetchSuppliers();
      } catch (error) {
        console.error("Error deleting supplier:", error);
        if (error.response?.status === 409) {
          toast.error("Cannot delete supplier with existing purchase orders");
        } else {
          toast.error(error.response?.data?.message || "Failed to delete supplier");
        }
      }
    }
  };

  const handleAddSupplier = () => {
    // Open Asgardeo console for user management
    openUserManagement();
    toast.success("Opening Asgardeo User Management. Add a user and assign them to the 'supplier' group.", {
      duration: 5000,
    });
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
          className="text-orange-600 hover:underline flex items-center gap-1"
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
          <span className="text-yellow-500">★</span>
          <span className="font-medium">
            {row.average_rating ? parseFloat(row.average_rating).toFixed(1) : "N/A"}
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 mt-1">Manage your supplier network</p>
        </div>
        <Button onClick={handleAddSupplier} className="flex items-center gap-2">
          <FiUserPlus className="w-4 h-4" />
          Add Supplier
          <FiExternalLink className="w-3 h-3" />
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Suppliers are managed through Asgardeo. To add a new supplier, 
          click "Add Supplier" to open the Asgardeo console, create a user, and assign them to 
          the <code className="bg-blue-100 px-1 rounded">supplier</code> group.
        </p>
      </div>

      <Card>
        <Table columns={columns} data={suppliers} />
        {suppliers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No suppliers found</p>
            <Button onClick={handleAddSupplier} className="mt-4">
              Add Your First Supplier
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SupplierList;
