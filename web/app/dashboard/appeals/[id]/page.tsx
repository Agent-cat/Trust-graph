"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface AppealDetail {
  id: string;
  reason: string;
  evidenceUrl: string | null;
  status: string;
  createdAt: string;
  fraudCase: {
    id: string;
    caseNumber: string;
    riskScore: number;
    level: string;
    action: string;
    reasons: string[];
    seller: {
      name: string;
      email: string;
    };
  };
}

export default function AppealReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [appeal, setAppeal] = useState<AppealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewerNote, setReviewerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchAppeal() {
      try {
        const res = await fetch(
          `http://localhost:4000/api/appeals?status=pending`
        );
        const data = await res.json();
        const found = data.data?.find((a: AppealDetail) => a.id === params.id);
        setAppeal(found || null);
      } catch (error) {
        console.error("Failed to fetch appeal:", error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchAppeal();
    }
  }, [params.id]);

  async function handleReview(status: "approved" | "rejected") {
    if (!reviewerNote.trim()) {
      alert("Please add a reviewer note");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/appeals/${params.id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reviewerNote }),
        }
      );

      const data = await res.json();
      if (data.success) {
        alert(`Appeal ${status}`);
        router.push("/dashboard/appeals");
      } else {
        alert(data.error || "Failed to review appeal");
      }
    } catch (error) {
      console.error("Review error:", error);
      alert("Failed to review appeal");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading appeal...</div>
      </div>
    );
  }

  if (!appeal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Appeal not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Appeal</h1>
        <p className="text-gray-500">
          Case: {appeal.fraudCase.caseNumber}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appeal Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seller's Explanation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Seller's Explanation</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{appeal.reason}</p>
            {appeal.evidenceUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Evidence:</p>
                <a
                  href={appeal.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View Document
                </a>
              </div>
            )}
          </div>

          {/* Original Flag Reasons */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Why was this flagged?
            </h2>
            <ul className="space-y-3">
              {appeal.fraudCase.reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-yellow-500 mt-1">⚠️</span>
                  <span className="text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Review Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Reviewer Notes</h2>
            <textarea
              value={reviewerNote}
              onChange={(e) => setReviewerNote(e.target.value)}
              placeholder="Add your review notes..."
              className="w-full p-3 border rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Case Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Case Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Risk Score</dt>
                <dd className="text-2xl font-bold">
                  {appeal.fraudCase.riskScore}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Level</dt>
                <dd className="font-medium">{appeal.fraudCase.level}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Current Action</dt>
                <dd className="font-medium">
                  {appeal.fraudCase.action.replace(/_/g, " ")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Seller Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Seller</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Name</dt>
                <dd className="font-medium">
                  {appeal.fraudCase.seller.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm">{appeal.fraudCase.seller.email}</dd>
              </div>
            </dl>
          </div>

          {/* Review Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Decision</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleReview("approved")}
                disabled={submitting}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {submitting ? "Processing..." : "Approve & Remove Hold"}
              </button>
              <button
                onClick={() => handleReview("rejected")}
                disabled={submitting}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {submitting ? "Processing..." : "Reject Appeal"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
