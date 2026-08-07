"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
        <div className="text-gray-400 text-sm">Loading appeal...</div>
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
        <Link
          href="/dashboard/appeals"
          className="text-sm text-gray-500 hover:text-black transition-colors"
        >
          ← Back to appeals
        </Link>
        <h1 className="text-2xl font-bold text-black mt-2">Review Appeal</h1>
        <p className="text-gray-500 text-sm">
          Case: {appeal.fraudCase.caseNumber}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appeal Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seller's Explanation */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Seller's Explanation
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">{appeal.reason}</p>
            {appeal.evidenceUrl && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Evidence
                </p>
                <a
                  href={appeal.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black font-medium hover:underline"
                >
                  View Document →
                </a>
              </div>
            )}
          </div>

          {/* Original Flag Reasons */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Why was this flagged?
            </h2>
            <ul className="space-y-3">
              {appeal.fraudCase.reasons?.map((reason, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-black rounded-full mt-2" />
                  <span className="text-sm text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Review Notes */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Reviewer Notes
            </h2>
            <textarea
              value={reviewerNote}
              onChange={(e) => setReviewerNote(e.target.value)}
              placeholder="Add your review notes..."
              className="w-full p-4 border border-gray-200 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Case Info */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Case Info</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">
                  Risk Score
                </dt>
                <dd className="text-2xl font-bold text-black mt-1">
                  {appeal.fraudCase.riskScore}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">
                  Level
                </dt>
                <dd className="font-medium text-black mt-1">
                  {appeal.fraudCase.level}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">
                  Current Action
                </dt>
                <dd className="font-medium text-black mt-1">
                  {appeal.fraudCase.action?.replace(/_/g, " ")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Seller Info */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Seller</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">
                  Name
                </dt>
                <dd className="font-medium text-black mt-1">
                  {appeal.fraudCase.seller?.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">
                  Email
                </dt>
                <dd className="text-sm text-gray-600 mt-1">
                  {appeal.fraudCase.seller?.email}
                </dd>
              </div>
            </dl>
          </div>

          {/* Review Actions */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Decision</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleReview("approved")}
                disabled={submitting}
                className="w-full px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Processing..." : "Approve & Remove Hold"}
              </button>
              <button
                onClick={() => handleReview("rejected")}
                disabled={submitting}
                className="w-full px-4 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
