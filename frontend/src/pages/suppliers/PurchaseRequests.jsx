import { useState, useEffect } from "react";
import { Check, X, Package, Clock, Truck } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/common/Badge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { supplierService } from "../../services/supplierService";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AsgardeoAuthContext";

const PurchaseRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [responseData, setResponseData] = useState({
    response: "approved",
    approved_quantity: "",
    rejection_reason: "",
    estimated_delivery_date: "",
    supplier_notes: "",
  });
  const [shipData, setShipData] = useState({
    tracking_number: "",
    status: "shipped",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await supplierService.getAllPurchaseOrders();
      setRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load purchase requests");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (request) => {
    setSelectedRequest(request);
    setResponseData({
      response: "approved",
      approved_quantity: request.requested_quantity || "",
      rejection_reason: "",
      estimated_delivery_date: "",
      supplier_notes: "",
    });
    setShowResponseModal(true);
  };

  const handleShip = (request) => {
    setSelectedRequest(request);
    setShipData({
      tracking_number: "",
      status: "shipped",
    });
    setShowShipModal(true);
  };

  const submitResponse = async (e) => {
    e.preventDefault();
    try {
      // Convert quantity to integer
      const payload = {
        ...responseData,
        approved_quantity: responseData.approved_quantity
          ? parseInt(responseData.approved_quantity, 10)
          : null,
      };

      await fetch(
        `http://localhost:3004/api/purchase-orders/${selectedRequest.id}/respond`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      toast.success(
        `Request ${
          responseData.response === "approved" ? "approved" : "rejected"
        } successfully!`
      );
      setShowResponseModal(false);
      fetchRequests();
    } catch (error) {
      console.error("Error responding to request:", error);
      toast.error("Failed to respond to request");
    }
  };

  const submitShipment = async (e) => {
    e.preventDefault();
    try {
      await fetch(
        `http://localhost:3004/api/purchase-orders/${selectedRequest.id}/ship`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(shipData),
        }
      );

      toast.success("Shipment status updated successfully!");
      setShowShipModal(false);
      fetchRequests();
    } catch (error) {
      console.error("Error updating shipment:", error);
      toast.error("Failed to update shipment");
    }
  };

  const getStatusBadge = (status, supplierResponse) => {
    if (supplierResponse === "pending") {
      return <Badge variant="warning">Pending Response</Badge>;
    }
    if (supplierResponse === "approved") {
      return <Badge variant="success">Approved</Badge>;
    }
    if (supplierResponse === "rejected") {
      return <Badge variant="danger">Rejected</Badge>;
    }

    const statusColors = {
      confirmed: "info",
      preparing: "warning",
      shipped: "primary",
      received: "success",
      cancelled: "danger",
    };
    return (
      <Badge variant={statusColors[status] || "secondary"}>{status}</Badge>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Purchase Requests</h1>
        <p className="text-gray-600 mt-1">
          Manage incoming purchase requests from the company
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">
                {
                  requests.filter((r) => r.supplier_response === "pending")
                    .length
                }
              </p>
            </div>
            <Clock className="text-yellow-500" size={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold">
                {
                  requests.filter((r) => r.supplier_response === "approved")
                    .length
                }
              </p>
            </div>
            <Check className="text-green-500" size={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Transit</p>
              <p className="text-2xl font-bold">
                {requests.filter((r) => r.status === "shipped").length}
              </p>
            </div>
            <Truck className="text-blue-500" size={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold">
                {requests.filter((r) => r.status === "received").length}
              </p>
            </div>
            <Package className="text-purple-500" size={32} />
          </div>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">All Requests</h2>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No purchase requests found
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {request.po_number}
                        </h3>
                        {getStatusBadge(
                          request.status,
                          request.supplier_response
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Order Date:</span>{" "}
                          {new Date(request.order_date).toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-medium">
                            Expected Delivery:
                          </span>{" "}
                          {new Date(
                            request.expected_delivery_date
                          ).toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-medium">Amount:</span> $
                          {request.total_amount}
                        </p>
                        {request.tracking_number && (
                          <p>
                            <span className="font-medium">Tracking:</span>{" "}
                            {request.tracking_number}
                          </p>
                        )}
                      </div>
                      {request.notes && (
                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span>{" "}
                          {request.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {request.supplier_response === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleRespond(request)}
                        >
                          Respond
                        </Button>
                      )}
                      {request.supplier_response === "approved" &&
                        request.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleShip(request)}
                          >
                            Mark Shipped
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                Respond to Purchase Request
              </h2>
              <form onSubmit={submitResponse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Response
                  </label>
                  <select
                    value={responseData.response}
                    onChange={(e) =>
                      setResponseData({
                        ...responseData,
                        response: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>

                {responseData.response === "approved" && (
                  <>
                    <Input
                      label="Approved Quantity/Amount"
                      type="number"
                      value={responseData.approved_quantity}
                      onChange={(e) =>
                        setResponseData({
                          ...responseData,
                          approved_quantity: e.target.value,
                        })
                      }
                      required
                    />
                    <Input
                      label="Estimated Delivery Date"
                      type="date"
                      value={responseData.estimated_delivery_date}
                      onChange={(e) =>
                        setResponseData({
                          ...responseData,
                          estimated_delivery_date: e.target.value,
                        })
                      }
                      required
                    />
                  </>
                )}

                {responseData.response === "rejected" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Rejection Reason
                    </label>
                    <textarea
                      value={responseData.rejection_reason}
                      onChange={(e) =>
                        setResponseData({
                          ...responseData,
                          rejection_reason: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      rows="3"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={responseData.supplier_notes}
                    onChange={(e) =>
                      setResponseData({
                        ...responseData,
                        supplier_notes: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    rows="2"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowResponseModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Submit Response</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Ship Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Update Shipment</h2>
              <form onSubmit={submitShipment} className="space-y-4">
                <Input
                  label="Tracking Number"
                  value={shipData.tracking_number}
                  onChange={(e) =>
                    setShipData({
                      ...shipData,
                      tracking_number: e.target.value,
                    })
                  }
                  required
                  placeholder="Enter tracking number"
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowShipModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Mark as Shipped</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequests;
